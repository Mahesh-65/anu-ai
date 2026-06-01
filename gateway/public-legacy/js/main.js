// Main Dashboard Interactivity & API Orchestration for Anu AI

const API_BASE = '/api';

// Cache DOM elements
const apiStatusEl = document.getElementById('api-status');
const statDocsCountEl = document.getElementById('stat-docs-count');
const statChunksCountEl = document.getElementById('stat-chunks-count');
const statSizeEl = document.getElementById('stat-size');
const statLatencyEl = document.getElementById('stat-latency');
const modelLlmEl = document.getElementById('model-llm');
const modelEmbeddingEl = document.getElementById('model-embedding');
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const progressQueue = document.getElementById('progress-queue');
const queueItems = document.getElementById('queue-items');
const consoleLogs = document.getElementById('console-logs');
const btnClearLogs = document.getElementById('btn-clear-logs');
const btnResetDb = document.getElementById('btn-reset-db');
const libraryTbody = document.getElementById('library-tbody');

let connectionTimer = null;
let queryLatencies = [];

// Initialize dashboard on load
document.addEventListener('DOMContentLoaded', () => {
    initApp();
    setupDragAndDrop();
    setupEventListeners();
});

function initApp() {
    logToConsole('SYSTEM', 'Initializing Anu AI dashboard metrics...');
    checkSystemStatus();
    loadLibrary();
    
    // Poll system status every 10 seconds
    connectionTimer = setInterval(checkSystemStatus, 10000);
}

// Write line entries into the virtual log terminal console
function logToConsole(type, message) {
    const time = new Date().toLocaleTimeString();
    const line = document.createElement('div');
    line.className = `log-line ${type.toLowerCase()}`;
    line.innerHTML = `<span class="log-time" style="color: var(--text-muted); margin-right: 8px;">[${time}]</span><span class="log-tag" style="font-weight: 700;">[${type}]</span> ${message}`;
    consoleLogs.appendChild(line);
    consoleLogs.scrollTop = consoleLogs.scrollHeight;
}

// Query FastAPI /api/health and style status indicators
async function checkSystemStatus() {
    try {
        const start = performance.now();
        const res = await fetch(`${API_BASE}/health`);
        const duration = Math.round(performance.now() - start);
        
        if (!res.ok) throw new Error('API server returned error status.');
        const data = await res.json();
        
        // Update connection status UI
        apiStatusEl.className = 'status-pill';
        const pulse = apiStatusEl.querySelector('.pulse-dot');
        const label = apiStatusEl.querySelector('.status-label');
        
        if (data.api_key_configured) {
            apiStatusEl.classList.add('online');
            
            if (data.llm_provider === 'groq') {
                label.textContent = 'System Online (Groq Llama 3)';
            } else {
                label.textContent = 'System Online (Gemini 1.5)';
            }
            
            modelLlmEl.textContent = data.llm_model;
            modelEmbeddingEl.textContent = data.embedding_model;
        } else {
            apiStatusEl.classList.add('fallback');
            label.textContent = 'Offline Fallback Active';
            modelLlmEl.textContent = 'Keyword Search Fallback';
            modelEmbeddingEl.textContent = 'character-gram vectors';
        }
        
        // Record latency
        queryLatencies.push(duration);
        if (queryLatencies.length > 5) queryLatencies.shift();
        const avg = Math.round(queryLatencies.reduce((a, b) => a + b, 0) / queryLatencies.length);
        statLatencyEl.textContent = `${avg} ms`;
        
    } catch (err) {
        console.error('System offline:', err);
        apiStatusEl.className = 'status-pill offline';
        apiStatusEl.querySelector('.status-label').textContent = 'System Offline';
        statLatencyEl.textContent = '-- ms';
        logToConsole('ERROR', 'Unable to reach Python FastAPI backend services.');
    }
}

// Fetch document list and build metrics dashboard
async function loadLibrary() {
    try {
        const res = await fetch(`${API_BASE}/documents`);
        if (!res.ok) throw new Error('Failed to retrieve document index.');
        
        const data = await res.json();
        const docs = data.documents || [];
        
        // Update dashboard stats counters
        statDocsCountEl.textContent = docs.length;
        
        let totalChunks = 0;
        let totalSize = 0;
        
        docs.forEach(doc => {
            totalChunks += doc.chunks_count;
            totalSize += doc.characters_count;
        });
        
        statChunksCountEl.textContent = totalChunks;
        
        // Calculate storage size (approx 1 character = 1 byte)
        const kbSize = (totalSize / 1024).toFixed(1);
        statSizeEl.textContent = `${kbSize} KB`;
        
        // Update the files table view
        renderLibraryTable(docs);
        
    } catch (err) {
        logToConsole('ERROR', `Failed to load document library: ${err.message}`);
    }
}

// Populate the HTML files table dynamic template
function renderLibraryTable(docs) {
    if (docs.length === 0) {
        libraryTbody.innerHTML = `
            <tr class="empty-row">
                <td colspan="5">
                    <div class="empty-state">
                        <i class="fa-solid fa-box-open"></i>
                        <p>No documents found in the database. Ingest files above to start!</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    libraryTbody.innerHTML = '';
    
    docs.forEach(doc => {
        const tr = document.createElement('tr');
        tr.className = 'fade-in';
        
        // File extension styling
        const ext = doc.filename.split('.').pop().toLowerCase();
        let iconClass = 'fa-file-lines doc-txt';
        if (ext === 'pdf') iconClass = 'fa-file-pdf doc-pdf';
        if (ext === 'md') iconClass = 'fa-file-code doc-md';
        
        tr.innerHTML = `
            <td>
                <div class="doc-name-cell">
                    <i class="fa-solid ${iconClass}"></i>
                    <span>${doc.filename}</span>
                </div>
            </td>
            <td style="font-weight: 600;">${doc.chunks_count} chunks</td>
            <td>${doc.characters_count.toLocaleString()} chars</td>
            <td class="hash-cell">${doc.id}</td>
            <td>
                <button class="btn-icon-danger btn-delete-doc" data-hash="${doc.id}" data-filename="${doc.filename}" title="Delete Document">
                    <i class="fa-solid fa-trash-can"></i>
                </button>
            </td>
        `;
        
        libraryTbody.appendChild(tr);
    });
    
    // Add deletion action listeners
    document.querySelectorAll('.btn-delete-doc').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const hash = btn.getAttribute('data-hash');
            const name = btn.getAttribute('data-filename');
            deleteDocument(hash, name);
        });
    });
}

// Trigger DELETE /api/documents/{hash}
async function deleteDocument(hash, name) {
    if (!confirm(`Are you sure you want to delete "${name}" from the vector database?`)) return;
    
    try {
        logToConsole('INFO', `Requesting deletion of document: ${name}...`);
        const res = await fetch(`${API_BASE}/documents/${hash}`, { method: 'DELETE' });
        
        if (!res.ok) {
            const errData = await res.json();
            throw new Error(errData.detail || 'Delete operation failed.');
        }
        
        logToConsole('SUCCESS', `Document "${name}" successfully deleted from the index.`);
        loadLibrary();
        
        // Dispatch custom event to notify chatbot
        window.dispatchEvent(new CustomEvent('knowledge-base-updated'));
        
    } catch (err) {
        logToConsole('ERROR', `Failed to delete document: ${err.message}`);
    }
}

// Setup Event Listeners
function setupEventListeners() {
    btnClearLogs.addEventListener('click', () => {
        consoleLogs.innerHTML = '<div class="log-line system">[SYSTEM] Console logs cleared.</div>';
    });
    
    btnResetDb.addEventListener('click', async () => {
        if (!confirm('WARNING: Are you absolutely sure you want to reset the database? This deletes all vectorized content chunks.')) return;
        
        try {
            logToConsole('INFO', 'Clearing ChromaDB vector index collections...');
            const res = await fetch(`${API_BASE}/reset`, { method: 'POST' });
            if (!res.ok) throw new Error('Reset request failed.');
            
            logToConsole('SUCCESS', 'Vector database successfully reset and cleared.');
            loadLibrary();
            
            // Dispatch event to refresh chatbot widget
            window.dispatchEvent(new CustomEvent('knowledge-base-updated'));
            
        } catch (err) {
            logToConsole('ERROR', `Failed to reset database: ${err.message}`);
        }
    });
}

// Ingestion Area Drag & Drop Handlers
function setupDragAndDrop() {
    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, (e) => {
            e.preventDefault();
            dropZone.classList.add('drag-hover');
        }, false);
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, (e) => {
            e.preventDefault();
            dropZone.classList.remove('drag-hover');
        }, false);
    });
    
    dropZone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;
        if (files.length > 0) {
            handleUpload(files);
        }
    });
    
    fileInput.addEventListener('change', () => {
        if (fileInput.files.length > 0) {
            handleUpload(fileInput.files);
            fileInput.value = ''; // Clear file input
        }
    });
}

// Processing queue and multi-file ingestion uploads
async function handleUpload(files) {
    progressQueue.style.display = 'flex';
    
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Skip formats that don't match PDF, TXT, MD
        const ext = file.name.split('.').pop().toLowerCase();
        if (!['pdf', 'txt', 'md'].includes(ext)) {
            logToConsole('ERROR', `Skipping upload: file "${file.name}" uses an unsupported format.`);
            continue;
        }
        
        // Create Queue Item Element in UI
        const item = document.createElement('div');
        item.className = 'queue-item';
        const itemId = `queue-${Date.now()}-${i}`;
        item.id = itemId;
        
        item.innerHTML = `
            <div class="queue-info">
                <span class="queue-name">${file.name}</span>
                <span class="queue-status text-info">Uploading...</span>
            </div>
            <div class="progress-bar-bg">
                <div class="progress-bar-fill" id="bar-${itemId}"></div>
            </div>
        `;
        queueItems.appendChild(item);
        
        // Perform actual ingestion POST fetch
        try {
            logToConsole('INFO', `Starting ingestion for: ${file.name} (${(file.size/1024).toFixed(1)} KB)...`);
            
            const formData = new FormData();
            formData.append('file', file);
            
            const barFill = document.getElementById(`bar-${itemId}`);
            barFill.style.width = '30%'; // Upload simulated progress
            
            const res = await fetch(`${API_BASE}/ingest`, {
                method: 'POST',
                body: formData
            });
            
            barFill.style.width = '70%'; // Embedding generation progress
            
            if (!res.ok) {
                const errText = await res.json();
                throw new Error(errText.detail || 'Ingestion failed.');
            }
            
            const data = await res.json();
            
            // Success states
            barFill.style.width = '100%';
            item.querySelector('.queue-status').className = 'queue-status text-success';
            item.querySelector('.queue-status').textContent = 'Completed';
            
            logToConsole('SUCCESS', `Successfully vectorized "${file.name}" into ${data.data.chunks_count} knowledge chunks.`);
            
            // Reload Library table
            loadLibrary();
            
            // Dispatch event to refresh chatbot widget
            window.dispatchEvent(new CustomEvent('knowledge-base-updated'));
            
        } catch (err) {
            item.querySelector('.queue-status').className = 'queue-status text-danger';
            item.querySelector('.queue-status').textContent = 'Error';
            logToConsole('ERROR', `Failed to ingest "${file.name}": ${err.message}`);
        }
        
        // Remove item from queue list after a delay
        setTimeout(() => {
            item.style.opacity = '0';
            item.style.transition = 'opacity 0.5s ease';
            setTimeout(() => {
                item.remove();
                if (queueItems.children.length === 0) {
                    progressQueue.style.display = 'none';
                }
            }, 500);
        }, 3000);
    }
}
