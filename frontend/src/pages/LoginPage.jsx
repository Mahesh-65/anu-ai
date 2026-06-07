import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Cpu, Mail, Lock, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { login }   = useAuth();
  const navigate    = useNavigate();
  const [form, setForm]       = useState({ email: '', password: '' });
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw]   = useState(false);

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const me = await login(form.email, form.password);
      navigate(me?.must_change_password ? '/change-password' : '/');
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="sidebar-logo-icon">
            <Cpu size={18} />
          </div>
          <div>
            <div className="sidebar-logo-text">Organi<span>Station</span></div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Enterprise Platform</div>
          </div>
        </div>

        <h2 style={{ marginBottom: 6 }}>Welcome back</h2>
        <p style={{ marginBottom: 28, fontSize: 13 }}>Sign in with credentials provided by your administrator</p>

        <form onSubmit={handleSubmit} autoComplete="off" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <div style={{ position: 'relative' }}>
              <Mail size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                id="login-email"
                name="email"
                type="email"
                className="form-input"
                style={{ paddingLeft: 36 }}
                value={form.email}
                onChange={handleChange}
                placeholder="you@company.com"
                required
                autoComplete="off"
                readOnly
                onFocus={(e) => e.target.removeAttribute('readonly')}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                id="login-password"
                name="password"
                type={showPw ? 'text' : 'password'}
                className="form-input"
                style={{ paddingLeft: 36, paddingRight: 36 }}
                value={form.password}
                onChange={handleChange}
                placeholder="••••••••"
                required
                autoComplete="new-password"
                readOnly
                onFocus={(e) => e.target.removeAttribute('readonly')}
              />
              <button
                type="button"
                onClick={() => setShowPw(v => !v)}
                title={showPw ? 'Hide password' : 'Show password'}
                style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {error && (
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '10px 14px', color: 'var(--danger)', fontSize: 13 }}>
              {error}
            </div>
          )}

          <button id="login-submit" type="submit" className="btn btn-primary w-full" disabled={loading} style={{ justifyContent: 'center', marginTop: 4 }}>
            {loading ? <span className="spinner" style={{ width: 16, height: 16 }} /> : <>Sign In <ArrowRight size={15} /></>}
          </button>
        </form>
      </div>
    </div>
  );
}
