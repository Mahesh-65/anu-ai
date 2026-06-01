import { useEffect, useState } from 'react';
import { Users, FolderKanban, DollarSign, Brain, TrendingUp, TrendingDown, Activity, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import AppLayout from '../components/AppLayout';
import { hrApi, projectApi, financeApi, aiApi } from '../api/client';
import { useAuth } from '../context/AuthContext';

function StatCard({ icon: Icon, label, value, change, up, accent, accentBg }) {
  return (
    <div className="stat-card" style={{ '--accent': accent, '--accent-bg': accentBg }}>
      <div className="flex items-center justify-between">
        <div className="stat-icon"><Icon size={22} /></div>
        <span className={`stat-change ${up ? 'up' : 'down'}`}>
          {up ? <TrendingUp size={12} /> : <TrendingDown size={12} />} {change}
        </span>
      </div>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
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
          { icon: Clock,        color: 'var(--warning)', text: 'Leave request pending approval', time: '15m ago' },
          { icon: AlertCircle,  color: 'var(--danger)',  text: 'Invoice overdue — Client ABC',   time: '1h ago' },
          { icon: Activity,     color: 'var(--primary)', text: 'Sprint planning session started', time: '3h ago' },
          { icon: CheckCircle,  color: 'var(--success)', text: 'Budget report approved',         time: '5h ago' },
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
      {/* Welcome */}
      <div style={{ marginBottom: 28 }}>
        <h1>{greeting()}, {user?.first_name} 👋</h1>
        <p>Here's what's happening across your enterprise today.</p>
      </div>

      {/* Stats */}
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
          <StatCard icon={Brain}        label="AI Status"        value={stats.aiOnline ? 'Online' : 'Offline'} change="Groq" up={stats.aiOnline} accent="var(--purple)" accentBg="rgba(167,139,250,0.15)" />
        </div>
      )}

      {/* Lower grid */}
      <div className="grid-2-1" style={{ gap: 20 }}>
        {/* Project progress */}
        <div className="card">
          <div className="card-header">
            <h3>Project Overview</h3>
            <span className="badge badge-primary">Active</span>
          </div>
          {[
            { name: 'ERP Migration',     prog: 72, color: 'var(--primary)' },
            { name: 'Mobile App v2',     prog: 55, color: 'var(--secondary)' },
            { name: 'AI Document Portal',prog: 88, color: 'var(--success)' },
            { name: 'HR System Upgrade', prog: 30, color: 'var(--warning)' },
          ].map(p => (
            <div key={p.name} style={{ marginBottom: 18 }}>
              <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
                <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>{p.name}</span>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{p.prog}%</span>
              </div>
              <div className="progress-bar">
                <div className="progress-bar-fill" style={{ width: `${p.prog}%`, background: p.color }} />
              </div>
            </div>
          ))}
        </div>

        {/* Recent Activity */}
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
      </div>
    </AppLayout>
  );
}
