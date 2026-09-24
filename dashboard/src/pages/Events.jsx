import { useEffect, useState } from 'react';
import api, { apiErrorMessage } from '../services/api';
import Modal from '../components/Modal';
import { Loading, ErrorState, EmptyState } from '../components/LoadingState';
import { useToast } from '../components/Toast';

const money = n => 'PKR ' + Math.round(n || 0).toLocaleString('en-US');

export default function Events() {
  const [list, setList] = useState(null);
  const [err, setErr] = useState('');
  const [adding, setAdding] = useState(false);
  const [regsOf, setRegsOf] = useState(null);
  const toast = useToast();

  function load() { setErr(''); api.get('/events').then(r => setList(r.data)).catch(e => setErr(apiErrorMessage(e))); }
  useEffect(load, []);

  async function toggleStar(ev) { try { await api.put(`/events/${ev._id}`, { starred: !ev.starred }); load(); } catch (e) { toast(apiErrorMessage(e), 'err'); } }
  async function del(id) { if (!confirm('Delete this event?')) return; try { await api.delete(`/events/${id}`); load(); } catch (e) { toast(apiErrorMessage(e), 'err'); } }

  return (
    <div>
      <h1 className="page-title">Events</h1>
      <p className="page-sub">Tournaments and watch parties shown on the public site</p>
      <div className="headrow"><span /><button className="btn pri" onClick={() => setAdding(true)}>+ New event</button></div>
      {err && <ErrorState message={err} onRetry={load} />}
      {!err && !list && <Loading />}
      {!err && list && !list.length && <EmptyState>No events yet.</EmptyState>}
      {!err && list && list.map(ev => (
        <div className="card" key={ev._id} style={{ marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div>
            <b>{ev.title}</b> <span className="tag info">{ev.kind}</span> {ev.starred && <span className="tag warn">★ featured</span>}
            <div className="c-mut" style={{ fontSize: 12 }}>{new Date(ev.t).toLocaleString()} · {ev.fee ? money(ev.fee) : 'free entry'}{ev.maxParticipants ? ` · cap ${ev.maxParticipants}` : ''}</div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="btn sm" onClick={() => setRegsOf(ev)}>Registrations</button>
            <button className="btn sm" onClick={() => toggleStar(ev)}>{ev.starred ? 'Unfeature' : 'Feature'}</button>
            <button className="btn sm danger" onClick={() => del(ev._id)}>Delete</button>
          </div>
        </div>
      ))}
      {adding && <AddEvent onClose={() => setAdding(false)} onDone={() => { setAdding(false); load(); toast('Event created'); }} />}
      {regsOf && <Registrations event={regsOf} onClose={() => setRegsOf(null)} />}
    </div>
  );
}

function AddEvent({ onClose, onDone }) {
  const [title, setTitle] = useState(''); const [kind, setKind] = useState('tournament');
  const [date, setDate] = useState(''); const [time, setTime] = useState(''); const [fee, setFee] = useState(0); const [max, setMax] = useState('');
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault(); setBusy(true); setErr('');
    try { await api.post('/events', { title, kind, t: new Date(`${date}T${time}`).toISOString(), fee: Number(fee) || 0, maxParticipants: max ? Number(max) : 0 }); onDone(); }
    catch (ex) { setErr(apiErrorMessage(ex)); } finally { setBusy(false); }
  }
  return (
    <Modal title="New event" onClose={onClose} footer={<><button className="btn" onClick={onClose}>Cancel</button><button className="btn pri" onClick={submit} disabled={busy}>Create event</button></>}>
      {err && <p className="err-text">{err}</p>}
      <label className="f"><span>Title</span><input className="inp" required value={title} onChange={e => setTitle(e.target.value)} /></label>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <label className="f"><span>Type</span><select className="inp" value={kind} onChange={e => setKind(e.target.value)}><option value="tournament">Tournament</option><option value="watch-party">Watch party</option><option value="promo">Promo</option></select></label>
        <label className="f"><span>Entry fee</span><input className="inp" type="number" min={0} value={fee} onChange={e => setFee(e.target.value)} /></label>
        <label className="f"><span>Date</span><input className="inp" type="date" required value={date} onChange={e => setDate(e.target.value)} /></label>
        <label className="f"><span>Time</span><input className="inp" type="time" required value={time} onChange={e => setTime(e.target.value)} /></label>
      </div>
      <label className="f"><span>Max participants (blank = unlimited)</span><input className="inp" type="number" min={1} value={max} onChange={e => setMax(e.target.value)} /></label>
    </Modal>
  );
}

function Registrations({ event, onClose }) {
  const [list, setList] = useState(null);
  useEffect(() => { api.get(`/events/${event._id}/registrations`).then(r => setList(r.data)); }, [event._id]);
  return (
    <Modal title={`Registrations · ${event.title}`} onClose={onClose} footer={<button className="btn" onClick={onClose}>Close</button>}>
      {!list && <Loading />}
      {list && !list.length && <p className="c-mut">No one has registered yet.</p>}
      {list && list.map(r => <div key={r._id} style={{ fontSize: 13, padding: '5px 0', borderBottom: '1px solid var(--line)' }}>{r.name} · {r.phone}</div>)}
    </Modal>
  );
}
