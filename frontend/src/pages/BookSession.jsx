import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import api, { apiErrorMessage } from '../services/api';
import { useCustomerAuth } from '../context/CustomerAuthContext';

const money = n => 'PKR ' + Math.round(n).toLocaleString('en-US');
const pad = n => String(n).padStart(2, '0');
const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const tfmt = t => new Date(t).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

function durOptions(g) {
  if (!g) return [];
  if (g.weekday?.method === 'session') return [...new Set(g.weekday.pk.map(p => p.m))].sort((a, b) => a - b);
  return [30, 60, 90, 120];
}
function priceFor(g, minutes) {
  if (!g?.weekday) return null;
  if (g.weekday.method === 'session') { const p = g.weekday.pk.find(x => x.m === minutes); return p ? p.p : null; }
  return Math.round(g.weekday.rate * minutes);
}

export default function BookSession() {
  const location = useLocation();
  const { user } = useCustomerAuth();
  const [catalog, setCatalog] = useState(null);
  const [gameId, setGameId] = useState(location.state?.gameId || '');
  const [date, setDate] = useState(ymd(new Date()));
  const [duration, setDuration] = useState(null);
  const [busy, setBusy] = useState([]);
  const [time, setTime] = useState(null);
  const [name, setName] = useState(''); const [phone, setPhone] = useState(''); const [email, setEmail] = useState('');
  const [code, setCode] = useState(''); const [codeMsg, setCodeMsg] = useState(null);
  const [err, setErr] = useState(''); const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(null);

  useEffect(() => { api.get('/public/catalog').then(r => { setCatalog(r.data); if (!gameId && r.data.games[0]) setGameId(r.data.games[0]._id); }); }, []); // eslint-disable-line
  /* A signed-in customer's name/email pre-fill the form, but as real state —
     not just a fallback shown in the `value` prop — so what actually gets
     submitted matches what's displayed, even if the person never touches
     these two fields. */
  useEffect(() => { if (user) { setName(n => n || user.name || ''); setEmail(e => e || user.email || ''); } }, [user]);
  const game = catalog?.games.find(g => g._id === gameId);

  useEffect(() => {
    if (!game || !duration) { setBusy([]); return; }
    const from = new Date(date + 'T00:00'), to = new Date(date + 'T23:59');
    api.get('/public/availability', { params: { gameId, from: from.toISOString(), to: to.toISOString() } })
      .then(r => setBusy(r.data.busy.concat(Array(Math.max(0, (catalog.games.find(g => g._id === gameId)?.stations || 1) - r.data.stationCount)).fill(null).filter(Boolean))))
      .catch(() => setBusy([]));
  }, [game, duration, date, gameId]); // eslint-disable-line

  function slotsFor() {
    if (!catalog || !game || !duration) return [];
    const open = catalog.settings.open, close = catalog.settings.close;
    const [y, m, d] = date.split('-').map(Number);
    const out = [];
    const now = Date.now();
    for (let mins = open * 60; mins + duration <= close * 60; mins += 30) {
      const t = new Date(y, m - 1, d, 0, mins).getTime(), end = t + duration * 60000;
      const overlap = busy.filter(b => new Date(b.t).getTime() < end && new Date(b.t).getTime() + b.dur * 60000 > t).length;
      out.push({ t, off: t < now + 10 * 60000 || overlap >= game.stations });
    }
    return out;
  }

  async function checkCode() {
    if (!code) { setCodeMsg(null); return; }
    const r = await api.get('/public/discount-check', { params: { code, gameId, durationMinutes: duration } });
    setCodeMsg(r.data.ok ? { ok: true, text: 'Code applied' } : { ok: false, text: r.data.reason });
  }

  async function submit(e) {
    e.preventDefault();
    setErr(''); setSubmitting(true);
    try {
      const res = await api.post('/public/bookings', { name, phone, email, gameId, t: new Date(time).toISOString(), durationMinutes: duration, discountCode: code || undefined });
      setDone(res.data);
    } catch (ex) { setErr(apiErrorMessage(ex)); } finally { setSubmitting(false); }
  }

  if (done) {
    return (
      <section className="wrap" style={{ paddingTop: 60, textAlign: 'center' }}>
        <div style={{ fontSize: 46 }}>✅</div>
        <h1>Request received</h1>
        <p className="c-mut">Your booking reference is</p>
        <p style={{ font: '600 22px var(--f-mono)', color: 'var(--neon)' }}>{done.ref}</p>
        <p className="c-mut">Total: {money(done.price)} · we'll confirm by phone or WhatsApp.</p>
        <button className="btn pri" onClick={() => setDone(null)}>Make another booking</button>
      </section>
    );
  }

  return (
    <section className="wrap" style={{ paddingTop: 40, maxWidth: 640 }}>
      <h1 className="sec-title">Book a Session</h1>
      <p className="sec-sub">Pick a game and a time. We confirm by phone or WhatsApp.</p>

      <div className="card" style={{ marginBottom: 14 }}>
        <span className="f"><span style={{ display: 'block', fontSize: 12, color: 'var(--tx2)', marginBottom: 8 }}>1. Choose a game</span>
          <div className="chips">{catalog?.games.map(g => <button key={g._id} type="button" className={`g-pick${gameId === g._id ? ' on' : ''}`} onClick={() => { setGameId(g._id); setDuration(null); setTime(null); }}>{g.icon} {g.name}</button>)}</div>
        </span>
      </div>

      {game && (
        <div className="card" style={{ marginBottom: 14 }}>
          <span className="f"><span style={{ display: 'block', fontSize: 12, color: 'var(--tx2)', marginBottom: 6 }}>2. Date &amp; length</span>
            <input className="inp" type="date" value={date} min={ymd(new Date())} onChange={e => { setDate(e.target.value); setTime(null); }} style={{ marginBottom: 10 }} />
            <div className="chips">{durOptions(game).map(m => <button key={m} type="button" className={`chip${duration === m ? ' on' : ''}`} onClick={() => { setDuration(m); setTime(null); }}>{m} min · {money(priceFor(game, m) || 0)}</button>)}</div>
          </span>
        </div>
      )}

      {game && duration && (
        <div className="card" style={{ marginBottom: 14 }}>
          <span style={{ display: 'block', fontSize: 12, color: 'var(--tx2)', marginBottom: 8 }}>3. Choose a time</span>
          <div className="slots-grid">
            {slotsFor().map(s => <button key={s.t} type="button" disabled={s.off} className={`slot${time === s.t ? ' on' : ''}`} onClick={() => setTime(s.t)}>{tfmt(s.t)}</button>)}
          </div>
          {!slotsFor().length && <p className="c-mut" style={{ fontSize: 13 }}>No slots configured for these hours.</p>}
        </div>
      )}

      {time && (
        <form className="card" onSubmit={submit}>
          <span style={{ display: 'block', fontSize: 12, color: 'var(--tx2)', marginBottom: 10 }}>4. Your details</span>
          <label className="f"><span>Your name</span><input className="inp" required minLength={2} value={name} onChange={e => setName(e.target.value)} /></label>
          <label className="f"><span>Phone / WhatsApp</span><input className="inp" required value={phone} onChange={e => setPhone(e.target.value)} placeholder="0300 1234567" /></label>
          <label className="f"><span>Email (optional)</span><input className="inp" type="email" value={email} onChange={e => setEmail(e.target.value)} /></label>
          <label className="f"><span>Discount code (optional)</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <input className="inp" value={code} onChange={e => { setCode(e.target.value); setCodeMsg(null); }} placeholder="e.g. WELCOME10" />
              <button type="button" className="btn sm" onClick={checkCode}>Check</button>
            </div>
            {codeMsg && <p className={codeMsg.ok ? 'ok-text' : 'err-text'} style={{ margin: '6px 0 0' }}>{codeMsg.text}</p>}
          </label>
          <div className="card" style={{ background: 'rgba(47,245,165,.05)', border: '1px dashed rgba(47,245,165,.3)', marginBottom: 14 }}>
            <b>{game.icon} {game.name}</b> · {new Date(time).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })} · {tfmt(time)}
            <div style={{ marginTop: 4 }}>Price: <b className="c-neon">{money(priceFor(game, duration))}</b> <span className="c-mut" style={{ fontSize: 12 }}>(pay at the lounge)</span></div>
          </div>
          {err && <p className="err-text">{err}</p>}
          <button className="btn pri block" disabled={submitting}>{submitting ? 'Sending…' : 'Request booking'}</button>
        </form>
      )}
    </section>
  );
}
