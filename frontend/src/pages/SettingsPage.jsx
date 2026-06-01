import { useState } from 'react';
import { Save, Bell, Shield, Database, Cpu, User } from 'lucide-react';
import AppLayout from '../components/AppLayout';
import { useAuth } from '../context/AuthContext';

export default function SettingsPage() {
  const { user } = useAuth();
  const [saved, setSaved] = useState(false);
  const [profile, setProfile] = useState({ first_name: user?.first_name??'', last_name: user?.last_name??'', email: user?.email??'' });

  const save = (e) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const sections = [
    { id:'profile', icon: User,     label:'Profile' },
    { id:'security',icon: Shield,   label:'Security' },
    { id:'system',  icon: Cpu,      label:'System' },
  ];
  const [tab, setTab] = useState('profile');

  return (
    <AppLayout pageTitle="Settings">
      <div className="page-header">
        <div className="page-header-left">
          <h1>Settings</h1>
          <p>Manage your account and system preferences</p>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'200px 1fr', gap:20 }}>
        {/* Sidebar */}
        <div className="card" style={{ padding:8, alignSelf:'start' }}>
          {sections.map(s => (
            <button key={s.id} className={`nav-item w-full ${tab===s.id?'active':''}`} style={{ textAlign:'left', cursor:'pointer', background:'transparent', border:'none' }}
              onClick={()=>setTab(s.id)}>
              <s.icon size={16}/>{s.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div>
          {tab === 'profile' && (
            <div className="card">
              <div className="card-header"><h3>Profile Information</h3></div>
              <form onSubmit={save} style={{ display:'flex', flexDirection:'column', gap:16 }}>
                <div className="grid-2">
                  <div className="form-group"><label className="form-label">First Name</label><input className="form-input" value={profile.first_name} onChange={e=>setProfile(p=>({...p,first_name:e.target.value}))} /></div>
                  <div className="form-group"><label className="form-label">Last Name</label><input className="form-input" value={profile.last_name} onChange={e=>setProfile(p=>({...p,last_name:e.target.value}))} /></div>
                </div>
                <div className="form-group"><label className="form-label">Email</label><input type="email" className="form-input" value={profile.email} onChange={e=>setProfile(p=>({...p,email:e.target.value}))} disabled /></div>
                <div className="form-group">
                  <label className="form-label">Role</label>
                  <div style={{ padding:'10px 14px', background:'var(--bg-base)', border:'1px solid var(--border)', borderRadius:'var(--radius-md)', fontSize:13, color:'var(--text-secondary)' }}>
                    {user?.role}
                  </div>
                </div>
                <div>
                  <button type="submit" className="btn btn-primary">{saved ? '✓ Saved!' : <><Save size={15}/> Save Changes</>}</button>
                </div>
              </form>
            </div>
          )}

          {tab === 'security' && (
            <div className="card">
              <div className="card-header"><h3>Security Settings</h3></div>
              <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
                <div className="form-group"><label className="form-label">Current Password</label><input type="password" className="form-input" placeholder="••••••••"/></div>
                <div className="form-group"><label className="form-label">New Password</label><input type="password" className="form-input" placeholder="Min 6 characters"/></div>
                <div className="form-group"><label className="form-label">Confirm Password</label><input type="password" className="form-input" placeholder="Repeat new password"/></div>
                <div><button className="btn btn-primary"><Shield size={15}/> Update Password</button></div>
              </div>
            </div>
          )}

          {tab === 'system' && (
            <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
              <div className="card">
                <div className="card-header"><h3>AI Service</h3></div>
                <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                  {[
                    { label:'LLM Provider', value:'Groq' },
                    { label:'Model',        value:'llama-3.3-70b-versatile' },
                    { label:'Vector DB',    value:'ChromaDB' },
                    { label:'Embedding',    value:'text-embedding-004' },
                  ].map(r => (
                    <div key={r.label} style={{ display:'flex', justifyContent:'space-between', padding:'10px 0', borderBottom:'1px solid var(--border)' }}>
                      <span style={{ color:'var(--text-secondary)', fontSize:13 }}>{r.label}</span>
                      <span style={{ color:'var(--text-primary)', fontWeight:600, fontSize:13 }}>{r.value}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="card">
                <div className="card-header"><h3>Services Status</h3></div>
                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  {[
                    { name:'Gateway',            port:3000, color:'var(--success)' },
                    { name:'Auth Service',        port:8001, color:'var(--success)' },
                    { name:'AI Service',          port:8000, color:'var(--success)' },
                    { name:'HR Service',          port:8002, color:'var(--warning)' },
                    { name:'Project Service',     port:8003, color:'var(--warning)' },
                    { name:'Finance Service',     port:8004, color:'var(--warning)' },
                  ].map(s => (
                    <div key={s.name} style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                      <span style={{ fontSize:13, color:'var(--text-secondary)' }}>{s.name} :{s.port}</span>
                      <span style={{ fontSize:12, color:s.color, fontWeight:600 }}>● {s.color==='var(--success)'?'Running':'Starting'}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
