import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { Loading, EmptyState } from '../components/LoadingState';

export default function Games() {
  const [catalog, setCatalog] = useState(null);
  useEffect(() => { api.get('/public/catalog').then(r => setCatalog(r.data)).catch(() => setCatalog({ games: [] })); }, []);

  return (
    <section className="wrap" style={{ paddingTop: 40 }}>
      <h1 className="sec-title">Games</h1>
      <p className="sec-sub">Everything you can play at {catalog?.settings?.name || 'GameBreak'}.</p>
      {!catalog && <Loading />}
      {catalog && !catalog.games.length && <EmptyState>Nothing listed yet — check back soon.</EmptyState>}
      {catalog && catalog.games.length > 0 && (
        <div className="grid grid-3">
          {catalog.games.map(g => (
            <div className="card game-card" key={g._id}>
              <div className="ic">{g.icon}</div>
              <b>{g.name}</b>
              {g.description && <p className="c-mut" style={{ fontSize: 13 }}>{g.description}</p>}
              <div className="c-mut" style={{ fontSize: 12, margin: '6px 0' }}>{g.stations} station{g.stations === 1 ? '' : 's'}</div>
              <Link className="btn sm pri" to="/book" state={{ gameId: g._id }}>Book now</Link>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
