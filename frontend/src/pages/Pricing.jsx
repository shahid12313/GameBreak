import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { Loading } from '../components/LoadingState';

const money = n => 'PKR ' + Math.round(n).toLocaleString('en-US');

export default function Pricing() {
  const [catalog, setCatalog] = useState(null);
  useEffect(() => { api.get('/public/catalog').then(r => setCatalog(r.data)).catch(() => setCatalog({ games: [] })); }, []);

  return (
    <section className="wrap" style={{ paddingTop: 40 }}>
      <h1 className="sec-title">Pricing</h1>
      <p className="sec-sub">Straightforward prices, no membership required. Weekend rates apply Saturday and Sunday where listed.</p>
      {!catalog && <Loading />}
      {catalog && (
        <div className="grid grid-2">
          {catalog.games.map(g => (
            <div className="card" key={g._id}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}><span style={{ fontSize: 22 }}>{g.icon}</span><b>{g.name}</b></div>
              <PriceTable label="Weekday" data={g.weekday} />
              {g.weekend && g.weekend.method && JSON.stringify(g.weekend) !== JSON.stringify(g.weekday) && <PriceTable label="Weekend" data={g.weekend} />}
              <Link className="btn sm pri" to="/book" state={{ gameId: g._id }} style={{ marginTop: 10 }}>Book {g.name}</Link>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function PriceTable({ label, data }) {
  if (!data || !data.method) return null;
  return (
    <div style={{ marginBottom: 10 }}>
      <div className="c-mut" style={{ fontSize: 11.5, marginBottom: 4 }}>{label}</div>
      {data.method === 'minute'
        ? <div style={{ fontSize: 13.5 }}>{money(data.rate * 60)} / hour</div>
        : data.pk.map(p => <div key={p.l} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5, padding: '2px 0' }}><span>{p.l}</span><b className="c-mut" style={{ color: 'var(--neon)' }}>{money(p.p)}</b></div>)}
    </div>
  );
}
