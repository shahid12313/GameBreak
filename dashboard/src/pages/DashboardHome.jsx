import { useEffect, useState } from 'react';
import api, { apiErrorMessage } from '../services/api';
import { Loading, ErrorState } from '../components/LoadingState';

const money = n => 'PKR ' + Math.round(n || 0).toLocaleString('en-US');

export default function DashboardHome() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');

  function load() {
    setErr('');
    api.get('/revenue/dashboard').then(r => setData(r.data)).catch(e => setErr(apiErrorMessage(e)));
  }
  useEffect(load, []);

  if (err) return <ErrorState message={err} onRetry={load} />;
  if (!data) return <Loading />;

  const cards = [
    ['💰', "Today's Revenue", money(data.todayRevenue)],
    ['🎮', "Today's Sessions", data.todaySessions],
    ['▶️', 'Active Sessions', data.activeSessions],
    ['✅', 'Available Stations', `${data.availableStations} / ${data.totalStations}`],
    ['👥', 'Total Customers', data.totalCustomers],
    ['🗓️', 'Pending Bookings', data.pendingBookings],
    ['📉', "Today's Expenses", money(data.todayExpenses)],
    ['📈', 'Net Revenue', money(data.netRevenue)]
  ];

  return (
    <div>
      <h1 className="page-title">Dashboard</h1>
      <p className="page-sub">Today at a glance · {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
      <div className="kpis">
        {cards.map(([icon, label, value]) => (
          <div className="card kpi" key={label}>
            <div className="ic">{icon}</div>
            <div><small>{label}</small><b>{value}</b></div>
          </div>
        ))}
      </div>
      <div className="card">
        <h3 style={{ marginBottom: 8 }}>Getting around</h3>
        <p className="c-mut" style={{ margin: 0 }}>
          Use <b>Live Sessions</b> to start and stop stations, <b>Bookings</b> and <b>Waiting List</b> to manage
          arrivals, and the <b>Administration</b> section for pricing, revenue and everything else.
        </p>
      </div>
    </div>
  );
}
