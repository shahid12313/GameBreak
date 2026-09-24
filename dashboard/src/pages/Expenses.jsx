import { useEffect, useState } from 'react';
import api, { apiErrorMessage } from '../services/api';
import Modal from '../components/Modal';
import { Loading, ErrorState, EmptyState } from '../components/LoadingState';
import { useToast } from '../components/Toast';

const money = n => 'PKR ' + Math.round(n || 0).toLocaleString('en-US');
const CATS = ['Electricity', 'Internet', 'Rent', 'Equipment', 'Maintenance', 'Staff', 'Supplies', 'Other'];

export default function Expenses() {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [list, setList] = useState(null);
  const [err, setErr] = useState('');
  const [adding, setAdding] = useState(false);
  const toast = useToast();

  function load() { setErr(''); api.get('/expenses', { params: { month } }).then(r => setList(r.data)).catch(e => setErr(apiErrorMessage(e))); }
  useEffect(load, [month]);

  async function del(id) { try { await api.delete(`/expenses/${id}`); load(); } catch (e) { toast(apiErrorMessage(e), 'err'); } }
  const total = (list || []).reduce((s, e) => s + e.amount, 0);

  return (
    <div>
      <h1 className="page-title">Expenses</h1>
      <p className="page-sub">Know your real costs</p>
      <div className="headrow">
        <input className="inp" type="month" style={{ width: 'auto' }} value={month} onChange={e => setMonth(e.target.value)} />
        <button className="btn pri" onClick={() => setAdding(true)}>+ Add expense</button>
      </div>
      {err && <ErrorState message={err} onRetry={load} />}
      {!err && !list && <Loading />}
      {!err && list && (
        <>
          <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, borderColor: 'rgba(251,191,36,.3)' }}>
            <span>Total this month</span><b className="c-amber" style={{ fontFamily: 'var(--f-mono)', fontSize: 20 }}>{money(total)}</b>
          </div>
          {!list.length && <EmptyState>No expenses logged for this month.</EmptyState>}
          {list.length > 0 && (
            <div className="card scroll-x">
              <table className="tbl"><thead><tr><th>Description</th><th>Category</th><th>Date</th><th>Amount</th><th></th></tr></thead>
                <tbody>{list.map(e => (
                  <tr key={e._id}><td>{e.description}</td><td><span className="tag mut">{e.category}</span></td><td>{new Date(e.date).toLocaleDateString()}</td>
                    <td className="c-red" style={{ fontFamily: 'var(--f-mono)' }}>{money(e.amount)}</td>
                    <td style={{ textAlign: 'right' }}><button className="btn sm danger" onClick={() => del(e._id)}>✕</button></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </>
      )}
      {adding && <AddExpense onClose={() => setAdding(false)} onDone={() => { setAdding(false); load(); toast('Expense added'); }} />}
    </div>
  );
}

function AddExpense({ onClose, onDone }) {
  const [description, setDescription] = useState(''); const [category, setCategory] = useState('Other');
  const [amount, setAmount] = useState(''); const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault(); setBusy(true); setErr('');
    try { await api.post('/expenses', { description, category, amount: Number(amount), date }); onDone(); } catch (ex) { setErr(apiErrorMessage(ex)); } finally { setBusy(false); }
  }
  return (
    <Modal title="Add expense" onClose={onClose} footer={<><button className="btn" onClick={onClose}>Cancel</button><button className="btn pri" onClick={submit} disabled={busy}>Add expense</button></>}>
      {err && <p className="err-text">{err}</p>}
      <label className="f"><span>Description</span><input className="inp" required value={description} onChange={e => setDescription(e.target.value)} /></label>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <label className="f"><span>Category</span><select className="inp" value={category} onChange={e => setCategory(e.target.value)}>{CATS.map(c => <option key={c}>{c}</option>)}</select></label>
        <label className="f"><span>Amount (PKR)</span><input className="inp" type="number" min={1} required value={amount} onChange={e => setAmount(e.target.value)} /></label>
      </div>
      <label className="f"><span>Date</span><input className="inp" type="date" required value={date} onChange={e => setDate(e.target.value)} /></label>
    </Modal>
  );
}
