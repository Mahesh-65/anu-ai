import { useEffect, useState } from 'react';
import { Plus, Search, Edit2, CheckCircle, Clock, AlertCircle, X, Tag } from 'lucide-react';
import AppLayout from '../components/AppLayout';
import { projectApi } from '../api/client';

const PRIORITY = { low:'badge-gray', medium:'badge-warning', high:'badge-danger', critical:'badge-danger' };
const STATUS_P  = { planning:'badge-gray', active:'badge-primary', on_hold:'badge-warning', completed:'badge-success' };

function ProjectModal({ proj, onClose, onSaved }) {
  const blank = { name:'', description:'', status:'planning', priority:'medium', start_date:'', due_date:'' };
  const [form, setForm]   = useState(proj ? { ...proj } : blank);
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');
  const set = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault(); setSaving(true); setError('');
    try {
      if (proj?._id ?? proj?.id) await projectApi.updateProject(proj._id ?? proj.id, form);
      else                        await projectApi.createProject(form);
      onSaved();
    } catch(err) { setError(err.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target===e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3>{proj ? 'Edit Project' : 'New Project'}</h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18}/></button>
        </div>
        <form onSubmit={submit} style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <div className="form-group"><label className="form-label">Project Name</label><input name="name" className="form-input" value={form.name} onChange={set} required /></div>
          <div className="form-group"><label className="form-label">Description</label><textarea name="description" className="form-textarea" value={form.description} onChange={set} /></div>
          <div className="grid-2">
            <div className="form-group"><label className="form-label">Status</label>
              <select name="status" className="form-select" value={form.status} onChange={set}>
                <option value="planning">Planning</option><option value="active">Active</option><option value="on_hold">On Hold</option><option value="completed">Completed</option>
              </select>
            </div>
            <div className="form-group"><label className="form-label">Priority</label>
              <select name="priority" className="form-select" value={form.priority} onChange={set}>
                <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option>
              </select>
            </div>
          </div>
          <div className="grid-2">
            <div className="form-group"><label className="form-label">Start Date</label><input name="start_date" type="date" className="form-input" value={form.start_date} onChange={set} /></div>
            <div className="form-group"><label className="form-label">Due Date</label><input name="due_date" type="date" className="form-input" value={form.due_date} onChange={set} /></div>
          </div>
          {error && <div style={{ color:'var(--danger)', fontSize:12 }}>{error}</div>}
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function TicketModal({ onClose, onSaved, projects }) {
  const [form, setForm]   = useState({ title:'', description:'', project_id:'', priority:'medium', status:'open' });
  const [saving, setSaving] = useState(false);
  const set = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault(); setSaving(true);
    try { await projectApi.createTicket(form); onSaved(); }
    catch {}
    finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target===e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header"><h3>New Ticket</h3><button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18}/></button></div>
        <form onSubmit={submit} style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <div className="form-group"><label className="form-label">Title</label><input name="title" className="form-input" value={form.title} onChange={set} required /></div>
          <div className="form-group"><label className="form-label">Description</label><textarea name="description" className="form-textarea" value={form.description} onChange={set} /></div>
          <div className="grid-2">
            <div className="form-group"><label className="form-label">Project</label>
              <select name="project_id" className="form-select" value={form.project_id} onChange={set}>
                <option value="">No Project</option>
                {projects.map(p => <option key={p._id??p.id} value={p._id??p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="form-group"><label className="form-label">Priority</label>
              <select name="priority" className="form-select" value={form.priority} onChange={set}>
                <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option>
              </select>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Creating...' : 'Create Ticket'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState([]);
  const [tickets,  setTickets]  = useState([]);
  const [search,   setSearch]   = useState('');
  const [loading,  setLoading]  = useState(true);
  const [tab,      setTab]      = useState('projects');
  const [modal,    setModal]    = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const [p, t] = await Promise.allSettled([projectApi.projects(), projectApi.tickets()]);
      setProjects(p.value ?? []);
      setTickets(t.value ?? []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = tab === 'projects'
    ? projects.filter(p => p.name?.toLowerCase().includes(search.toLowerCase()))
    : tickets.filter(t  => t.title?.toLowerCase().includes(search.toLowerCase()));

  return (
    <AppLayout pageTitle="Projects & Tickets">
      <div className="page-header">
        <div className="page-header-left">
          <h1>Projects & Tickets</h1>
          <p>Track project progress, milestones and support tickets</p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-secondary" onClick={() => setModal('ticket')}><Tag size={15}/> New Ticket</button>
          <button className="btn btn-primary"   onClick={() => setModal('project')}><Plus size={15}/> New Project</button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:4, marginBottom:20, background:'var(--bg-card)', padding:4, borderRadius:'var(--radius-md)', width:'fit-content' }}>
        {['projects','tickets'].map(t => (
          <button key={t} className={`btn ${tab===t ? 'btn-primary' : 'btn-ghost'}`} style={{ textTransform:'capitalize' }} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>

      <div className="card" style={{ padding:0 }}>
        <div style={{ padding:'16px 20px', borderBottom:'1px solid var(--border)', display:'flex', gap:12 }}>
          <div style={{ position:'relative', flex:1 }}>
            <Search size={14} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)' }}/>
            <input className="form-input" style={{ paddingLeft:32 }} placeholder={`Search ${tab}...`} value={search} onChange={e=>setSearch(e.target.value)} />
          </div>
        </div>

        {loading ? (
          <div className="empty-state"><div className="spinner" style={{width:32,height:32}}/></div>
        ) : filtered.length === 0 ? (
          <div className="empty-state"><p>No {tab} found</p></div>
        ) : tab === 'projects' ? (
          <table className="data-table">
            <thead><tr><th>Name</th><th>Status</th><th>Priority</th><th>Due Date</th><th>Actions</th></tr></thead>
            <tbody>
              {filtered.map(p => {
                const id = p._id ?? p.id;
                return (
                  <tr key={id}>
                    <td><div style={{ fontWeight:600, color:'var(--text-primary)' }}>{p.name}</div><div style={{ fontSize:11, color:'var(--text-muted)' }}>{p.description?.slice(0,60)}</div></td>
                    <td><span className={`badge ${STATUS_P[p.status]||'badge-gray'}`}>{p.status}</span></td>
                    <td><span className={`badge ${PRIORITY[p.priority]||'badge-gray'}`}>{p.priority}</span></td>
                    <td>{p.due_date ? new Date(p.due_date).toLocaleDateString() : '—'}</td>
                    <td><button className="btn btn-ghost btn-icon btn-sm" onClick={()=>setModal(p)}><Edit2 size={14}/></button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <table className="data-table">
            <thead><tr><th>Title</th><th>Priority</th><th>Status</th><th>Created</th></tr></thead>
            <tbody>
              {filtered.map(t => {
                const id = t._id ?? t.id;
                return (
                  <tr key={id}>
                    <td><div style={{ fontWeight:600, color:'var(--text-primary)' }}>{t.title}</div><div style={{ fontSize:11, color:'var(--text-muted)' }}>{t.description?.slice(0,60)}</div></td>
                    <td><span className={`badge ${PRIORITY[t.priority]||'badge-gray'}`}>{t.priority}</span></td>
                    <td><span className={`badge ${t.status==='open'?'badge-primary':t.status==='closed'?'badge-success':'badge-warning'}`}>{t.status}</span></td>
                    <td>{t.created_at ? new Date(t.created_at).toLocaleDateString() : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {modal === 'project' && <ProjectModal onClose={()=>setModal(null)} onSaved={()=>{setModal(null);load();}} />}
      {modal === 'ticket'  && <TicketModal  projects={projects} onClose={()=>setModal(null)} onSaved={()=>{setModal(null);load();}} />}
      {modal && typeof modal==='object' && <ProjectModal proj={modal} onClose={()=>setModal(null)} onSaved={()=>{setModal(null);load();}} />}
    </AppLayout>
  );
}
