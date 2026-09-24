import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

export default function Home() {
  const [catalog, setCatalog] = useState(null);
  useEffect(() => { api.get('/public/catalog').then(r => setCatalog(r.data)).catch(() => {}); }, []);

  return (
    <div>
      <section className="hero wrap">
        <h1>Your next <span>gaming session</span> starts here</h1>
        <p>{catalog?.settings?.name || 'GameBreak'} — PS5, PC, racing simulators and more. Book online in under a minute, or just walk in.</p>
        <div className="hero-actions">
          <Link className="btn pri" to="/book">Book a Session</Link>
          <Link className="btn" to="/games">See our games</Link>
        </div>
      </section>

      {catalog?.games?.length > 0 && (
        <section className="wrap">
          <h2 className="sec-title">Popular right now</h2>
          <p className="sec-sub">A taste of what's on offer — see the full lineup on the Games page.</p>
          <div className="grid grid-3">
            {catalog.games.slice(0, 3).map(g => (
              <div className="card game-card" key={g._id}>
                <div className="ic">{g.icon}</div>
                <b>{g.name}</b>
                {g.weekday?.method === 'session' && g.weekday.pk?.[0] && <div className="price">from PKR {Math.min(...g.weekday.pk.map(p => p.p))}</div>}
                {g.weekday?.method === 'minute' && <div className="price">PKR {g.weekday.rate * 60}/hour</div>}
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="wrap">
        <h2 className="sec-title">Why GameBreak</h2>
        <div className="grid grid-3">
          <div className="card"><b>⚡ Book in seconds</b><p className="c-mut">Pick a game, a time, and you're set — no app to install.</p></div>
          <div className="card"><b>🎯 Real prices, no surprises</b><p className="c-mut">See exactly what a session costs before you book.</p></div>
          <div className="card"><b>🏆 Events every week</b><p className="c-mut">Tournaments and watch parties — check the Events page.</p></div>
        </div>
      </section>
    </div>
  );
}
