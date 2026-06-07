import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Cpu, Lock, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../api/client';

export default function ChangePasswordPage() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ current: '', next: '', confirm: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.next.length < 6) {
      setError('New password must be at least 6 characters.');
      return;
    }
    if (form.next !== form.confirm) {
      setError('New passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      const res = await authApi.changePassword(form.current, form.next);
      if (res?.access_token) {
        authApi.setTokens(res.access_token, localStorage.getItem('refresh_token'));
      }
      await refreshUser();
      navigate('/');
    } catch (err) {
      setError(err.message || 'Failed to change password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="sidebar-logo-icon"><Cpu size={18} /></div>
          <div>
            <div className="sidebar-logo-text">Organi<span>Station</span></div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Security</div>
          </div>
        </div>

        <h2 style={{ marginBottom: 6 }}>Change your password</h2>
        <p style={{ marginBottom: 28, fontSize: 13 }}>
          {user?.must_change_password
            ? 'You must set a new password before continuing.'
            : 'Update your account password.'}
        </p>

        <form onSubmit={handleSubmit} autoComplete="off" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="form-group">
            <label className="form-label">Current password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input name="current" type="password" className="form-input" style={{ paddingLeft: 36 }} value={form.current} onChange={handleChange} required autoComplete="current-password" />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">New password</label>
            <input name="next" type="password" className="form-input" value={form.next} onChange={handleChange} required autoComplete="new-password" />
          </div>
          <div className="form-group">
            <label className="form-label">Confirm new password</label>
            <input name="confirm" type="password" className="form-input" value={form.confirm} onChange={handleChange} required autoComplete="new-password" />
          </div>

          {error && (
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '10px 14px', color: 'var(--danger)', fontSize: 13 }}>
              {error}
            </div>
          )}

          <button type="submit" className="btn btn-primary w-full" disabled={loading} style={{ justifyContent: 'center' }}>
            {loading ? <span className="spinner" style={{ width: 16, height: 16 }} /> : <>Save password <ArrowRight size={15} /></>}
          </button>
        </form>
      </div>
    </div>
  );
}
