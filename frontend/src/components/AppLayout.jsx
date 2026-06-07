import { NavLink, useNavigate } from 'react-router-dom';
import {
  Cpu, LayoutDashboard, Users, FolderKanban,
  DollarSign, Brain, Settings, LogOut, Bell, Search, UserPlus
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { isEmployee } from '../utils/roles';

const NAV = [
  { section: 'Overview', items: [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  ]},
  { section: 'Management', employeeSection: 'My Work', items: [
    { to: '/hr',       label: 'HR & People',  icon: Users },
    { to: '/projects', label: 'Projects',     icon: FolderKanban,  permission: 'projects:read' },
    { to: '/finance',  label: 'Finance',      icon: DollarSign,  permission: 'finance:read' },
  ]},
  { section: 'Intelligence', employeeSection: 'Tools', items: [
    { to: '/ai', label: 'AI Assistant', icon: Brain, permission: 'ai:chat' },
  ]},
  { section: 'Admin', employeeSection: 'Directory', items: [
    { to: '/users', label: 'Team Directory', icon: UserPlus },
    { to: '/settings', label: 'Settings', icon: Settings },
  ]},
];

function avatarColor(name = '') {
  const colors = ['#6366f1','#22d3ee','#10b981','#f59e0b','#ec4899','#a78bfa','#f97316'];
  return colors[name.charCodeAt(0) % colors.length];
}

export default function AppLayout({ children, pageTitle }) {
  const { user, logout, hasPermission } = useAuth();
  const navigate = useNavigate();
  const employee = isEmployee(user?.role);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const initials = user ? `${user.first_name?.[0] ?? ''}${user.last_name?.[0] ?? ''}`.toUpperCase() : 'U';
  const bg = avatarColor(user?.first_name ?? '');

  const visibleNav = NAV.map((section) => ({
    ...section,
    section: employee && section.employeeSection ? section.employeeSection : section.section,
    items: section.items.filter((item) => {
      if (item.to === '/settings' || item.to === '/hr' || item.to === '/users') return true;
      return !item.permission || hasPermission(item.permission);
    }),
  })).filter((section) => section.items.length > 0);

  return (
    <div className={`app-shell ${employee ? 'employee-shell' : ''}`}>
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon"><Cpu size={18} /></div>
          <div>
            <div className="sidebar-logo-text">Organi<span>Station</span></div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
              {employee ? 'Employee Portal' : 'Admin Portal'}
            </div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {visibleNav.map((section) => (
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
          <div style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 10px', borderRadius:'var(--radius-md)' }}>
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

      <header className="topbar">
        <span className="topbar-title">{pageTitle}</span>
        <div className="topbar-actions">
          {!employee && (
            <div style={{ position:'relative' }}>
              <Search size={14} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)' }} />
              <input
                className="form-input"
                style={{ paddingLeft:32, width:220, height:34, background:'var(--bg-base)' }}
                placeholder="Search..."
              />
            </div>
          )}
          <button className="btn btn-ghost btn-icon"><Bell size={17} /></button>
          <div className="avatar avatar-sm" style={{ background: bg, color:'#fff' }}>{initials}</div>
        </div>
      </header>

      <main className="main-content">
        {children}
      </main>
    </div>
  );
}
