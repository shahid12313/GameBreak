import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import useCatalog, { money } from '../hooks/useCatalog';
import HeroSlider from '../components/HeroSlider';
import GameCard from '../components/GameCard';
import Reveal from '../components/Reveal';
import CountUp from '../components/CountUp';
import { photos } from '../assets/photos';
import PromoArt from '../components/PromoArt';
import Countdown from '../components/Countdown';
import { current, isOut, releaseTime } from '../content/upcoming';

const STEPS = [
  ['Pick your game', 'PS5, PC, racing sim — choose what you feel like playing.'],
  ['Choose a time', 'See live availability and grab an open slot in seconds.'],
  ['Show up & play', 'Your station is ready when you arrive. No waiting around.'],
];

function fmtHour(h) { const hh = h % 24; return `${hh % 12 || 12} ${hh < 12 ? 'AM' : 'PM'}`; }

function cheapest(games) {
  const all = games.flatMap(g => g.weekday?.method === 'session' ? g.weekday.pk.map(p => p.p)
    : g.weekday?.method === 'minute' ? [g.weekday.rate * 60] : []);
  return all.length ? Math.min(...all) : null;
}

export default function Home() {
  const catalog = useCatalog();
  const [events, setEvents] = useState([]);
  useEffect(() => { api.get('/public/events').then(r => setEvents(r.data.slice(0, 3))).catch(() => {}); }, []);

  const games = catalog?.games || [];
  const s = catalog?.settings;
  const stations = games.reduce((n, g) => n + (g.stations || 0), 0);
  const hours = s ? s.close - s.open : null;
  const low = cheapest(games);

  return (
    <div>
      <HeroSlider catalog={catalog} />

      {catalog && (
        <section className="wrap stats">
          {[
            [games.length, '', '', 'Ways to play'],
            [stations, '', '', 'Gaming stations'],
            hours && [hours, '', 'h', 'Open every day'],
            low && [low, `${s?.currency || 'PKR'} `, '', 'Sessions from'],
          ].filter(Boolean).map(([n, pre, suf, label], k) => (
            <Reveal className="stat" key={label} delay={k * 90}>
              <b><CountUp to={n} prefix={pre} suffix={suf} /></b>
              <span>{label}</span>
            </Reveal>
          ))}
        </section>
      )}

      {games.length > 0 && (
        <section className="wrap">
          <Reveal className="sec-head">
            <p className="eyebrow">The lineup</p>
            <h2 className="sec-title">Choose your battlestation</h2>
            <p className="sec-sub">Every setup is maintained, cleaned and ready between sessions.</p>
          </Reveal>
          <div className="grid gcard-grid">
            {games.map((g, k) => <Reveal key={g._id} delay={k * 90}><GameCard game={g} /></Reveal>)}
          </div>
        </section>
      )}

      {current().length > 0 && (
        <section className="wrap" id="coming-soon">
          <Reveal className="sec-head">
            <p className="eyebrow">Release radar</p>
            <h2 className="sec-title">Coming soon & just released</h2>
            <p className="sec-sub">The big launches we're counting down to. Book your launch-week session early — they fill up fast.</p>
          </Reveal>
          <div className="grid up-grid">
            {current().map((r, k) => {
              const out = isOut(r);
              return (
                <Reveal key={r.id} delay={k * 90} className={`up-card${r.featured ? ' featured' : ''}`}>
                  <div className="up-art"><PromoArt theme={r.theme} /></div>
                  <div className="up-body">
                    <span className={`up-badge${out ? ' out' : ''}`}>{out ? 'Out now' : 'Coming soon'}</span>
                    <h3>{r.title}</h3>
                    <p className="up-meta">{new Date(releaseTime(r)).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Karachi' })} · {r.platforms}</p>
                    {out ? <p className="up-tag">{r.tagline}</p> : <Countdown to={releaseTime(r)} compact />}
                  </div>
                </Reveal>
              );
            })}
          </div>
        </section>
      )}

      <section className="wrap">
        <Reveal className="sec-head center">
          <p className="eyebrow">How it works</p>
          <h2 className="sec-title">From couch to controller in 3 steps</h2>
        </Reveal>
        <ol className="steps">
          {STEPS.map(([t, d], k) => (
            <Reveal as="li" key={t} delay={k * 120} className="step">
              <span className="step-n">{String(k + 1).padStart(2, '0')}</span>
              <h3>{t}</h3>
              <p>{d}</p>
            </Reveal>
          ))}
        </ol>
      </section>

      <section className="wrap split">
        <Reveal className="split-media">
          <img src={photos.sim} alt="A player racing in a simulator cockpit with a steering wheel" loading="lazy" />
          <span className="split-badge">🏎️ Real racing rig</span>
        </Reveal>
        <Reveal className="split-copy" delay={120}>
          <p className="eyebrow">Why {s?.name || 'GameBreak'}</p>
          <h2 className="sec-title">Built for serious play</h2>
          <ul className="ticks">
            <li><b>Book in seconds</b> — pick a game and a time, no app to install.</li>
            <li><b>Real prices, no surprises</b> — see exactly what a session costs up front.</li>
            <li><b>Top-tier gear</b> — next-gen consoles, high-refresh PCs, a full sim rig.</li>
            <li><b>Events every week</b> — tournaments and watch parties for every level.</li>
          </ul>
          <Link className="btn pri lg" to="/book">Reserve your spot</Link>
        </Reveal>
      </section>

      {events.length > 0 && (
        <section className="wrap">
          <Reveal className="sec-head">
            <p className="eyebrow">Coming up</p>
            <h2 className="sec-title">Events & tournaments</h2>
          </Reveal>
          <div className="grid ev-grid">
            {events.map((ev, k) => {
              const d = new Date(ev.t);
              return (
                <Reveal key={ev._id} delay={k * 90} className="ev-card">
                  <div className="ev-date"><b>{d.getDate()}</b><span>{d.toLocaleDateString('en-GB', { month: 'short' })}</span></div>
                  <div>
                    <h3>{ev.title} {ev.starred && <span className="tag warn">★</span>}</h3>
                    <p className="c-mut">{d.toLocaleDateString('en-GB', { weekday: 'long' })} · {d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} · {ev.fee ? money(ev.fee) : 'Free entry'}</p>
                  </div>
                </Reveal>
              );
            })}
          </div>
          <Reveal className="center" style={{ marginTop: 20 }}><Link className="btn ghost" to="/events">All events →</Link></Reveal>
        </section>
      )}

      {s && (s.address || s.phone) && (
        <section className="wrap">
          <Reveal className="sec-head center">
            <p className="eyebrow">Find us</p>
            <h2 className="sec-title">Visit {s.name}</h2>
          </Reveal>
          <div className="grid visit-grid">
            {s.address && (
              <Reveal className="visit-card" delay={0}>
                <span className="visit-ic">📍</span><h3>Address</h3><p>{s.address}</p>
                <a className="visit-link" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(s.address)}`} target="_blank" rel="noopener noreferrer">Open in Google Maps →</a>
              </Reveal>
            )}
            {s.phone && (
              <Reveal className="visit-card" delay={90}>
                <span className="visit-ic">📞</span><h3>Call us</h3>
                <p>{s.contactName && <>{s.contactName}<br /></>}<a href={`tel:${s.phone.replace(/[^\d+]/g, '')}`} className="visit-phone">{s.phone}</a></p>
                <a className="visit-link" href={`https://wa.me/92${s.phone.replace(/\D/g, '').replace(/^0/, '')}`} target="_blank" rel="noopener noreferrer">Message on WhatsApp →</a>
              </Reveal>
            )}
            <Reveal className="visit-card" delay={180}>
              <span className="visit-ic">🕙</span><h3>Opening hours</h3>
              <p>Every day<br /><b className="visit-hours">{fmtHour(s.open)} – {fmtHour(s.close)}</b></p>
              <Link className="visit-link" to="/book">Book a session →</Link>
            </Reveal>
          </div>
        </section>
      )}

      <section className="wrap">
        <Reveal className="cta" style={{ '--cta-img': `url(${photos.pc})` }}>
          <h2>Ready to play?</h2>
          <p>Lock in your station now — it takes less than a minute.</p>
          <Link className="btn pri lg" to="/book">Book a Session</Link>
        </Reveal>
      </section>
    </div>
  );
}
