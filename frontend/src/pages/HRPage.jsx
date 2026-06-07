import { useEffect, useState } from 'react';
import { Plus, Search, Edit2, Trash2, X } from 'lucide-react';
import AppLayout from '../components/AppLayout';
import CredentialsModal from '../components/CredentialsModal';
import { hrApi, usersApi } from '../api/client';
import { useAuth } from '../context/AuthContext';

const DEPT_COLORS = { Engineering:'var(--primary)', HR:'var(--success)', Finance:'var(--warning)', Marketing:'var(--pink)', Operations:'var(--secondary)' };
const STATUS_BADGE = { active:'badge-success', inactive:'badge-gray', on_leave:'badge-warning' };

function EmployeeModal({ emp, canCreateLogin, onClose, onSaved, onCredentials }) {
  const blank = { first_name:'', last_name:'', email:'', department:'Engineering', position:'', phone:'', status:'active' };
  const [form, setForm] = useState(emp ? { ...emp } : blank);
  const [createLogin, setCreateLogin] = useState(canCreateLogin);
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  const set = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault(); setSaving(true); setError('');
    try {
      if (emp?._id || emp?.id) {
        await hrApi.updateEmployee(emp._id ?? emp.id, form);
        onSaved();
        return;
      }

      let credentials = null;
      if (createLogin && canCreateLogin) {
        const account = await usersApi.create({
          email: form.email,
          first_name: form.first_name,
          last_name: form.last_name,
          role: 'EMPLOYEE',
        });
        credentials = {
          email: account.email,
          password: account.temporary_password,
          name: `${account.first_name} ${account.last_name}`,
        };
      }

      await hrApi.createEmployee(form);
      onSaved();
      if (credentials?.password) onCredentials(credentials);
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3>{emp ? 'Edit Employee' : 'Add Employee'}</h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18}/></button>
        </div>
        <form onSubmit={submit} style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <div className="grid-2">
            <div className="form-group"><label className="form-label">First Name</label><input name="first_name" className="form-input" value={form.first_name} onChange={set} required /></div>
            <div className="form-group"><label className="form-label">Last Name</label><input name="last_name" className="form-input" value={form.last_name} onChange={set} required /></div>
          </div>
          <div className="form-group"><label className="form-label">Email</label><input name="email" type="email" className="form-input" value={form.email} onChange={set} required /></div>
          <div className="grid-2">
            <div className="form-group"><label className="form-label">Department</label>
              <select name="department" className="form-select" value={form.department} onChange={set}>
                {Object.keys(DEPT_COLORS).map(d => <option key={d}>{d}</option>)}
              </select>
            </div>
            <div className="form-group"><label className="form-label">Position</label><input name="position" className="form-input" value={form.position} onChange={set} /></div>
          </div>
          <div className="grid-2">
            <div className="form-group"><label className="form-label">Phone</label><input name="phone" className="form-input" value={form.phone} onChange={set} /></div>
            <div className="form-group"><label className="form-label">Status</label>
              <select name="status" className="form-select" value={form.status} onChange={set}>
                <option value="active">Active</option><option value="inactive">Inactive</option><option value="on_leave">On Leave</option>
              </select>
            </div>
          </div>
          {!emp && canCreateLogin && (
            <label style={{ display:'flex', alignItems:'center', gap:8, fontSize:13, cursor:'pointer' }}>
              <input type="checkbox" checked={createLogin} onChange={(e) => setCreateLogin(e.target.checked)} />
              Create login account and generate password for this employee
            </label>
          )}
          {error && <div style={{ color:'var(--danger)', fontSize:12 }}>{error}</div>}
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving...' : emp ? 'Save Employee' : createLogin ? 'Create employee & account' : 'Save Employee'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function HRPage() {
  const { hasPermission } = useAuth();
  const canWrite = hasPermission('hr:write');
  const canCreateLogin = hasPermission('users:write');
  const [employees, setEmployees] = useState([]);
  const [filtered,  setFiltered]  = useState([]);
  const [search,    setSearch]    = useState('');
  const [loading,   setLoading]   = useState(true);
  const [modal,     setModal]     = useState(null);
  const [credentials, setCredentials] = useState(null);

  const load = async () => {
    setLoading(true);
    try { const data = await hrApi.employees(); setEmployees(data); setFiltered(data); }
    catch { setEmployees([]); setFiltered([]); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(employees.filter(e =>
      `${e.first_name} ${e.last_name} ${e.email} ${e.department} ${e.position}`.toLowerCase().includes(q)
    ));
  }, [search, employees]);

  const del = async (id) => {
    if (!confirm('Delete this employee?')) return;
    await hrApi.deleteEmployee(id); load();
  };

  const initials = e => `${e.first_name?.[0]??''}${e.last_name?.[0]??''}`.toUpperCase();

  return (
    <AppLayout pageTitle="HR & People">
      <div className="page-header">
        <div className="page-header-left">
          <h1>HR & People</h1>
          <p>{canWrite ? 'Manage employees, attendance and leave requests' : 'View colleagues across your organisation'}</p>
        </div>
        {canWrite && (
          <button className="btn btn-primary" onClick={() => setModal('add')}>
            <Plus size={16}/> {canCreateLogin ? 'Add Employee & Account' : 'Add Employee'}
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid-4" style={{ marginBottom: 24 }}>
        {[
          { label:'Total', val: employees.length, color:'var(--primary)' },
          { label:'Active', val: employees.filter(e=>e.status==='active').length, color:'var(--success)' },
          { label:'On Leave', val: employees.filter(e=>e.status==='on_leave').length, color:'var(--warning)' },
          { label:'Inactive', val: employees.filter(e=>e.status==='inactive').length, color:'var(--danger)' },
        ].map(s => (
          <div key={s.label} className="card" style={{ display:'flex', alignItems:'center', gap:16 }}>
            <div style={{ fontSize:28, fontWeight:800, color:s.color }}>{s.val}</div>
            <div style={{ color:'var(--text-secondary)', fontSize:13 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="card" style={{ padding:0 }}>
        <div style={{ padding:'16px 20px', borderBottom:'1px solid var(--border)', display:'flex', gap:12, alignItems:'center' }}>
          <div style={{ position:'relative', flex:1 }}>
            <Search size={14} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)' }}/>
            <input className="form-input" style={{ paddingLeft:32 }} placeholder="Search employees..." value={search} onChange={e=>setSearch(e.target.value)} />
          </div>
        </div>
        {loading ? (
          <div className="empty-state"><div className="spinner" style={{width:32,height:32}}/></div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <p>No employees found</p>
            {canWrite && (
              <button className="btn btn-primary" onClick={()=>setModal('add')}><Plus size={14}/> Add First Employee</button>
            )}
          </div>
        ) : (
          <table className="data-table">
            <thead><tr><th>Employee</th><th>Department</th><th>Position</th><th>Status</th>{canWrite && <th>Actions</th>}</tr></thead>
            <tbody>
              {filtered.map(e => {
                const id = e._id ?? e.id;
                const deptColor = DEPT_COLORS[e.department] || 'var(--primary)';
                return (
                  <tr key={id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="avatar avatar-sm" style={{ background: deptColor, color:'#fff' }}>{initials(e)}</div>
                        <div>
                          <div style={{ fontWeight:600, color:'var(--text-primary)', fontSize:13 }}>{e.first_name} {e.last_name}</div>
                          <div style={{ fontSize:11, color:'var(--text-muted)' }}>{e.email}</div>
                        </div>
                      </div>
                    </td>
                    <td><span className="chip" style={{ borderColor: deptColor, color: deptColor }}>{e.department}</span></td>
                    <td>{e.position || '—'}</td>
                    <td><span className={`badge ${STATUS_BADGE[e.status] || 'badge-gray'}`}>{e.status?.replace('_',' ')}</span></td>
                    {canWrite && (
                      <td>
                        <div className="flex gap-2">
                          <button className="btn btn-ghost btn-icon btn-sm" onClick={()=>setModal(e)} title="Edit"><Edit2 size={14}/></button>
                          <button className="btn btn-danger btn-icon btn-sm" onClick={()=>del(id)} title="Delete"><Trash2 size={14}/></button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <EmployeeModal
          emp={modal === 'add' ? null : modal}
          canCreateLogin={canCreateLogin}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); load(); }}
          onCredentials={setCredentials}
        />
      )}

      {credentials && (
        <CredentialsModal
          email={credentials.email}
          password={credentials.password}
          name={credentials.name}
          onClose={() => setCredentials(null)}
        />
      )}
    </AppLayout>
  );
}
