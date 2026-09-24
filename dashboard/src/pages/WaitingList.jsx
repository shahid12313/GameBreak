import { useEffect, useState } from 'react';
import api, { apiErrorMessage } from '../services/api';
import Modal from '../components/Modal';
import { Loading, ErrorState, EmptyState } from '../components/LoadingState';
import { useToast } from '../components/Toast';

export default function WaitingList() {
  const [list, setList] = useState(null);
  const [err, setErr] = useState('');
  const [adding, setAdding] = useState(false);
  const toast = useToast();

  function load() { setErr(''); api.get('/waiting').then(r => setList(r.data)).catch(e => setErr(apiErrorMessage(e))); }
  useEffect(load, []);

  async function notify(id) { try { await api.put(`/waiting/${id}/notify`); toast('Marked as notified'); load(); } catch (e) { toast(apiErrorMessage(e), 'err'); } }
  async function convert(id) { try { await api.post(`/waiting/${id}/convert`); toast('Converted to a booking'); load(); } catch (e) { toast(apiErrorMessage(e), 'err'); } }
  async function remove(id) { try { await api.delete(`/waiting/${id}`); load(); } catch (e) { toast(apiErrorMessage(e), 'err'); } }

  return (
    <div>
      <h1 className="page-title">Waiting List</h1>
      <p className="page-sub">Walk-ins waiting for a free station</p>
      <div className="headrow"><span /><button className="btn pri" onClick={() => setAdding(true)}>+ Add to waiting list</button></div>
      {err && <ErrorState message={err} onRetry={load} />}
      {!err && !list && <Loading />}
      {!err && list && !list.length && <EmptyState>Nobody is waiting right now.</EmptyState>}
      {!err && list && list.map(w => (
        <div className="card" key={w._id} style={{ marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div>
            <b>{w.name}</b> <span className={`tag ${w.status === 'notified' ? 'info' : 'warn'}`}>{w.status}</span>
            <div className="c-mut" style={{ fontSize: 12 }}>{w.phone} · waiting {Math.max(1, Math.round((Date.now() - new Date(w.createdAt).getTime()) / 60000))} min</div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {w.status === 'waiting' && <button className="btn sm" onClick={() => notify(w._id)}>Mark notified</button>}
            <button className="btn sm pri" onClick={() => convert(w._id)}>Convert to booking</button>
            <button className="btn sm danger" onClick={() => remove(w._id)}>Remove</button>
          </div>
        </div>
      ))}
      {adding && <AddWaiting onClose={() => setAdding(false)} onDone={() => { setAdding(false); load(); toast('Added'); }} />}
    </div>
  );
}

function AddWaiting({ onClose, onDone }) {
  const [games, setGames] = useState([]);
  const [name, setName] = useState(''); const [phone, setPhone] = useState(''); const [gameId, setGameId] = useState('');
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  useEffect(() => { api.get('/games').then(r => { setGames(r.data); if (r.data[0]) setGameId(r.data[0]._id); }); }, []);
  async function submit(e) {
    e.preventDefault(); setBusy(true); setErr('');
    try { await api.post('/waiting', { name, phone, gameId }); onDone(); } catch (ex) { setErr(apiErrorMessage(ex)); } finally { setBusy(false); }
  }
  return (
    <Modal title="Add to waiting list" onClose={onClose} footer={<><button className="btn" onClick={onClose}>Cancel</button><button className="btn pri" onClick={submit} disabled={busy}>Add</button></>}>
      {err && <p className="err-text">{err}</p>}
      <label className="f"><span>Name</span><input className="inp" required value={name} onChange={e => setName(e.target.value)} /></label>
      <label className="f"><span>Phone</span><input className="inp" value={phone} onChange={e => setPhone(e.target.value)} /></label>
      <label className="f"><span>Game</span><select className="inp" value={gameId} onChange={e => setGameId(e.target.value)}>{games.map(g => <option key={g._id} value={g._id}>{g.icon} {g.name}</option>)}</select></label>
    </Modal>
  );
}
