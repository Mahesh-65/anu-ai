import { NavLink, useNavigate } from 'react-router-dom';
import {
  Cpu, LayoutDashboard, Users, FolderKanban,
  DollarSign, Brain, Settings, LogOut, ChevronRight,
  Bell, Sun, Moon, Search
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useState } from 'react';

const NAV = [
  { section: 'Overview', items: [
    { to: '/',         label: 'Dashboard',   icon: LayoutDashboard },
  ]},
  { section: 'Management', items: [
    { to: '/hr',       label: 'HR & People', icon: Users },
    { to: '/projects', label: 'Projects',    icon: FolderKanban },
    { to: '/finance',  label: 'Finance',     icon: DollarSign },
  ]},
  { section: 'Intelligence', items: [
    { to: '/ai',       label: 'AI Assistant',icon: Brain },
  ]},
  { section: 'Admin', items: [
    { to: '/users',    label: 'Users',       icon: Users },
    { to: '/settings', label: 'Settings',    icon: Settings },
  ]},
];

function avatarColor(name = '') {
  const colors = ['#6366f1','#22d3ee','#10b981','#f59e0b','#ec4899','#a78bfa','#f97316'];
  return colors[name.charCodeAt(0) % colors.length];
}

export default function AppLayout({ children, pageTitle }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [dark] = useState(true);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const initials = user ? `${user.first_name?.[0] ?? ''}${user.last_name?.[0] ?? ''}`.toUpperCase() : 'U';
  const bg = avatarColor(user?.first_name ?? '');

  return (
    <div className="app-shell">
      {/* ── Sidebar ── */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon"><Cpu size={18} /></div>
          <div className="sidebar-logo-text">Anu <span>AI</span></div>
        </div>

        <nav className="sidebar-nav">
          {NAV.map(section => (
            <div key={section.section}>
              <div className="nav-section-title">{section.section}</div>
              {section.items.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === '/'}
                  className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                >
                  <Icon size={18} />
                  {label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 10px', borderRadius:'var(--radius-md)', cursor:'pointer' }}>
            <div className="avatar avatar-sm" style={{ background: bg, color: '#fff' }}>{initials}</div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:13, fontWeight:600, color:'var(--text-primary)' }} className="truncate">
                {user?.first_name} {user?.last_name}
              </div>
              <div style={{ fontSize:11, color:'var(--text-muted)' }} className="truncate">{user?.role}</div>
            </div>
            <button className="btn btn-ghost btn-icon" onClick={handleLogout} title="Logout">
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Topbar ── */}
      <header className="topbar">
        <span className="topbar-title">{pageTitle}</span>
        <div className="topbar-actions">
          <div style={{ position:'relative' }}>
            <Search size={14} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)' }} />
            <input
              className="form-input"
              style={{ paddingLeft:32, width:220, height:34, background:'var(--bg-base)' }}
              placeholder="Search..."
            />
          </div>
          <button className="btn btn-ghost btn-icon"><Bell size={17} /></button>
          <div className="avatar avatar-sm" style={{ background: bg, color:'#fff', cursor:'pointer' }}>{initials}</div>
        </div>
      </header>

      {/* ── Main ── */}
      <main className="main-content">
        {children}
      </main>
    </div>
  );
}
