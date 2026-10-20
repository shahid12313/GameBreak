import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import api, { apiErrorMessage } from '../services/api';
import { useCustomerAuth } from '../context/CustomerAuthContext';
import PageHeader from '../components/PageHeader';
import { photos, gamePhoto, gameAccent, isCutout } from '../assets/photos';
import useCatalog, { fromPrice, waLink } from '../hooks/useCatalog';

const money = n => 'PKR ' + Math.round(n).toLocaleString('en-US');
const pad = n => String(n).padStart(2, '0');
const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const tfmt = t => new Date(t).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
const durLabel = m => m < 60 ? `${m} min` : `${m / 60} hour${m === 60 ? '' : 's'}`;
const STEPS = ['Game', 'Date', 'Time', 'Details'];

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
/* The next 7 days as quick-pick chips: Today, Tomorrow, Wed 22, ... */
function nextDays() {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() + i);
    return { v: ymd(d), top: i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : d.toLocaleDateString('en-GB', { weekday: 'short' }), num: d.getDate(), mon: d.toLocaleDateString('en-GB', { month: 'short' }) };
  });
}
const PARTS = [['🌅 Morning', h => h < 12], ['☀️ Afternoon', h => h >= 12 && h < 17], ['🌙 Evening', h => h >= 17]];

export default function BookSession() {
  const location = useLocation();
  const { user } = useCustomerAuth();
  const catalog = useCatalog(); // shared with the other pages, so usually already loaded
  const [gameId, setGameId] = useState(location.state?.gameId || '');
  const [date, setDate] = useState(ymd(new Date()));
  const [duration, setDuration] = useState(null);
  const [busy, setBusy] = useState([]);
  const [time, setTime] = useState(null);
  const [name, setName] = useState(''); const [phone, setPhone] = useState(''); const [email, setEmail] = useState('');
  const [code, setCode] = useState(''); const [codeMsg, setCodeMsg] = useState(null);
  const [err, setErr] = useState(''); const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(null);
  const dateRef = useRef(null), timeRef = useRef(null), formRef = useRef(null);

  useEffect(() => { if (catalog && !gameId && catalog.games[0]) setGameId(catalog.games[0]._id); }, [catalog]); // eslint-disable-line
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

  /* After each choice, glide down to the next step (it renders a tick later). */
  const goTo = ref => setTimeout(() => ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);

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
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (ex) { setErr(apiErrorMessage(ex)); } finally { setSubmitting(false); }
  }

  const whenText = time && `${new Date(time).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })} at ${tfmt(time)}`;
  const bannerImg = game ? gamePhoto(game.name) : photos.pc;

  if (done) {
    const s = catalog?.settings;
    const msg = `Hi ${s?.name || 'GameBreak'}! I just booked online.\nBooking: ${done.ref}\nGame: ${game?.name}, ${durLabel(duration)}\nWhen: ${whenText}\nName: ${name}\nTotal: ${money(done.price)}`;
    return (
      <section className="wrap bk-done">
        <div className="bk-done-card" style={{ '--ac': game && gameAccent(game.name) }}>
          <div className="bk-check" aria-hidden="true"><svg viewBox="0 0 52 52"><circle cx="26" cy="26" r="24" /><path d="M15 27l7 7 15-16" /></svg></div>
          <h1>Booking received!</h1>
          <p className="c-mut">Your reference number</p>
          <p className="bk-ref">{done.ref}</p>
          <div className="bk-receipt">
            <div><span>Game</span><b>{game?.icon} {game?.name}</b></div>
            <div><span>When</span><b>{whenText}</b></div>
            <div><span>Length</span><b>{durLabel(duration)}</b></div>
            <div><span>Total</span><b className="c-neon">{money(done.price)}</b></div>
          </div>
          {s?.phone && (
            <>
              <a className="btn wa block lg" href={waLink(s.phone, msg)} target="_blank" rel="noopener noreferrer">💬 Send booking on WhatsApp</a>
              <p className="c-mut bk-note">Tap to send us your booking — we'll confirm it straight away.</p>
            </>
          )}
          <button className="btn ghost block" onClick={() => { setDone(null); setTime(null); }}>Make another booking</button>
        </div>
      </section>
    );
  }

  const step = !game ? 0 : !duration ? 1 : !time ? 2 : 3;
  const slots = slotsFor();
  const days = nextDays();

  return (
    <>
      <PageHeader key={bannerImg} img={bannerImg} eyebrow="Book online · pay at the lounge" title="Book a Session">
        Pick a game and a time — it takes under a minute. We confirm by phone or WhatsApp.
      </PageHeader>

      <section className="wrap bk">
        <ol className="bk-progress" aria-label="Booking steps">
          {STEPS.map((label, i) => <li key={label} className={i < step ? 'done' : i === step ? 'now' : ''}><i>{i < step ? '✓' : i + 1}</i><span>{label}</span></li>)}
        </ol>

        <div className="bk-step">
          <h2 className="bk-h"><span>1</span>Choose your game</h2>
          <div className="bk-games">
            {!catalog && [0, 1, 2, 3].map(i => <div key={i} className="bk-game skel" />)}
            {catalog?.games.map(g => {
              const img = gamePhoto(g.name);
              return (
                <button key={g._id} type="button" className={`bk-game${gameId === g._id ? ' on' : ''}`} style={{ '--ac': gameAccent(g.name) }} aria-pressed={gameId === g._id}
                  onClick={() => { setGameId(g._id); setDuration(null); setTime(null); goTo(dateRef); }}>
                  <span className={`bk-game-img${isCutout(img) ? ' cut' : ''}`}><img src={img} alt="" loading="lazy" /></span>
                  <span className="bk-game-txt"><b>{g.icon} {g.name}</b><small>{fromPrice(g)}</small></span>
                  <span className="bk-tick" aria-hidden="true">✓</span>
                </button>
              );
            })}
          </div>
        </div>

        {game && (
          <div className="bk-step" ref={dateRef}>
            <h2 className="bk-h"><span>2</span>Pick a day & how long</h2>
            <div className="bk-days">
              {days.map(d => (
                <button key={d.v} type="button" className={`bk-day${date === d.v ? ' on' : ''}`} onClick={() => { setDate(d.v); setTime(null); }}>
                  <small>{d.top}</small><b>{d.num}</b><small>{d.mon}</small>
                </button>
              ))}
              <label className={`bk-day other${days.some(d => d.v === date) ? '' : ' on'}`}>
                <small>Other</small><b>📅</b><small>date</small>
                <input type="date" value={date} min={ymd(new Date())} onChange={e => { if (e.target.value) { setDate(e.target.value); setTime(null); } }} onClick={e => { try { e.currentTarget.showPicker(); } catch { /* older browsers open it themselves */ } }} aria-label="Pick another date" />
              </label>
            </div>
            <div className="bk-durs">
              {durOptions(game).map(m => (
                <button key={m} type="button" className={`bk-dur${duration === m ? ' on' : ''}`} onClick={() => { setDuration(m); setTime(null); goTo(timeRef); }}>
                  <b>{durLabel(m)}</b><span>{money(priceFor(game, m) || 0)}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {game && duration && (
          <div className="bk-step" ref={timeRef}>
            <h2 className="bk-h"><span>3</span>Choose a start time</h2>
            {PARTS.map(([label, test]) => {
              const list = slots.filter(s => test(new Date(s.t).getHours()));
              if (!list.length) return null;
              return (
                <div key={label} className="bk-part">
                  <p className="bk-part-h">{label}</p>
                  <div className="slots-grid">
                    {list.map(s => <button key={s.t} type="button" disabled={s.off} className={`slot${time === s.t ? ' on' : ''}`} onClick={() => { setTime(s.t); goTo(formRef); }}>{tfmt(s.t)}</button>)}
                  </div>
                </div>
              );
            })}
            {!slots.length && <p className="c-mut" style={{ fontSize: 13 }}>No slots configured for these hours.</p>}
            {slots.length > 0 && slots.every(s => s.off) && <p className="c-mut" style={{ fontSize: 13 }}>No free times left on this day — try another day above.</p>}
          </div>
        )}

        {time && (
          <form className="bk-step" onSubmit={submit} ref={formRef}>
            <h2 className="bk-h"><span>4</span>Your details</h2>
            <div className="bk-summary" style={{ '--ac': gameAccent(game.name) }}>
              <img src={gamePhoto(game.name)} alt="" />
              <div>
                <b>{game.icon} {game.name} · {durLabel(duration)}</b>
                <span>{whenText}</span>
              </div>
              <strong>{money(priceFor(game, duration))}</strong>
            </div>
            <label className="f"><span>Your name</span><input className="inp" required minLength={2} value={name} onChange={e => setName(e.target.value)} autoComplete="name" /></label>
            <label className="f"><span>Phone / WhatsApp</span><input className="inp" required type="tel" inputMode="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="0300 1234567" autoComplete="tel" /></label>
            <label className="f"><span>Email (optional)</span><input className="inp" type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" /></label>
            <label className="f"><span>Discount code (optional)</span>
              <div style={{ display: 'flex', gap: 8 }}>
                <input className="inp" value={code} onChange={e => { setCode(e.target.value); setCodeMsg(null); }} placeholder="e.g. WELCOME10" />
                <button type="button" className="btn sm" onClick={checkCode}>Check</button>
              </div>
              {codeMsg && <p className={codeMsg.ok ? 'ok-text' : 'err-text'} style={{ margin: '6px 0 0' }}>{codeMsg.text}</p>}
            </label>
            {err && <p className="err-text">{err}</p>}
            <button className="btn pri block lg" disabled={submitting}>{submitting ? 'Sending…' : `Request booking · ${money(priceFor(game, duration))}`}</button>
            <p className="c-mut bk-note">No payment now — you pay at the lounge.</p>
          </form>
        )}
      </section>
    </>
  );
}
