import { useEffect, useState } from 'react';
import api, { apiErrorMessage } from '../services/api';
import Modal from '../components/Modal';
import { Loading, ErrorState, EmptyState } from '../components/LoadingState';
import { useToast } from '../components/Toast';

const money = n => 'PKR ' + Math.round(n || 0).toLocaleString('en-US');
const STATUSES = ['all', 'pending', 'confirmed', 'completed', 'cancelled', 'no-show'];

export default function Bookings({ source }) {
  const [list, setList] = useState(null);
  const [filter, setFilter] = useState('all');
  const [err, setErr] = useState('');
  const [adding, setAdding] = useState(false);
  const toast = useToast();

  function load() {
    setErr('');
    api.get('/bookings', { params: filter !== 'all' ? { status: filter } : {} }).then(r => setList(r.data)).catch(e => setErr(apiErrorMessage(e)));
  }
  useEffect(load, [filter]);

  const shown = source === 'web' ? (list || []).filter(b => b.source === 'web') : list;

  async function setStatus(id, status) {
    try { await api.put(`/bookings/${id}/status`, { status }); toast('Updated'); load(); } catch (e) { toast(apiErrorMessage(e), 'err'); }
  }
  async function checkIn(id) {
    try { await api.post(`/bookings/${id}/check-in`); toast('Checked in — session started'); load(); } catch (e) { toast(apiErrorMessage(e), 'err'); }
  }
  async function setPay(id, pay) {
    try { await api.put(`/bookings/${id}/pay`, { pay }); load(); } catch (e) { toast(apiErrorMessage(e), 'err'); }
  }

  return (
    <div>
      <h1 className="page-title">{source === 'web' ? 'Web Bookings' : 'Bookings'}</h1>
      <p className="page-sub">{source === 'web' ? 'Requests customers made online' : 'Every booking, from the website or the counter'}</p>
      <div className="headrow">
        <div className="chips">{STATUSES.map(s => <button key={s} className={`chip${filter === s ? ' on' : ''}`} onClick={() => setFilter(s)}>{s}</button>)}</div>
        <button className="btn pri" onClick={() => setAdding(true)}>+ New booking</button>
      </div>
      {err && <ErrorState message={err} onRetry={load} />}
      {!err && !shown && <Loading />}
      {!err && shown && !shown.length && <EmptyState>No bookings here.</EmptyState>}
      {!err && shown && shown.map(b => (
        <div className="card" key={b._id} style={{ marginBottom: 10, display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <span className="c-mut" style={{ fontFamily: 'var(--f-mono)', fontSize: 11.5 }}>{b.ref}</span>{' '}
            <span className={`tag ${b.status === 'confirmed' ? 'info' : b.status === 'completed' ? 'ok' : b.status === 'cancelled' || b.status === 'no-show' ? 'bad' : 'warn'}`}>{b.status}</span>{' '}
            <span className="c-mut" style={{ fontSize: 11 }}>{b.source === 'web' ? 'website' : 'staff'}</span>
            <div style={{ fontWeight: 600, margin: '4px 0' }}>{b.name}</div>
            <div className="c-mut" style={{ fontSize: 12 }}>{b.gameName} · {new Date(b.t).toLocaleString()} · {b.durationMinutes} min · {money(b.price)} · {b.phone}</div>
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            <select className="inp" style={{ width: 'auto', minHeight: 32, padding: '4px 8px' }} value={b.pay} onChange={e => setPay(b._id, e.target.value)}>
              {['Unpaid', 'Partial', 'Paid'].map(p => <option key={p}>{p}</option>)}
            </select>
            {b.status === 'pending' && <button className="btn sm" onClick={() => setStatus(b._id, 'confirmed')}>Confirm</button>}
            {(b.status === 'confirmed' || b.status === 'pending') && <button className="btn sm pri" onClick={() => checkIn(b._id)}>Check in</button>}
            {['pending', 'confirmed'].includes(b.status) && <button className="btn sm danger" onClick={() => setStatus(b._id, 'cancelled')}>Cancel</button>}
            {b.status === 'confirmed' && <button className="btn sm" onClick={() => setStatus(b._id, 'no-show')}>No-show</button>}
          </div>
        </div>
      ))}
      {adding && <AddBooking onClose={() => setAdding(false)} onDone={() => { setAdding(false); load(); toast('Booking created'); }} />}
    </div>
  );
}

function AddBooking({ onClose, onDone }) {
  const [games, setGames] = useState([]);
  const [name, setName] = useState(''); const [phone, setPhone] = useState('');
  const [gameId, setGameId] = useState(''); const [date, setDate] = useState(''); const [time, setTime] = useState('');
  const [duration, setDuration] = useState(60);
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  useEffect(() => { api.get('/games').then(r => { setGames(r.data); if (r.data[0]) setGameId(r.data[0]._id); }); }, []);
  async function submit(e) {
    e.preventDefault(); setBusy(true); setErr('');
    try {
      await api.post('/bookings', { name, phone, gameId, t: new Date(`${date}T${time}`).toISOString(), durationMinutes: Number(duration) });
      onDone();
    } catch (ex) { setErr(apiErrorMessage(ex)); } finally { setBusy(false); }
  }
  return (
    <Modal title="New booking" onClose={onClose} footer={<><button className="btn" onClick={onClose}>Cancel</button><button className="btn pri" onClick={submit} disabled={busy}>Save booking</button></>}>
      {err && <p className="err-text">{err}</p>}
      <label className="f"><span>Customer name</span><input className="inp" required value={name} onChange={e => setName(e.target.value)} /></label>
      <label className="f"><span>Phone</span><input className="inp" required value={phone} onChange={e => setPhone(e.target.value)} /></label>
      <label className="f"><span>Game</span><select className="inp" value={gameId} onChange={e => setGameId(e.target.value)}>{games.map(g => <option key={g._id} value={g._id}>{g.icon} {g.name}</option>)}</select></label>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <label className="f"><span>Date</span><input className="inp" type="date" required value={date} onChange={e => setDate(e.target.value)} /></label>
        <label className="f"><span>Time</span><input className="inp" type="time" required value={time} onChange={e => setTime(e.target.value)} /></label>
      </div>
      <label className="f"><span>Duration (minutes)</span><input className="inp" type="number" min={15} step={15} value={duration} onChange={e => setDuration(e.target.value)} /></label>
    </Modal>
  );
}
