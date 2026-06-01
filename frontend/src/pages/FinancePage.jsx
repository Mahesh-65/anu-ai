import { useEffect, useState } from 'react';
import { Plus, Search, DollarSign, TrendingUp, TrendingDown, Receipt, X } from 'lucide-react';
import AppLayout from '../components/AppLayout';
import { financeApi } from '../api/client';

const CATEGORY_COLORS = { Salary:'var(--primary)', Operations:'var(--secondary)', Marketing:'var(--pink)', Travel:'var(--warning)', Equipment:'var(--purple)', Other:'var(--text-muted)' };

function ExpenseModal({ onClose, onSaved }) {
  const [form, setForm] = useState({ title:'', amount:'', category:'Operations', date: new Date().toISOString().slice(0,10), notes:'' });
  const [saving, setSaving] = useState(false);
  const set = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault(); setSaving(true);
    try { await financeApi.createExpense({ ...form, amount: parseFloat(form.amount) }); onSaved(); }
    catch {}
    finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target===e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header"><h3>New Expense</h3><button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18}/></button></div>
        <form onSubmit={submit} style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <div className="form-group"><label className="form-label">Title</label><input name="title" className="form-input" value={form.title} onChange={set} required /></div>
          <div className="grid-2">
            <div className="form-group"><label className="form-label">Amount ($)</label><input name="amount" type="number" step="0.01" className="form-input" value={form.amount} onChange={set} required /></div>
            <div className="form-group"><label className="form-label">Category</label>
              <select name="category" className="form-select" value={form.category} onChange={set}>
                {Object.keys(CATEGORY_COLORS).map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div className="form-group"><label className="form-label">Date</label><input name="date" type="date" className="form-input" value={form.date} onChange={set} /></div>
          <div className="form-group"><label className="form-label">Notes</label><textarea name="notes" className="form-textarea" value={form.notes} onChange={set} /></div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Add Expense'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function InvoiceModal({ onClose, onSaved }) {
  const [form, setForm] = useState({ client_name:'', amount:'', due_date:'', status:'pending', description:'' });
  const [saving, setSaving] = useState(false);
  const set = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault(); setSaving(true);
    try { await financeApi.createInvoice({ ...form, amount: parseFloat(form.amount) }); onSaved(); }
    catch {}
    finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target===e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header"><h3>New Invoice</h3><button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18}/></button></div>
        <form onSubmit={submit} style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <div className="form-group"><label className="form-label">Client Name</label><input name="client_name" className="form-input" value={form.client_name} onChange={set} required /></div>
          <div className="grid-2">
            <div className="form-group"><label className="form-label">Amount ($)</label><input name="amount" type="number" step="0.01" className="form-input" value={form.amount} onChange={set} required /></div>
            <div className="form-group"><label className="form-label">Status</label>
              <select name="status" className="form-select" value={form.status} onChange={set}>
                <option value="pending">Pending</option><option value="paid">Paid</option><option value="overdue">Overdue</option>
              </select>
            </div>
          </div>
          <div className="form-group"><label className="form-label">Due Date</label><input name="due_date" type="date" className="form-input" value={form.due_date} onChange={set} /></div>
          <div className="form-group"><label className="form-label">Description</label><textarea name="description" className="form-textarea" value={form.description} onChange={set} /></div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Creating...' : 'Create Invoice'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function FinancePage() {
  const [tab,      setTab]      = useState('expenses');
  const [expenses, setExpenses] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [summary,  setSummary]  = useState(null);
  const [search,   setSearch]   = useState('');
  const [loading,  setLoading]  = useState(true);
  const [modal,    setModal]    = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const [e, i, s] = await Promise.allSettled([financeApi.expenses(), financeApi.invoices(), financeApi.summary()]);
      setExpenses(e.value ?? []);
      setInvoices(i.value ?? []);
      setSummary(s.value ?? null);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const fmt = n => `$${(n||0).toLocaleString('en-US', { minimumFractionDigits:2 })}`;

  const filteredExp = expenses.filter(e => `${e.title} ${e.category}`.toLowerCase().includes(search.toLowerCase()));
  const filteredInv = invoices.filter(i => `${i.client_name} ${i.description}`.toLowerCase().includes(search.toLowerCase()));

  return (
    <AppLayout pageTitle="Finance">
      <div className="page-header">
        <div className="page-header-left">
          <h1>Finance</h1>
          <p>Manage expenses, invoices and budgets</p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-secondary" onClick={()=>setModal('invoice')}><Receipt size={15}/> New Invoice</button>
          <button className="btn btn-primary"   onClick={()=>setModal('expense')}><Plus size={15}/> Log Expense</button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid-4" style={{ marginBottom: 24 }}>
        {[
          { label:'Total Expenses',  val: fmt(summary?.total_expenses),   color:'var(--danger)',   icon: TrendingDown },
          { label:'Total Revenue',   val: fmt(summary?.total_revenue),    color:'var(--success)',  icon: TrendingUp },
          { label:'Pending Invoices',val: summary?.pending_invoices ?? 0, color:'var(--warning)',  icon: Receipt },
          { label:'Net Balance',     val: fmt((summary?.total_revenue||0)-(summary?.total_expenses||0)), color:'var(--primary)', icon: DollarSign },
        ].map(s => (
          <div key={s.label} className="card" style={{ display:'flex', gap:16, alignItems:'center' }}>
            <div style={{ width:44, height:44, borderRadius:'var(--radius-md)', background:`rgba(0,0,0,0.2)`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <s.icon size={20} style={{ color: s.color }}/>
            </div>
            <div>
              <div style={{ fontSize:20, fontWeight:800, color: s.color }}>{s.val}</div>
              <div style={{ fontSize:12, color:'var(--text-secondary)' }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:4, marginBottom:20, background:'var(--bg-card)', padding:4, borderRadius:'var(--radius-md)', width:'fit-content' }}>
        {['expenses','invoices'].map(t => (
          <button key={t} className={`btn ${tab===t?'btn-primary':'btn-ghost'}`} style={{ textTransform:'capitalize' }} onClick={()=>setTab(t)}>{t}</button>
        ))}
      </div>

      <div className="card" style={{ padding:0 }}>
        <div style={{ padding:'16px 20px', borderBottom:'1px solid var(--border)', display:'flex', gap:12 }}>
          <div style={{ position:'relative', flex:1 }}>
            <Search size={14} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)' }}/>
            <input className="form-input" style={{ paddingLeft:32 }} placeholder={`Search ${tab}...`} value={search} onChange={e=>setSearch(e.target.value)} />
          </div>
        </div>

        {loading ? (
          <div className="empty-state"><div className="spinner" style={{width:32,height:32}}/></div>
        ) : tab === 'expenses' ? (
          filteredExp.length === 0 ? <div className="empty-state"><p>No expenses found</p></div> :
          <table className="data-table">
            <thead><tr><th>Title</th><th>Category</th><th>Amount</th><th>Date</th></tr></thead>
            <tbody>
              {filteredExp.map(e => (
                <tr key={e._id??e.id}>
                  <td style={{ color:'var(--text-primary)', fontWeight:500 }}>{e.title}</td>
                  <td><span className="chip" style={{ color: CATEGORY_COLORS[e.category]||'var(--text-muted)', borderColor: CATEGORY_COLORS[e.category]||'var(--border)' }}>{e.category}</span></td>
                  <td style={{ color:'var(--danger)', fontWeight:600 }}>{fmt(e.amount)}</td>
                  <td>{e.date ? new Date(e.date).toLocaleDateString() : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          filteredInv.length === 0 ? <div className="empty-state"><p>No invoices found</p></div> :
          <table className="data-table">
            <thead><tr><th>Client</th><th>Amount</th><th>Status</th><th>Due Date</th></tr></thead>
            <tbody>
              {filteredInv.map(i => (
                <tr key={i._id??i.id}>
                  <td style={{ color:'var(--text-primary)', fontWeight:500 }}>{i.client_name}</td>
                  <td style={{ color:'var(--success)', fontWeight:600 }}>{fmt(i.amount)}</td>
                  <td><span className={`badge ${i.status==='paid'?'badge-success':i.status==='overdue'?'badge-danger':'badge-warning'}`}>{i.status}</span></td>
                  <td>{i.due_date ? new Date(i.due_date).toLocaleDateString() : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal==='expense' && <ExpenseModal onClose={()=>setModal(null)} onSaved={()=>{setModal(null);load();}} />}
      {modal==='invoice' && <InvoiceModal onClose={()=>setModal(null)} onSaved={()=>{setModal(null);load();}} />}
    </AppLayout>
  );
}
