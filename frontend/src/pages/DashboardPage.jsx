import { useEffect, useState } from 'react';
import { Users, FolderKanban, DollarSign, Brain, TrendingUp, Activity, CheckCircle, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import AppLayout from '../components/AppLayout';
import { hrApi, projectApi, financeApi, aiApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { isEmployee } from '../utils/roles';

function StatCard({ icon: Icon, label, value, change, up, accent, accentBg }) {
  return (
    <div className="stat-card" style={{ '--accent': accent, '--accent-bg': accentBg }}>
      <div className="flex items-center justify-between">
        <div className="stat-icon"><Icon size={22} /></div>
        {change && (
          <span className={`stat-change ${up ? 'up' : 'down'}`}>
            <TrendingUp size={12} /> {change}
          </span>
        )}
      </div>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

function EmployeeDashboard({ user }) {
  const [projects, setProjects] = useState([]);
  const [aiOnline, setAiOnline] = useState(false);

  useEffect(() => {
    async function load() {
      const [projs, ai] = await Promise.allSettled([projectApi.projects(), aiApi.health()]);
      setProjects(projs.value ?? []);
      setAiOnline(ai.value?.status === 'healthy');
    }
    load();
  }, []);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <AppLayout pageTitle="My Dashboard">
      <div style={{ marginBottom: 28 }}>
        <h1>{greeting()}, {user?.first_name} 👋</h1>
        <p>Your workspace — view assigned projects and use the AI assistant.</p>
      </div>

      <div className="grid-2" style={{ marginBottom: 24 }}>
        <StatCard icon={FolderKanban} label="My Projects" value={projects.length} accent="var(--secondary)" accentBg="rgba(34,211,238,0.15)" />
        <StatCard icon={Brain} label="AI Assistant" value={aiOnline ? 'Available' : 'Offline'} accent="var(--purple)" accentBg="rgba(167,139,250,0.15)" />
      </div>

      <div className="grid-2" style={{ gap: 20 }}>
        <div className="card">
          <div className="card-header"><h3>Quick links</h3></div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Link to="/projects" className="btn btn-secondary" style={{ justifyContent: 'space-between' }}>
              View my projects <ArrowRight size={15} />
            </Link>
            <Link to="/ai" className="btn btn-secondary" style={{ justifyContent: 'space-between' }}>
              Open AI assistant <ArrowRight size={15} />
            </Link>
            <Link to="/settings" className="btn btn-secondary" style={{ justifyContent: 'space-between' }}>
              My profile & settings <ArrowRight size={15} />
            </Link>
          </div>
        </div>

        <div className="card">
          <div className="card-header"><h3>Projects</h3></div>
          {projects.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>No projects assigned yet.</p>
          ) : (
            projects.slice(0, 5).map((p) => (
              <div key={p.id ?? p._id} style={{ padding: '10px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                <div style={{ fontWeight: 600 }}>{p.name ?? p.title}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>{p.status ?? 'active'}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </AppLayout>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();

  if (isEmployee(user?.role)) {
    return <EmployeeDashboard user={user} />;
  }

  const [stats, setStats] = useState({ employees: 0, projects: 0, expenses: 0, aiOnline: false });
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [emps, projs, fin, ai] = await Promise.allSettled([
          hrApi.employees(),
          projectApi.projects(),
          financeApi.summary(),
          aiApi.health(),
        ]);
        setStats({
          employees: emps.value?.length ?? 0,
          projects:  projs.value?.length ?? 0,
          expenses:  fin.value?.total_expenses ?? 0,
          aiOnline:  ai.value?.status === 'healthy',
        });
        setRecentActivity([
          { icon: CheckCircle, color: 'var(--success)', text: 'Employee onboarding completed', time: '2m ago' },
          { icon: Activity,     color: 'var(--primary)', text: 'Sprint planning session started', time: '3h ago' },
        ]);
      } catch {}
      setLoading(false);
    }
    load();
  }, []);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <AppLayout pageTitle="Dashboard">
      <div style={{ marginBottom: 28 }}>
        <h1>{greeting()}, {user?.first_name} 👋</h1>
        <p>Here&apos;s what&apos;s happening across your organisation today.</p>
      </div>

      {loading ? (
        <div className="grid-4" style={{ marginBottom: 24 }}>
          {[...Array(4)].map((_, i) => (
            <div key={i} className="stat-card animate-pulse" style={{ height: 140, background: 'var(--bg-hover)' }} />
          ))}
        </div>
      ) : (
        <div className="grid-4" style={{ marginBottom: 24 }}>
          <StatCard icon={Users}        label="Total Employees"  value={stats.employees} change="+12%" up accent="var(--primary)"  accentBg="var(--primary-glow)" />
          <StatCard icon={FolderKanban} label="Active Projects"  value={stats.projects}  change="+3%"  up accent="var(--secondary)" accentBg="rgba(34,211,238,0.15)" />
          <StatCard icon={DollarSign}   label="Total Expenses"   value={`$${(stats.expenses/1000).toFixed(1)}k`} change="-5%" accent="var(--warning)" accentBg="rgba(245,158,11,0.15)" />
          <StatCard icon={Brain}        label="AI Status"        value={stats.aiOnline ? 'Online' : 'Offline'} change="Live" up={stats.aiOnline} accent="var(--purple)" accentBg="rgba(167,139,250,0.15)" />
        </div>
      )}

      <div className="card">
        <div className="card-header"><h3>Recent Activity</h3></div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {recentActivity.map((a, i) => (
            <div key={i} className="flex items-center gap-3">
              <a.icon size={16} style={{ color: a.color, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12.5, color: 'var(--text-primary)' }} className="truncate">{a.text}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{a.time}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
