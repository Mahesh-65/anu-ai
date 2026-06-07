import os
import shutil
from typing import Dict, Any

from dotenv import load_dotenv
from fastapi import FastAPI, UploadFile, File, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

load_dotenv()

try:
    from src.rag_pipeline import RAGPipeline
    from src.permissions import require_ai_admin
except ModuleNotFoundError:
    from rag_pipeline import RAGPipeline
    from permissions import require_ai_admin


app = FastAPI(
    title="OrganiStation RAG Service",
    description="Python FastAPI RAG Service using ChromaDB and Groq.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

PORT = int(os.getenv("PORT", 8000))
HOST = os.getenv("HOST", "0.0.0.0")
CHROMA_DB_PATH = os.getenv("CHROMA_DB_PATH", "./chroma_db")
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "").strip() or None

TEMP_DIR = "./temp_uploads"
os.makedirs(TEMP_DIR, exist_ok=True)

rag_pipeline = RAGPipeline(db_path=CHROMA_DB_PATH, groq_api_key=GROQ_API_KEY)


class QueryRequest(BaseModel):
    query: str


@app.get("/")
@app.get("/api/health")
@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "ai-service",
        "vector_store": "ChromaDB",
        "groq_configured": rag_pipeline.llm_provider == "groq",
        "llm_provider": rag_pipeline.llm_provider,
        "llm_model": rag_pipeline.llm_model_name,
        "embedding_model": rag_pipeline.embedding_fn.model_name,
    }


@app.get("/api/documents")
@app.get("/documents")
def get_documents():
    try:
        docs = rag_pipeline.list_documents()
        return {"documents": docs}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch documents: {str(e)}")


@app.post("/api/ingest")
@app.post("/ingest")
async def ingest_document(
    file: UploadFile = File(...),
    _: None = Depends(require_ai_admin),
):
    if not file.filename:
        raise HTTPException(status_code=400, detail="Invalid file: No filename provided.")

    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in [".pdf", ".txt", ".md"]:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{ext}'. Only PDF, TXT, and MD are supported.",
        )

    temp_file_path = os.path.join(TEMP_DIR, file.filename)
    try:
        with open(temp_file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        result = rag_pipeline.ingest_document(temp_file_path, file.filename)
        return {
            "status": "success",
            "message": f"Document '{file.filename}' successfully ingested and vectorized.",
            "data": result,
        }
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ingestion failed: {str(e)}")
    finally:
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)


@app.post("/api/query")
@app.post("/query")
def query_documents(request: QueryRequest):
    if not request.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty.")

    try:
        return rag_pipeline.query(request.query)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Query execution failed: {str(e)}")


@app.delete("/api/documents/{doc_hash}")
@app.delete("/documents/{doc_hash}")
def delete_document(doc_hash: str, _: None = Depends(require_ai_admin)):
    try:
        success = rag_pipeline.delete_document(doc_hash)
        if not success:
            raise HTTPException(status_code=404, detail="Document not found or already deleted.")
        return {"status": "success", "message": f"Document ID '{doc_hash}' and its embeddings removed successfully."}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete document: {str(e)}")


@app.post("/api/reset")
@app.post("/reset")
def reset_database(_: None = Depends(require_ai_admin)):
    try:
        rag_pipeline.reset_database()
        return {"status": "success", "message": "Vector database collection successfully cleared."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database reset failed: {str(e)}")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("src.app:app", host=HOST, port=PORT, reload=True)
