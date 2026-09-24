import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useCustomerAuth } from '../context/CustomerAuthContext';
import api from '../services/api';
import { Loading, EmptyState } from '../components/LoadingState';

const money = n => 'PKR ' + Math.round(n).toLocaleString('en-US');

export default function MyBookings() {
  const { user, loading } = useCustomerAuth();
  const [list, setList] = useState(null);
  useEffect(() => { if (user) api.get('/customer/bookings').then(r => setList(r.data)).catch(() => setList([])); }, [user]);

  if (loading) return <div className="wrap" style={{ paddingTop: 60 }}><Loading /></div>;
  if (!user) return <Navigate to="/login" replace />;

  return (
    <section className="wrap" style={{ paddingTop: 40, maxWidth: 720 }}>
      <h1 className="sec-title">My Bookings</h1>
      <p className="sec-sub">Every session you've booked with us.</p>
      {!list && <Loading />}
      {list && !list.length && <EmptyState>No bookings yet.</EmptyState>}
      {list && list.map(b => (
        <div className="card" key={b._id} style={{ marginBottom: 10, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <div>
            <span className="c-mut" style={{ fontFamily: 'var(--f-mono)', fontSize: 11.5 }}>{b.ref}</span>
            <div style={{ fontWeight: 600 }}>{b.gameName}</div>
            <div className="c-mut" style={{ fontSize: 12.5 }}>{new Date(b.t).toLocaleString()} · {b.durationMinutes} min · {money(b.price)}</div>
          </div>
          <span className={`tag ${b.status === 'confirmed' ? 'ok' : b.status === 'completed' ? 'ok' : b.status === 'cancelled' || b.status === 'no-show' ? 'bad' : 'warn'}`}>{b.status}</span>
        </div>
      ))}
    </section>
  );
}
