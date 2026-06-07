import { useEffect, useState } from 'react';
import { Plus, Search, Edit2, Trash2, X, Shield } from 'lucide-react';
import AppLayout from '../components/AppLayout';
import CredentialsModal from '../components/CredentialsModal';
import { usersApi, rolesApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { creatableRoles, canManageUser, isHiddenUser } from '../utils/roles';

const ROLE_COLOR = { SUPER_ADMIN:'var(--danger)', ORG_ADMIN:'var(--primary)', HR_MANAGER:'var(--success)', PROJECT_MANAGER:'var(--secondary)', FINANCE_MANAGER:'var(--warning)', EMPLOYEE:'var(--text-muted)' };

function UserModal({ user: u, roles, allowedRoles, onClose, onSaved, onCredentials }) {
  const isNew = !u;
  const defaultRole = allowedRoles.includes('EMPLOYEE') ? 'EMPLOYEE' : allowedRoles[0];
  const [form, setForm] = useState(
    u
      ? { first_name: u.first_name, last_name: u.last_name, role: u.role, status: u.status }
      : { first_name:'', last_name:'', email:'', role: defaultRole ?? 'EMPLOYEE', status:'active' }
  );
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');
  const set = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault(); setSaving(true); setError('');
    try {
      if (u) {
        await usersApi.update(u.id, form);
        onSaved();
      } else {
        const created = await usersApi.create({
          email: form.email,
          first_name: form.first_name,
          last_name: form.last_name,
          role: form.role,
        });
        onSaved();
        if (created.temporary_password) {
          onCredentials({
            email: created.email,
            password: created.temporary_password,
            name: `${created.first_name} ${created.last_name}`,
          });
        }
      }
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  };

  const roleOptions = isNew
    ? roles.filter((r) => allowedRoles.includes(r.name))
    : roles;

  return (
    <div className="modal-overlay" onClick={e => e.target===e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3>{u ? 'Edit User' : 'Create account'}</h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18}/></button>
        </div>
        <form onSubmit={submit} style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <div className="grid-2">
            <div className="form-group"><label className="form-label">First Name</label><input name="first_name" className="form-input" value={form.first_name} onChange={set} required /></div>
            <div className="form-group"><label className="form-label">Last Name</label><input name="last_name" className="form-input" value={form.last_name} onChange={set} required /></div>
          </div>
          {isNew && (
            <div className="form-group">
              <label className="form-label">Email</label>
              <input name="email" type="email" className="form-input" value={form.email} onChange={set} required />
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>A temporary password will be generated automatically.</p>
            </div>
          )}
          <div className="grid-2">
            <div className="form-group"><label className="form-label">Role</label>
              <select name="role" className="form-select" value={form.role} onChange={set} disabled={!!u && allowedRoles.length <= 1}>
                {roleOptions.map(r => <option key={r.name} value={r.name}>{r.name}</option>)}
              </select>
            </div>
            <div className="form-group"><label className="form-label">Status</label>
              <select name="status" className="form-select" value={form.status} onChange={set}>
                <option value="active">Active</option><option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
          {error && <div style={{ color:'var(--danger)', fontSize:12 }}>{error}</div>}
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : isNew ? 'Create account' : 'Save'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function UsersPage() {
  const { user: me, hasPermission } = useAuth();
  const canWrite = hasPermission('users:write');
  const allowedRoles = creatableRoles(me?.role);
  const [users,   setUsers]   = useState([]);
  const [roles,   setRoles]   = useState([]);
  const [search,  setSearch]  = useState('');
  const [loading, setLoading] = useState(true);
  const [modal,   setModal]   = useState(null);
  const [credentials, setCredentials] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const u = await usersApi.list();
      setUsers(u ?? []);
      if (canWrite) {
        try {
          setRoles(await rolesApi.list());
        } catch {
          setRoles([]);
        }
      } else {
        setRoles([]);
      }
    } catch {
      setUsers([]);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [canWrite]);

  const del = async (id) => {
    if (!confirm('Delete this user?')) return;
    await usersApi.remove(id); load();
  };

  const visible = users.filter((u) => !isHiddenUser(u, me?.role));
  const filtered = visible.filter(u => `${u.first_name} ${u.last_name} ${u.email} ${u.role}`.toLowerCase().includes(search.toLowerCase()));
  const roleSummary = roles.length > 0
    ? roles.filter(r => r.name !== 'SUPER_ADMIN' || me?.role === 'SUPER_ADMIN')
    : [...new Set(visible.map(u => u.role))].map(name => ({ name }));

  return (
    <AppLayout pageTitle="Team Directory">
      <div className="page-header">
        <div className="page-header-left">
          <h1>Team Directory</h1>
          <p>{canWrite ? 'Create and manage login accounts for your organisation' : 'View team members and their roles'}</p>
        </div>
        {canWrite && allowedRoles.length > 0 && (
          <button className="btn btn-primary" onClick={() => setModal('new')}><Plus size={16}/> Create account</button>
        )}
      </div>

      <div style={{ display:'flex', gap:10, flexWrap:'wrap', marginBottom:24 }}>
        {roleSummary.map(r => (
          <div key={r.name} style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 14px', background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:99, fontSize:12 }}>
            <Shield size={12} style={{ color: ROLE_COLOR[r.name] || 'var(--text-muted)' }}/>
            <span style={{ color: ROLE_COLOR[r.name] || 'var(--text-secondary)', fontWeight:600 }}>{r.name}</span>
            <span style={{ color:'var(--text-muted)' }}>{visible.filter(u=>u.role===r.name).length} users</span>
          </div>
        ))}
      </div>

      <div className="card" style={{ padding:0 }}>
        <div style={{ padding:'16px 20px', borderBottom:'1px solid var(--border)', display:'flex', gap:12 }}>
          <div style={{ position:'relative', flex:1 }}>
            <Search size={14} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)' }}/>
            <input className="form-input" style={{ paddingLeft:32 }} placeholder="Search users..." value={search} onChange={e=>setSearch(e.target.value)} />
          </div>
        </div>

        {loading ? (
          <div className="empty-state"><div className="spinner" style={{width:32,height:32}}/></div>
        ) : (
          <table className="data-table">
            <thead><tr><th>User</th><th>Role</th><th>Status</th>{canWrite && <th>Actions</th>}</tr></thead>
            <tbody>
              {filtered.map(u => {
                const rc = ROLE_COLOR[u.role] || 'var(--text-muted)';
                const isSelf = u.id === me?.id;
                const initials = `${u.first_name?.[0]??''}${u.last_name?.[0]??''}`.toUpperCase();
                return (
                  <tr key={u.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="avatar avatar-sm" style={{ background: rc, color:'#fff' }}>{initials}</div>
                        <div>
                          <div style={{ fontWeight:600, color:'var(--text-primary)', fontSize:13 }}>{u.first_name} {u.last_name} {isSelf && <span style={{ fontSize:10, color:'var(--primary)' }}>(you)</span>}</div>
                          <div style={{ fontSize:11, color:'var(--text-muted)' }}>{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td><span className="badge" style={{ background:`${rc}22`, color:rc }}><Shield size={10}/>{u.role}</span></td>
                    <td><span className={`badge ${u.status==='active'?'badge-success':'badge-gray'}`}>{u.status}</span></td>
                    {canWrite && (
                      <td>
                        <div className="flex gap-2">
                          {canManageUser(me?.role, u.role) && (
                            <button className="btn btn-ghost btn-icon btn-sm" onClick={()=>setModal(u)}><Edit2 size={14}/></button>
                          )}
                          {!isSelf && canManageUser(me?.role, u.role) && (
                            <button className="btn btn-danger btn-icon btn-sm" onClick={()=>del(u.id)}><Trash2 size={14}/></button>
                          )}
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
        <UserModal
          user={modal === 'new' ? null : modal}
          roles={roles}
          allowedRoles={allowedRoles}
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
