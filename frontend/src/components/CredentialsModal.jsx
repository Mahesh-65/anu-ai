import { Copy, Check, X } from 'lucide-react';
import { useState } from 'react';

export default function CredentialsModal({ email, password, name, onClose }) {
  const [copied, setCopied] = useState(false);
  const text = `OrganiStation login\nName: ${name}\nEmail: ${email}\nPassword: ${password}`;

  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 440 }}>
        <div className="modal-header">
          <h3>Account created</h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
          Share these credentials with <strong>{name}</strong>. They should change their password after first login.
        </p>
        <div style={{ background: 'var(--bg-base)', border: '1px solid var(--border)', borderRadius: 8, padding: 16, fontSize: 13, lineHeight: 1.8 }}>
          <div><span style={{ color: 'var(--text-muted)' }}>Email:</span> <strong>{email}</strong></div>
          <div><span style={{ color: 'var(--text-muted)' }}>Password:</span> <strong style={{ fontFamily: 'monospace' }}>{password}</strong></div>
        </div>
        <div className="modal-footer" style={{ marginTop: 20 }}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>Done</button>
          <button type="button" className="btn btn-primary" onClick={copy}>
            {copied ? <><Check size={15} /> Copied</> : <><Copy size={15} /> Copy credentials</>}
          </button>
        </div>
      </div>
    </div>
  );
}
