import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Cpu, Mail, Lock, User, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate     = useNavigate();
  const [form, setForm] = useState({
    first_name: '',
    last_name:  '',
    email:      '',
    password:   '',
    confirm:    '',
  });
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm) {
      setError('Passwords do not match.');
      return;
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    try {
      await register({
        first_name: form.first_name,
        last_name:  form.last_name,
        email:      form.email,
        password:   form.password,
      });
      navigate('/');
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
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
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Enterprise Platform</div>
          </div>
        </div>

        <h2 style={{ marginBottom: 6 }}>Create account</h2>
        <p style={{ marginBottom: 28, fontSize: 13 }}>Register as an employee to get started</p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">First name</label>
              <div style={{ position: 'relative' }}>
                <User size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input name="first_name" className="form-input" style={{ paddingLeft: 36 }} value={form.first_name} onChange={handleChange} required />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Last name</label>
              <input name="last_name" className="form-input" value={form.last_name} onChange={handleChange} required />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Email address</label>
            <div style={{ position: 'relative' }}>
              <Mail size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input name="email" type="email" className="form-input" style={{ paddingLeft: 36 }} value={form.email} onChange={handleChange} placeholder="you@company.com" required autoComplete="email" />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input name="password" type={showPw ? 'text' : 'password'} className="form-input" style={{ paddingLeft: 36, paddingRight: 36 }} value={form.password} onChange={handleChange} required autoComplete="new-password" />
              <button type="button" onClick={() => setShowPw((v) => !v)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Confirm password</label>
            <input name="confirm" type="password" className="form-input" value={form.confirm} onChange={handleChange} required autoComplete="new-password" />
          </div>

          {error && (
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '10px 14px', color: 'var(--danger)', fontSize: 13 }}>
              {error}
            </div>
          )}

          <button type="submit" className="btn btn-primary w-full" disabled={loading} style={{ justifyContent: 'center', marginTop: 4 }}>
            {loading ? <span className="spinner" style={{ width: 16, height: 16 }} /> : <>Create account <ArrowRight size={15} /></>}
          </button>
        </form>

        <p style={{ marginTop: 20, fontSize: 13, textAlign: 'center', color: 'var(--text-secondary)' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: 'var(--accent)', fontWeight: 600 }}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}
