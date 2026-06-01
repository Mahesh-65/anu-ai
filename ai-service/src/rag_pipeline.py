import os
import re
import hashlib
import chromadb
from chromadb import EmbeddingFunction, Documents, Embeddings
from pypdf import PdfReader
import google.generativeai as genai
from typing import List, Dict, Any, Tuple

class HybridEmbeddingFunction(EmbeddingFunction):
    """
    A robust embedding function that uses Google's latest embedding-004 model
    when an API key is provided, and gracefully falls back to deterministic,
    L2-normalized character-hashed vectors (384-dim) for offline local execution.
    """
    def __init__(self, api_key: str = None):
        self.api_key = api_key
        if api_key:
            genai.configure(api_key=api_key)
            self.model_name = "models/text-embedding-004"
            print("Gemini API embeddings active.")
        else:
            self.model_name = "local_hash_fallback"
            print("No Gemini API key detected. Running with local hash fallback embeddings.")

    def __call__(self, input: Documents) -> Embeddings:
        if not self.api_key:
            return self._generate_local_embeddings(input)
        
        try:
            embeddings = []
            for chunk in input:
                response = genai.embed_content(
                    model=self.model_name,
                    content=chunk,
                    task_type="retrieval_document"
                )
                embeddings.append(response['embedding'])
            return embeddings
        except Exception as e:
            print(f"Error calling Gemini Embedding API ({e}). Falling back to local hash embeddings.")
            return self._generate_local_embeddings(input)

    def _generate_local_embeddings(self, documents: Documents) -> Embeddings:
        embeddings = []
        for text in documents:
            # Deterministic character-gram vectorizer of size 384
            vec = [0.0] * 384
            words = text.lower().split()
            
            # Simple text features (uni-grams and bi-grams hashes)
            for word in words:
                h1 = int(hashlib.md5(word.encode('utf-8')).hexdigest(), 16)
                vec[h1 % 384] += 1.0
            
            # Add character-level details to capture short terms
            for i in range(len(text) - 2):
                trigram = text[i:i+3].lower()
                h2 = int(hashlib.md5(trigram.encode('utf-8')).hexdigest(), 16)
                vec[h2 % 384] += 0.5
            
            # L2 Normalization
            norm = sum(x*x for x in vec) ** 0.5
            if norm > 0:
                vec = [x / norm for x in vec]
            embeddings.append(vec)
        return embeddings


class RAGPipeline:
    def __init__(self, db_path: str = "./chroma_db", api_key: str = None, groq_api_key: str = None):
        self.api_key = api_key
        self.groq_api_key = groq_api_key
        self.db_path = db_path
        
        # Cross-detect Groq key placed in GEMINI_API_KEY field
        if self.api_key and self.api_key.strip().startswith("gsk_"):
            if not self.groq_api_key:
                self.groq_api_key = self.api_key.strip()
            self.api_key = None
            
        # Ensure directories exist
        os.makedirs(db_path, exist_ok=True)
        
        # Initialize ChromaDB client (Persistent)
        self.chroma_client = chromadb.PersistentClient(path=db_path)
        self.embedding_fn = HybridEmbeddingFunction(self.api_key)
        
        # Get or create the vector collection
        self.collection = self.chroma_client.get_or_create_collection(
            name="rag_documents",
            embedding_function=self.embedding_fn,
            metadata={"hnsw:space": "cosine"}
        )

        self.llm_provider = "none"
        self.llm_model_name = "None (Local Fallback)"
        self.llm_model = None

        if self.groq_api_key:
            self.llm_provider = "groq"
            self.llm_model_name = "llama-3.3-70b-versatile"
            # Ensure Gemini API key is ignored for embeddings if we strictly want Groq
            # Note: since Groq doesn't offer embedding, we use fallback.
            self.api_key = None
            self.embedding_fn = HybridEmbeddingFunction(None)
            self.collection = self.chroma_client.get_or_create_collection(
                name="rag_documents",
                embedding_function=self.embedding_fn,
                metadata={"hnsw:space": "cosine"}
            )
        elif self.api_key:
            genai.configure(api_key=self.api_key)
            self.llm_model = genai.GenerativeModel('gemini-1.5-flash')
            self.llm_provider = "gemini"
            self.llm_model_name = "gemini-1.5-flash"

    def extract_text_from_file(self, file_path: str, original_filename: str) -> str:
        """
        Extracts raw text from a document based on its extension.
        Supports PDF, TXT, MD.
        """
        ext = os.path.splitext(original_filename)[1].lower()
        
        if ext == ".pdf":
            try:
                reader = PdfReader(file_path)
                text = ""
                for page in reader.pages:
                    extracted = page.extract_text()
                    if extracted:
                        text += extracted + "\n"
                return text.strip()
            except Exception as e:
                raise ValueError(f"Failed to read PDF document: {str(e)}")
                
        elif ext in [".txt", ".md"]:
            try:
                with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                    return f.read().strip()
            except Exception as e:
                raise ValueError(f"Failed to read text/markdown file: {str(e)}")
        else:
            raise ValueError(f"Unsupported file type '{ext}'. Please upload PDF, TXT, or MD files.")

    def chunk_text(self, text: str, chunk_size: int = 1000, chunk_overlap: int = 200) -> List[str]:
        """
        Splits long strings into cohesive chunks with semantic boundaries (paragraphs, sentences)
        and overlays to maintain context.
        """
        if not text:
            return []
            
        # If the text is short, return as a single chunk
        if len(text) <= chunk_size:
            return [text]

        # Use recursive splitting by paragraph, sentence, word
        separators = ["\n\n", "\n", ". ", " ", ""]
        chunks = []
        
        current_idx = 0
        text_length = len(text)
        
        while current_idx < text_length:
            # End of search window
            end_idx = min(current_idx + chunk_size, text_length)
            
            # If we've reached the end, grab everything and finish
            if end_idx == text_length:
                chunks.append(text[current_idx:])
                break
                
            # Attempt to split at a natural boundary inside the window
            chunk_slice = text[current_idx:end_idx]
            split_idx = -1
            
            for sep in separators[:-1]: # skip character separator
                last_occurrence = chunk_slice.rfind(sep)
                if last_occurrence != -1 and last_occurrence > chunk_size // 2:
                    split_idx = last_occurrence + len(sep)
                    break
            
            # If no boundary found, hard-split at chunk_size
            if split_idx == -1:
                split_idx = chunk_size
                
            # Store chunk
            chunks.append(text[current_idx:current_idx + split_idx].strip())
            
            # Shift index with overlap
            current_idx += (split_idx - chunk_overlap) if (split_idx > chunk_overlap) else split_idx
            
        return [c for c in chunks if len(c) > 10]

    def ingest_document(self, temp_file_path: str, filename: str) -> Dict[str, Any]:
        """
        Extracts, chunks, embeds, and stores a document into the Chroma vector store.
        """
        raw_text = self.extract_text_from_file(temp_file_path, filename)
        if not raw_text:
            raise ValueError("No extractable text found in this document.")
            
        chunks = self.chunk_text(raw_text)
        if not chunks:
            raise ValueError("Document was empty or too small to chunk.")
            
        doc_hash = hashlib.sha256(filename.encode('utf-8')).hexdigest()[:12]
        
        # Prepare lists for vector insertion
        ids = [f"{doc_hash}_ch_{i}" for i in range(len(chunks))]
        documents = chunks
        metadatas = [{"filename": filename, "chunk_index": i, "doc_hash": doc_hash} for i in range(len(chunks))]
        
        # Add to ChromaDB
        self.collection.add(
            ids=ids,
            documents=documents,
            metadatas=metadatas
        )
        
        return {
            "id": doc_hash,
            "filename": filename,
            "chunks_count": len(chunks),
            "total_characters": len(raw_text)
        }

    def list_documents(self) -> List[Dict[str, Any]]:
        """
        Retrieves unique documents ingested by compiling lists from segment metadata in ChromaDB.
        """
        results = self.collection.get()
        if not results or not results['ids']:
            return []
            
        docs_map = {}
        for meta, text in zip(results['metadatas'], results['documents']):
            filename = meta['filename']
            doc_hash = meta['doc_hash']
            if doc_hash not in docs_map:
                docs_map[doc_hash] = {
                    "id": doc_hash,
                    "filename": filename,
                    "chunks_count": 0,
                    "characters_count": 0
                }
            docs_map[doc_hash]["chunks_count"] += 1
            docs_map[doc_hash]["characters_count"] += len(text)
            
        return list(docs_map.values())

    def delete_document(self, doc_hash: str) -> bool:
        """
        Deletes a document from the vector store using its hash ID.
        """
        # Retrieve segments to confirm document existence
        docs = self.collection.get(where={"doc_hash": doc_hash})
        if not docs or not docs['ids']:
            return False
            
        # Delete by filter
        self.collection.delete(where={"doc_hash": doc_hash})
        return True

    def reset_database(self):
        """
        Deletes the entire collection and recreates it empty.
        """
        self.chroma_client.delete_collection("rag_documents")
        self.collection = self.chroma_client.create_collection(
            name="rag_documents",
            embedding_function=self.embedding_fn,
            metadata={"hnsw:space": "cosine"}
        )

    def query(self, user_query: str, max_results: int = 4) -> Dict[str, Any]:
        """
        Retrieves matching chunks and coordinates with the LLM to generate an answer.
        """
        # 1. Query Chroma Vector DB
        results = self.collection.query(
            query_texts=[user_query],
            n_results=max_results
        )
        
        # Extract matching contexts
        context_chunks = []
        sources = []
        
        if results and results['documents'] and results['documents'][0]:
            for text, meta, dist in zip(results['documents'][0], results['metadatas'][0], results['distances'][0]):
                context_chunks.append(text)
                sources.append({
                    "filename": meta['filename'],
                    "chunk": meta['chunk_index'],
                    "relevance": round(1 - dist, 4) if dist is not None else 1.0
                })
        
        # 2. Synthesize with LLM or fallback
        context_str = "\n---\n".join([f"Source: {src['filename']}\nContent: {txt}" for src, txt in zip(sources, context_chunks)])
        
        if self.llm_provider == "gemini" and self.llm_model:
            try:
                system_prompt = (
                    "You are a sophisticated, friendly, and expert AI Assistant. "
                    "You are answering questions based on the uploaded context documents provided below.\n\n"
                    "RULES:\n"
                    "1. Respond directly, using professional markdown formatting (tables, bullet points, headers, or code blocks where relevant).\n"
                    "2. Base your response strongly on the provided Context. Cite the source files (e.g., [filename]) directly in your text when summarizing points.\n"
                    "3. If the context does not contain enough information, explain that briefly but answer with what general knowledge is helpful, clearly separating what is from the document vs what is general knowledge.\n\n"
                    f"Context:\n{context_str}\n\n"
                    f"Question: {user_query}\n"
                    "Answer:"
                )
                response = self.llm_model.generate_content(system_prompt)
                answer = response.text
                is_fallback = False
            except Exception as e:
                print(f"Error querying Gemini LLM API: {e}. Falling back to local heuristic answering.")
                answer = self._generate_local_answer(user_query, context_chunks, sources)
                is_fallback = True
        elif self.llm_provider == "groq" and self.groq_api_key:
            try:
                answer = self._query_groq_llm(user_query, context_str)
                is_fallback = False
            except Exception as e:
                print(f"Error querying Groq LLM API: {e}. Falling back to local heuristic answering.")
                answer = self._generate_local_answer(user_query, context_chunks, sources)
                is_fallback = True
        else:
            answer = self._generate_local_answer(user_query, context_chunks, sources)
            is_fallback = True
            
        return {
            "query": user_query,
            "answer": answer,
            "sources": sources,
            "local_fallback": is_fallback
        }

    def _query_groq_llm(self, user_query: str, context_str: str) -> str:
        """
        Sends query and context to the Groq API endpoint via standard HTTPS POST.
        """
        import requests
        
        system_prompt = (
            "You are a sophisticated, friendly, and expert AI Assistant. "
            "You are answering questions based on the uploaded context documents provided below.\n\n"
            "RULES:\n"
            "1. Respond directly, using professional markdown formatting (tables, bullet points, headers, or code blocks where relevant).\n"
            "2. Base your response strongly on the provided Context. Cite the source files (e.g., [filename]) directly in your text when summarizing points.\n"
            "3. If the context does not contain enough information, explain that briefly but answer with what general knowledge is helpful, clearly separating what is from the document vs what is general knowledge.\n"
        )
        
        user_content = (
            f"Context:\n{context_str}\n\n"
            f"Question: {user_query}\n"
            "Answer:"
        )
        
        headers = {
            "Authorization": f"Bearer {self.groq_api_key}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": "llama-3.3-70b-versatile",
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_content}
            ],
            "temperature": 0.2
        }
        
        response = requests.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers=headers,
            json=payload,
            timeout=30
        )
        
        if response.status_code != 200:
            raise RuntimeError(f"Groq API returned error {response.status_code}: {response.text}")
            
        res_data = response.json()
        return res_data["choices"][0]["message"]["content"]

    def _generate_local_answer(self, query: str, chunks: List[str], sources: List[Dict[str, Any]]) -> str:
        """
        A smart keyword-based local search heuristic that acts as a fallback when Gemini is offline.
        It generates a summarized list of extracts from matching chunks.
        """
        if not chunks:
            return (
                "### ℹ️ Local Mode Active (No API Key Configured)\n\n"
                "I couldn't find any documents ingested in the Vector Database yet! "
                "Please upload some text or PDF documents using the Ingestion Hub, and I'll be able to retrieve "
                "relevant contexts for you."
            )
            
        # Find keywords from query
        keywords = [w.strip("?,.!-").lower() for w in query.split() if len(w) > 3]
        
        matched_results = []
        for text, src in zip(chunks, sources):
            score = sum(1 for kw in keywords if kw in text.lower())
            matched_results.append((score, text, src))
            
        # Sort by match score
        matched_results.sort(key=lambda x: x[0], reverse=True)
        
        # Build answer
        best_match = matched_results[0]
        
        response_lines = [
            "### ℹ️ Local Mode Active (No API Key Configured)",
            "I parsed your document vector database offline and retrieved the most relevant matches.",
            ""
        ]
        
        if best_match[0] > 0:
            response_lines.append(f"**Top Match found in document *[{best_match[2]['filename']}]* (Relevance Match: {best_match[0]}):**")
            # Extract a subset of the text around the first keyword
            text_body = best_match[1]
            first_kw = next((kw for kw in keywords if kw in text_body.lower()), None)
            
            excerpt = ""
            if first_kw:
                pos = text_body.lower().find(first_kw)
                start = max(0, pos - 150)
                end = min(len(text_body), pos + 350)
                excerpt = ("..." if start > 0 else "") + text_body[start:end] + ("..." if end < len(text_body) else "")
            else:
                excerpt = text_body[:400] + "..." if len(text_body) > 400 else text_body
                
            response_lines.append(f"> {excerpt.strip()}")
            response_lines.append("")
            
            # Show other matches
            if len(matched_results) > 1 and matched_results[1][0] > 0:
                response_lines.append("**Additional matching files identified:**")
                for score, _, src in matched_results[1:3]:
                    if score > 0:
                        response_lines.append(f"- Document **{src['filename']}** (chunk {src['chunk']})")
                response_lines.append("")
        else:
            # Fallback to presenting the top vector-matched paragraph
            response_lines.append(f"**Vector search returned this highly-relevant chunk from *[{best_match[2]['filename']}]*:**")
            response_lines.append(f"> {best_match[1][:400]}...")
            response_lines.append("")
            
        response_lines.append("> [!TIP]\n> **Tip**: Setup your `GEMINI_API_KEY` in the `ai-service/.env` file to unlock high-fidelity AI summaries, deep reasoning, and fluid conversations!")
        
        return "\n".join(response_lines)
