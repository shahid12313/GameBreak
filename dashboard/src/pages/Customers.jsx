import { useEffect, useState } from 'react';
import api, { apiErrorMessage } from '../services/api';
import Modal from '../components/Modal';
import { Loading, ErrorState, EmptyState } from '../components/LoadingState';
import { useToast } from '../components/Toast';

const money = n => 'PKR ' + Math.round(n || 0).toLocaleString('en-US');

export default function Customers() {
  const [list, setList] = useState(null);
  const [q, setQ] = useState('');
  const [err, setErr] = useState('');
  const [adding, setAdding] = useState(false);
  const [detailOf, setDetailOf] = useState(null);
  const toast = useToast();

  function load(query) {
    setErr('');
    api.get('/customers', { params: query ? { q: query } : {} }).then(r => setList(r.data)).catch(e => setErr(apiErrorMessage(e)));
  }
  useEffect(() => load(''), []);
  useEffect(() => { const t = setTimeout(() => load(q), 250); return () => clearTimeout(t); }, [q]);

  async function settle(id) {
    try { await api.post(`/customers/${id}/settle`); toast('Balance settled'); load(q); }
    catch (e) { toast(apiErrorMessage(e), 'err'); }
  }

  return (
    <div>
      <h1 className="page-title">Customers</h1>
      <p className="page-sub">Every customer, every balance</p>
      <div className="headrow">
        <input className="inp" style={{ maxWidth: 320 }} placeholder="Search by name or phone" value={q} onChange={e => setQ(e.target.value)} />
        <button className="btn pri" onClick={() => setAdding(true)}>+ New customer</button>
      </div>
      {err && <ErrorState message={err} onRetry={() => load(q)} />}
      {!err && !list && <Loading />}
      {!err && list && !list.length && <EmptyState>No customers match. Add one with the button above.</EmptyState>}
      {!err && list && list.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 12 }}>
          {list.map(c => (
            <div className="card" key={c._id} style={{ borderTop: `2px solid ${c.due > 0 ? '#ff8a5c' : 'var(--neon)'}`, cursor: 'pointer' }} onClick={() => setDetailOf(c)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <b>{c.name}</b>
                  <div className="c-mut" style={{ fontSize: 11.5 }}>{c.phone || 'No phone on file'} · {c.sessions} session{c.sessions === 1 ? '' : 's'}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  {c.due > 0
                    ? <><small className="c-mut">Due</small><br /><b className="c-red">{money(c.due)}</b><br /><button className="btn sm" style={{ marginTop: 4 }} onClick={e => { e.stopPropagation(); settle(c._id); }}>Settle</button></>
                    : <><small className="c-mut">Paid</small><br /><b className="c-neon">{money(c.paid)}</b></>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {adding && <AddCustomer onClose={() => setAdding(false)} onDone={() => { setAdding(false); load(q); toast('Customer added'); }} />}
      {detailOf && <CustomerDetail customer={detailOf} onClose={() => setDetailOf(null)} />}
    </div>
  );
}

function AddCustomer({ onClose, onDone }) {
  const [name, setName] = useState(''); const [phone, setPhone] = useState(''); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault(); setBusy(true); setErr('');
    try { await api.post('/customers', { name, phone }); onDone(); } catch (ex) { setErr(apiErrorMessage(ex)); } finally { setBusy(false); }
  }
  return (
    <Modal title="New customer" onClose={onClose} footer={<><button className="btn" onClick={onClose}>Cancel</button><button className="btn pri" onClick={submit} disabled={busy}>Add customer</button></>}>
      {err && <p className="err-text">{err}</p>}
      <label className="f"><span>Name</span><input className="inp" required value={name} onChange={e => setName(e.target.value)} /></label>
      <label className="f"><span>Phone (optional)</span><input className="inp" value={phone} onChange={e => setPhone(e.target.value)} /></label>
    </Modal>
  );
}

function CustomerDetail({ customer, onClose }) {
  const [hist, setHist] = useState(null);
  useEffect(() => { api.get(`/customers/${customer._id}/history`).then(r => setHist(r.data)); }, [customer._id]);
  return (
    <Modal title={customer.name} onClose={onClose} footer={<button className="btn" onClick={onClose}>Close</button>}>
      <p className="c-mut">{customer.phone || 'No phone on file'} · {customer.sessions} sessions · paid {money(customer.paid)} · due {money(customer.due)}</p>
      {!hist && <Loading />}
      {hist && (
        <>
          <h3 style={{ fontSize: 13, margin: '14px 0 6px' }}>Recent sessions</h3>
          {hist.sessions.length ? hist.sessions.slice(0, 8).map(s => <div key={s._id} style={{ fontSize: 12.5, padding: '4px 0', borderBottom: '1px solid var(--line)' }}>{s.gameName} · {s.minutes} min · {money(s.total)}</div>) : <p className="c-mut">None yet.</p>}
          <h3 style={{ fontSize: 13, margin: '14px 0 6px' }}>Recent bookings</h3>
          {hist.bookings.length ? hist.bookings.slice(0, 8).map(b => <div key={b._id} style={{ fontSize: 12.5, padding: '4px 0', borderBottom: '1px solid var(--line)' }}>{b.ref} · {b.gameName} · {b.status}</div>) : <p className="c-mut">None yet.</p>}
        </>
      )}
    </Modal>
  );
}
