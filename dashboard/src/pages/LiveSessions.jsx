import { useEffect, useRef, useState, useCallback } from 'react';
import api, { apiErrorMessage } from '../services/api';
import Modal from '../components/Modal';
import { Loading, ErrorState } from '../components/LoadingState';
import { useToast } from '../components/Toast';

const money = n => 'PKR ' + Math.round(n || 0).toLocaleString('en-US');
function clockFmt(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  return (h ? h + ':' : '') + String(m).padStart(2, '0') + ':' + String(sec).padStart(2, '0');
}

export default function LiveSessions() {
  const [games, setGames] = useState(null);
  const [board, setBoard] = useState(null);
  const [err, setErr] = useState('');
  const [now, setNow] = useState(Date.now());
  const [startFor, setStartFor] = useState(null); // {stationId, game}
  const [stopFor, setStopFor] = useState(null);   // session object
  const toast = useToast();

  const load = useCallback(() => {
    setErr('');
    Promise.all([api.get('/games'), api.get('/sessions/board')])
      .then(([g, b]) => { setGames(g.data); setBoard(b.data); })
      .catch(e => setErr(apiErrorMessage(e)));
  }, []);
  useEffect(load, [load]);
  useEffect(() => { const t = setInterval(load, 8000); return () => clearInterval(t); }, [load]); // pick up other devices' changes
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);

  if (err) return <ErrorState message={err} onRetry={load} />;
  if (!games || !board) return <Loading />;

  const byStation = Object.fromEntries(board.map(b => [b._id, b]));
  const running = board.filter(b => b.status === 'running').length;

  return (
    <div>
      <h1 className="page-title">Live Sessions</h1>
      <p className="page-sub">Start and stop stations · today's counter view</p>
      <div className="kpis">
        <div className="card kpi"><div className="ic">▶️</div><div><small>Running now</small><b className="c-amber">{running}</b></div></div>
        <div className="card kpi"><div className="ic">✅</div><div><small>Free stations</small><b className="c-neon">{board.length - running}</b></div></div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 14 }}>
        {games.map(g => (
          <section className="card" key={g._id}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}><span>{g.icon}</span>{g.name}</h3>
            {(g.stations || []).map(st => {
              const live = byStation[st._id];
              const s = live?.session;
              return (
                <div key={st._id} style={{ border: '1px solid var(--line)', borderLeft: `3px solid ${s ? 'var(--amber)' : 'var(--neon)'}`, borderRadius: 10, padding: '10px 12px', marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>{st.name}{s?.customerName ? <span className="c-mut"> · {s.customerName}</span> : ''}</span>
                    <span className={`tag ${s ? 'warn' : live?.status === 'maintenance' ? 'bad' : 'ok'}`}>{s ? 'Running' : live?.status || 'available'}</span>
                  </div>
                  {s ? (
                    <>
                      <div style={{ font: '600 22px var(--f-mono)', margin: '6px 0 2px' }}>{clockFmt((now - new Date(s.start).getTime()) / 1000)}</div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                        <span className="c-mut">elapsed</span>
                        <b className="c-amber">{money(s.liveAmount)}</b>
                      </div>
                      <button className="btn sm" style={{ width: '100%', marginTop: 8, color: 'var(--amber)', borderColor: 'rgba(251,191,36,.35)' }} onClick={() => setStopFor(s)}>■ Stop &amp; bill</button>
                    </>
                  ) : (
                    <button className="btn sm pri" style={{ width: '100%', marginTop: 8 }} disabled={live?.status !== 'available'} onClick={() => setStartFor({ stationId: st._id, game: g })}>▶ Start session</button>
                  )}
                </div>
              );
            })}
            {!g.stations?.length && <p className="c-mut" style={{ fontSize: 12.5 }}>No stations yet — add one under Pricing.</p>}
          </section>
        ))}
      </div>
      {startFor && <StartModal stationId={startFor.stationId} game={startFor.game} onClose={() => setStartFor(null)} onDone={() => { setStartFor(null); load(); toast('Session started'); }} />}
      {stopFor && <StopModal session={stopFor} onClose={() => setStopFor(null)} onDone={() => { setStopFor(null); load(); toast('Session billed'); }} />}
    </div>
  );
}

function StartModal({ stationId, game, onClose, onDone }) {
  const [pricing, setPricing] = useState(null);
  const [err, setErr] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [pkIndex, setPkIndex] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => { api.get(`/games/${game._id}/pricing`).then(r => setPricing(r.data.weekday)).catch(e => setErr(apiErrorMessage(e))); }, [game._id]);

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setErr('');
    try {
      await api.post('/sessions/start', { stationId, customerName, pkIndex: pricing?.method === 'session' ? pkIndex : undefined });
      onDone();
    } catch (ex) { setErr(apiErrorMessage(ex)); } finally { setBusy(false); }
  }

  return (
    <Modal title={`Start ${game.name}`} onClose={onClose} footer={
      <>
        <button className="btn" onClick={onClose}>Cancel</button>
        <button className="btn pri" onClick={submit} disabled={busy || !pricing}>{busy ? 'Starting…' : '▶ Start session'}</button>
      </>
    }>
      {err && <p className="err-text">{err}</p>}
      <label className="f"><span>Customer (optional)</span><input className="inp" value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Walk-in or type a name" /></label>
      {!pricing && !err && <p className="c-mut">Loading prices…</p>}
      {pricing?.method === 'session' && (
        <div className="f"><span style={{ display: 'block', fontSize: 11.5, color: 'var(--tx2)', marginBottom: 6 }}>Package</span>
          <div className="chips">
            {pricing.pk.map((p, i) => (
              <button type="button" key={i} className={`chip${pkIndex === i ? ' on' : ''}`} onClick={() => setPkIndex(i)}>{p.l} · {money(p.p)}</button>
            ))}
          </div>
        </div>
      )}
      {pricing?.method === 'minute' && <p className="c-mut">Billed at {money(pricing.rate)} per minute.</p>}
      {pricing && !pricing.method && <p className="err-text">No active price is set for this game yet — set one under Pricing.</p>}
    </Modal>
  );
}

function StopModal({ session, onClose, onDone }) {
  const [items, setItems] = useState([]);
  const [qty, setQty] = useState({});
  const [code, setCode] = useState('');
  const [pay, setPay] = useState('cash');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { api.get('/inventory').then(r => setItems(r.data.filter(i => i.sellable && i.stock > 0))); }, []);

  async function submit() {
    setBusy(true); setErr('');
    try {
      const extras = Object.entries(qty).filter(([, n]) => n > 0).map(([itemId, n]) => ({ itemId, qty: n }));
      await api.post(`/sessions/${session._id}/stop`, { extras, discountCode: code || undefined, paymentMethod: pay });
      onDone();
    } catch (ex) { setErr(apiErrorMessage(ex)); } finally { setBusy(false); }
  }

  return (
    <Modal title="Bill session" onClose={onClose} footer={
      <>
        <button className="btn" onClick={onClose}>Cancel</button>
        <button className="btn pri" onClick={submit} disabled={busy}>{busy ? 'Billing…' : 'Confirm & bill'}</button>
      </>
    }>
      {err && <p className="err-text">{err}</p>}
      <p className="c-mut" style={{ marginTop: 0 }}>{session.customerName || 'Walk-in'} · station running since {new Date(session.start).toLocaleTimeString()}</p>
      {items.length > 0 && (
        <div className="f"><span style={{ display: 'block', fontSize: 11.5, color: 'var(--tx2)', marginBottom: 6 }}>Add extras</span>
          {items.map(i => (
            <div key={i._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0' }}>
              <span>{i.icon} {i.name} <span className="c-mut" style={{ fontSize: 11 }}>{money(i.price)}</span></span>
              <span style={{ display: 'flex', gap: 8, alignItems: 'center', fontFamily: 'var(--f-mono)' }}>
                <button type="button" className="btn sm" onClick={() => setQty(q => ({ ...q, [i._id]: Math.max(0, (q[i._id] || 0) - 1) }))}>−</button>
                {qty[i._id] || 0}
                <button type="button" className="btn sm" onClick={() => setQty(q => ({ ...q, [i._id]: Math.min(i.stock, (q[i._id] || 0) + 1) }))}>+</button>
              </span>
            </div>
          ))}
        </div>
      )}
      <label className="f"><span>Discount code (optional)</span><input className="inp" value={code} onChange={e => setCode(e.target.value)} placeholder="e.g. WELCOME10" /></label>
      <div className="f"><span style={{ display: 'block', fontSize: 11.5, color: 'var(--tx2)', marginBottom: 6 }}>Payment</span>
        <div className="chips">
          {['cash', 'card', 'tab'].map(p => <button type="button" key={p} className={`chip${pay === p ? ' on' : ''}`} onClick={() => setPay(p)}>{p === 'tab' ? "Customer's tab" : p[0].toUpperCase() + p.slice(1)}</button>)}
        </div>
      </div>
    </Modal>
  );
}
