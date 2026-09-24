import { useEffect, useState } from 'react';
import api, { apiErrorMessage } from '../services/api';
import Modal from '../components/Modal';
import { Loading, ErrorState } from '../components/LoadingState';
import { useToast } from '../components/Toast';

const money = n => 'PKR ' + Math.round(n || 0).toLocaleString('en-US');

export default function Pricing() {
  const [games, setGames] = useState(null);
  const [packagesByGame, setPackagesByGame] = useState({});
  const [err, setErr] = useState('');
  const [addingGame, setAddingGame] = useState(false);
  const [addingPriceFor, setAddingPriceFor] = useState(null);
  const toast = useToast();

  async function load() {
    setErr('');
    try {
      const g = await api.get('/games');
      setGames(g.data);
      const pairs = await Promise.all(g.data.map(game => api.get(`/pricing/game/${game._id}`).then(r => [game._id, r.data])));
      setPackagesByGame(Object.fromEntries(pairs));
    } catch (e) { setErr(apiErrorMessage(e)); }
  }
  useEffect(() => { load(); }, []);

  async function addStation(gameId) { try { await api.post(`/games/${gameId}/stations`); load(); } catch (e) { toast(apiErrorMessage(e), 'err'); } }
  async function removeStation(gameId, stationId) { try { await api.delete(`/games/${gameId}/stations/${stationId}`); load(); } catch (e) { toast(apiErrorMessage(e), 'err'); } }
  async function togglePrice(id, active) { try { await api.put(`/pricing/${id}`, { active: !active }); load(); } catch (e) { toast(apiErrorMessage(e), 'err'); } }
  async function deletePrice(id) { try { await api.delete(`/pricing/${id}`); load(); } catch (e) { toast(apiErrorMessage(e), 'err'); } }

  if (err) return <ErrorState message={err} onRetry={load} />;
  if (!games) return <Loading />;

  return (
    <div>
      <h1 className="page-title">Pricing</h1>
      <p className="page-sub">Games, stations, and what each one costs to play</p>
      <div className="headrow"><span /><button className="btn pri" onClick={() => setAddingGame(true)}>+ Add game</button></div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(320px,1fr))', gap: 14 }}>
        {games.map(g => (
          <div className="card" key={g._id}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>{g.icon} {g.name}</h3>
            <div className="c-mut" style={{ fontSize: 12, margin: '4px 0 10px' }}>Stations</div>
            {(g.stations || []).map(st => (
              <div key={st._id} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13 }}>
                <span>{st.name}</span>
                <button className="btn sm danger" onClick={() => removeStation(g._id, st._id)}>Remove</button>
              </div>
            ))}
            <button className="btn sm" style={{ marginTop: 6 }} onClick={() => addStation(g._id)}>+ Add station</button>

            <div className="c-mut" style={{ fontSize: 12, margin: '14px 0 8px' }}>Prices</div>
            {(packagesByGame[g._id] || []).map(p => (
              <div key={p._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', fontSize: 13, opacity: p.active ? 1 : .5 }}>
                <span>{p.kind === 'hourly' ? 'Per hour' : p.label || `${p.durationMinutes} min`}{p.dayType === 'weekend' ? ' (weekend)' : ''}</span>
                <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <b className="c-neon" style={{ fontFamily: 'var(--f-mono)' }}>{money(p.price)}</b>
                  <button className="btn sm" onClick={() => togglePrice(p._id, p.active)}>{p.active ? 'Disable' : 'Enable'}</button>
                  <button className="btn sm danger" onClick={() => deletePrice(p._id)}>✕</button>
                </span>
              </div>
            ))}
            {!(packagesByGame[g._id] || []).length && <p className="c-mut" style={{ fontSize: 12.5 }}>No price set yet — sessions for this game can't start until one is added.</p>}
            <button className="btn sm pri" style={{ marginTop: 8 }} onClick={() => setAddingPriceFor(g)}>+ Add price</button>
          </div>
        ))}
      </div>
      {addingGame && <AddGame onClose={() => setAddingGame(false)} onDone={() => { setAddingGame(false); load(); toast('Game added'); }} />}
      {addingPriceFor && <AddPrice game={addingPriceFor} onClose={() => setAddingPriceFor(null)} onDone={() => { setAddingPriceFor(null); load(); toast('Price added'); }} />}
    </div>
  );
}

function AddGame({ onClose, onDone }) {
  const [name, setName] = useState(''); const [icon, setIcon] = useState('🎮'); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault(); setBusy(true); setErr('');
    try { await api.post('/games', { name, icon }); onDone(); } catch (ex) { setErr(apiErrorMessage(ex)); } finally { setBusy(false); }
  }
  return (
    <Modal title="Add a game" onClose={onClose} footer={<><button className="btn" onClick={onClose}>Cancel</button><button className="btn pri" onClick={submit} disabled={busy}>Add game</button></>}>
      {err && <p className="err-text">{err}</p>}
      <div style={{ display: 'grid', gridTemplateColumns: '70px 1fr', gap: 10 }}>
        <label className="f"><span>Icon</span><input className="inp" value={icon} onChange={e => setIcon(e.target.value)} maxLength={4} /></label>
        <label className="f"><span>Name</span><input className="inp" required value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Air Hockey" /></label>
      </div>
    </Modal>
  );
}

function AddPrice({ game, onClose, onDone }) {
  const [kind, setKind] = useState('session'); const [dayType, setDayType] = useState('all');
  const [label, setLabel] = useState('1 Hour'); const [minutes, setMinutes] = useState(60); const [price, setPrice] = useState(500);
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault(); setBusy(true); setErr('');
    try {
      await api.post('/pricing', { gameId: game._id, kind, dayType, label: kind === 'session' ? label : undefined, durationMinutes: kind === 'session' ? Number(minutes) : undefined, price: Number(price) });
      onDone();
    } catch (ex) { setErr(apiErrorMessage(ex)); } finally { setBusy(false); }
  }
  return (
    <Modal title={`Add a price for ${game.name}`} onClose={onClose} footer={<><button className="btn" onClick={onClose}>Cancel</button><button className="btn pri" onClick={submit} disabled={busy}>Add price</button></>}>
      {err && <p className="err-text">{err}</p>}
      <label className="f"><span>Type</span><select className="inp" value={kind} onChange={e => setKind(e.target.value)}><option value="session">Fixed package (e.g. 1 Hour)</option><option value="hourly">Continuous, per hour</option></select></label>
      <label className="f"><span>Applies to</span><select className="inp" value={dayType} onChange={e => setDayType(e.target.value)}><option value="all">Every day</option><option value="weekend">Weekends only (Sat/Sun)</option></select></label>
      {kind === 'session' && <>
        <label className="f"><span>Label</span><input className="inp" value={label} onChange={e => setLabel(e.target.value)} /></label>
        <label className="f"><span>Minutes</span><input className="inp" type="number" min={1} value={minutes} onChange={e => setMinutes(e.target.value)} /></label>
      </>}
      <label className="f"><span>Price (PKR)</span><input className="inp" type="number" min={0} value={price} onChange={e => setPrice(e.target.value)} /></label>
    </Modal>
  );
}
