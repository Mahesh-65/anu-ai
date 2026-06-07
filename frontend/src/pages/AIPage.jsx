import { useState, useEffect, useRef } from 'react';
import { Send, Upload, RefreshCw, Brain, FileText, Trash2, X } from 'lucide-react';
import AppLayout from '../components/AppLayout';
import { aiApi } from '../api/client';
import { useAuth } from '../context/AuthContext';

function Message({ msg }) {
  const isUser = msg.role === 'user';
  return (
    <div style={{ display:'flex', gap:12, flexDirection: isUser ? 'row-reverse' : 'row', marginBottom:16 }}>
      <div className="avatar avatar-sm" style={{ background: isUser ? 'var(--primary)' : 'linear-gradient(135deg,var(--purple),var(--primary))', color:'#fff', flexShrink:0 }}>
        {isUser ? 'U' : <Brain size={14}/>}
      </div>
      <div style={{
        maxWidth:'70%', padding:'12px 16px',
        background: isUser ? 'var(--primary-glow)' : 'var(--bg-card)',
        border: `1px solid ${isUser ? 'var(--primary)' : 'var(--border)'}`,
        borderRadius: isUser ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
        fontSize: 13.5, lineHeight: 1.7, color: 'var(--text-primary)',
        whiteSpace: 'pre-wrap',
      }}>
        {msg.content}
        {msg.sources && msg.sources.length > 0 && (
          <div style={{ marginTop:10, paddingTop:10, borderTop:'1px solid var(--border)' }}>
            <div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:6 }}>Sources:</div>
            {msg.sources.map((s,i) => (
              <div key={i} className="chip" style={{ marginBottom:4, display:'inline-flex', marginRight:4 }}>
                <FileText size={10}/> {s.source ?? `Source ${i+1}`}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AIPage() {
  const { hasPermission } = useAuth();
  const canUpload = hasPermission('ai:admin');
  const [messages,  setMessages]  = useState([{
    role:'assistant',
    content: canUpload
      ? 'Hello! Upload company documents and ask me anything about them.'
      : 'Hello! Ask me questions about documents your team has uploaded.',
  }]);
  const [input,     setInput]     = useState('');
  const [documents, setDocuments] = useState([]);
  const [sending,   setSending]   = useState(false);
  const [uploading, setUploading] = useState(false);
  const [status,    setStatus]    = useState(null);
  const bottomRef = useRef(null);
  const fileRef   = useRef(null);

  useEffect(() => { loadDocs(); checkStatus(); }, []);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:'smooth' }); }, [messages]);

  const loadDocs    = async () => { try { const d = await aiApi.documents(); setDocuments(d.documents ?? []); } catch {} };
  const checkStatus = async () => { try { const s = await aiApi.health();    setStatus(s); }                   catch {} };

  const send = async (e) => {
    e.preventDefault();
    if (!input.trim() || sending) return;
    const userMsg = { role:'user', content: input.trim() };
    setMessages(m => [...m, userMsg]);
    setInput('');
    setSending(true);
    try {
      const res = await aiApi.query(userMsg.content);
      setMessages(m => [...m, { role:'assistant', content: res.response ?? res.answer ?? JSON.stringify(res), sources: res.sources }]);
    } catch (err) {
      setMessages(m => [...m, { role:'assistant', content: `Error: ${err.message}` }]);
    }
    setSending(false);
  };

  const upload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await aiApi.ingest(file);
      await loadDocs();
      setMessages(m => [...m, { role:'assistant', content: `✅ Document "${file.name}" uploaded and indexed! You can now ask questions about its content.` }]);
    } catch (err) {
      setMessages(m => [...m, { role:'assistant', content: `❌ Upload failed: ${err.message}` }]);
    }
    setUploading(false);
    e.target.value = '';
  };

  const reset = async () => {
    if (!confirm('Clear entire document library?')) return;
    await aiApi.reset();
    setDocuments([]);
    setMessages(m => [...m, { role:'assistant', content:'Vector database cleared. You can upload new documents.' }]);
  };

  return (
    <AppLayout pageTitle="AI Assistant">
      <div style={{ display:'grid', gridTemplateColumns:'1fr 280px', gap:20, height:'calc(100vh - 120px)' }}>
        {/* Chat */}
        <div className="card" style={{ display:'flex', flexDirection:'column', padding:0, overflow:'hidden' }}>
          {/* Header */}
          <div style={{ padding:'14px 20px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:36, height:36, borderRadius:'var(--radius-md)', background:'linear-gradient(135deg,var(--purple),var(--primary))', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Brain size={18} style={{ color:'#fff' }}/>
            </div>
            <div>
              <div style={{ fontWeight:600, fontSize:14 }}>OrganiStation — RAG Assistant</div>
              <div style={{ fontSize:11, color: status?.status==='healthy' ? 'var(--success)' : 'var(--danger)' }}>
                ● {status?.llm_model ?? 'Connecting...'} {status?.llm_provider ? `(${status.llm_provider})` : ''}
              </div>
            </div>
          </div>

          {/* Messages */}
          <div style={{ flex:1, overflowY:'auto', padding:20 }}>
            {messages.map((m, i) => <Message key={i} msg={m} />)}
            {sending && (
              <div style={{ display:'flex', gap:12, marginBottom:16 }}>
                <div className="avatar avatar-sm" style={{ background:'linear-gradient(135deg,var(--purple),var(--primary))', color:'#fff' }}><Brain size={14}/></div>
                <div style={{ padding:'12px 16px', background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:'4px 16px 16px 16px' }}>
                  <span className="animate-pulse" style={{ color:'var(--text-muted)', fontSize:13 }}>Thinking...</span>
                </div>
              </div>
            )}
            <div ref={bottomRef}/>
          </div>

          {/* Input */}
          <form onSubmit={send} style={{ padding:'14px 20px', borderTop:'1px solid var(--border)', display:'flex', gap:10 }}>
            <input
              className="form-input"
              style={{ flex:1 }}
              placeholder="Ask anything about your documents..."
              value={input}
              onChange={e => setInput(e.target.value)}
              disabled={sending}
            />
            {canUpload && (
              <button type="button" className="btn btn-secondary btn-icon" onClick={() => fileRef.current?.click()} disabled={uploading} title="Upload document">
                {uploading ? <span className="spinner"/> : <Upload size={16}/>}
              </button>
            )}
            <button type="submit" className="btn btn-primary btn-icon" disabled={sending || !input.trim()}>
              <Send size={16}/>
            </button>
            <input ref={fileRef} type="file" accept=".pdf,.txt,.md" onChange={upload} style={{ display:'none' }}/>
          </form>
        </div>

        {/* Sidebar: Document Library */}
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <div className="card" style={{ flex:1, overflow:'hidden', display:'flex', flexDirection:'column', padding:0 }}>
            <div style={{ padding:'14px 16px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <span style={{ fontWeight:600, fontSize:13 }}>Document Library</span>
              {canUpload && (
                <button className="btn btn-ghost btn-icon btn-sm" onClick={reset} title="Reset"><RefreshCw size={14}/></button>
              )}
            </div>
            <div style={{ flex:1, overflowY:'auto', padding:12 }}>
              {documents.length === 0 ? (
                <div className="empty-state" style={{ padding:24 }}>
                  <FileText size={32}/>
                  <p style={{ fontSize:12 }}>{canUpload ? 'No documents uploaded yet' : 'No documents available yet'}</p>
                  {canUpload && (
                    <button className="btn btn-primary btn-sm" onClick={() => fileRef.current?.click()}>
                      <Upload size={12}/> Upload PDF
                    </button>
                  )}
                </div>
              ) : documents.map((d, i) => (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 10px', borderRadius:'var(--radius-sm)', marginBottom:4, background:'var(--bg-hover)' }}>
                  <FileText size={13} style={{ color:'var(--primary)', flexShrink:0 }}/>
                  <span style={{ fontSize:12, color:'var(--text-secondary)', flex:1 }} className="truncate">{d.filename ?? d}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card" style={{ padding:16 }}>
            <div style={{ fontWeight:600, fontSize:13, marginBottom:12 }}>Quick Prompts</div>
            {[
              'Summarize the latest policy documents',
              'What are the employee leave benefits?',
              'Explain our expense approval process',
              'What projects are in progress?',
            ].map((p, i) => (
              <button key={i} className="btn btn-ghost" style={{ textAlign:'left', width:'100%', marginBottom:6, fontSize:12, justifyContent:'flex-start' }}
                onClick={() => setInput(p)}>
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
