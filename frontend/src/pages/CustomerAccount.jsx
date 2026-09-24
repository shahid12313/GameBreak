import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useCustomerAuth } from '../context/CustomerAuthContext';
import api from '../services/api';
import { Loading } from '../components/LoadingState';

const money = n => 'PKR ' + Math.round(n).toLocaleString('en-US');

export default function CustomerAccount() {
  const { user, loading, logout } = useCustomerAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState(null);

  useEffect(() => { if (user) api.get('/customer/bookings').then(r => setBookings(r.data)).catch(() => setBookings([])); }, [user]);

  if (loading) return <div className="wrap" style={{ paddingTop: 60 }}><Loading /></div>;
  if (!user) return <Navigate to="/login" replace />;

  function doLogout() { logout(); navigate('/'); }

  return (
    <section className="wrap" style={{ paddingTop: 40, maxWidth: 640 }}>
      <h1 className="sec-title">My Account</h1>
      <div className="card" style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div><b>{user.name}</b><div className="c-mut" style={{ fontSize: 13 }}>{user.email}</div></div>
        <button className="btn sm" onClick={doLogout}>Sign out</button>
      </div>
      <h2 style={{ fontSize: 16, marginBottom: 10 }}>Recent bookings</h2>
      {!bookings && <Loading />}
      {bookings && !bookings.length && <p className="c-mut">No bookings yet. <Link to="/book" style={{ color: 'var(--neon)' }}>Book your first session</Link>.</p>}
      {bookings && bookings.slice(0, 5).map(b => (
        <div className="card" key={b._id} style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
          <span>{b.gameName} · {new Date(b.t).toLocaleDateString()}</span>
          <span className={`tag ${b.status === 'confirmed' ? 'ok' : b.status === 'cancelled' ? 'bad' : 'warn'}`}>{b.status}</span>
        </div>
      ))}
      {bookings && bookings.length > 5 && <Link to="/my-bookings" style={{ color: 'var(--neon)', fontSize: 13 }}>See all bookings →</Link>}
    </section>
  );
}
