import { useEffect, useState } from 'react';
import api from '../services/api';
import { Loading } from '../components/LoadingState';

export default function Stations() {
  const [catalog, setCatalog] = useState(null);
  useEffect(() => { api.get('/public/catalog').then(r => setCatalog(r.data)).catch(() => setCatalog({ games: [] })); }, []);
  const total = catalog ? catalog.games.reduce((s, g) => s + g.stations, 0) : 0;

  return (
    <section className="wrap" style={{ paddingTop: 40 }}>
      <h1 className="sec-title">Gaming Stations</h1>
      <p className="sec-sub">{catalog ? `${total} stations across ${catalog.games.length} games.` : 'How many of each setup we have.'}</p>
      {!catalog && <Loading />}
      {catalog && (
        <div className="grid grid-3">
          {catalog.games.map(g => (
            <div className="card" key={g._id}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><span style={{ fontSize: 24 }}>{g.icon}</span><b>{g.name}</b></div>
              <p className="c-mut" style={{ margin: '8px 0 0' }}>{g.stations} station{g.stations === 1 ? '' : 's'} available to book</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
