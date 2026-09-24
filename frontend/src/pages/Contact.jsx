import { useEffect, useState } from 'react';
import api from '../services/api';

export default function Contact() {
  const [settings, setSettings] = useState(null);
  useEffect(() => { api.get('/public/catalog').then(r => setSettings(r.data.settings)).catch(() => {}); }, []);
  return (
    <section className="wrap" style={{ paddingTop: 40, maxWidth: 560 }}>
      <h1 className="sec-title">Contact</h1>
      <p className="sec-sub">Questions, group bookings, or anything else — reach out.</p>
      <div className="card">
        <dl style={{ display: 'grid', gridTemplateColumns: '90px 1fr', rowGap: 10, margin: 0 }}>
          <dt className="c-mut">Address</dt><dd style={{ margin: 0 }}>{settings?.address || 'Add your address in Settings'}</dd>
          <dt className="c-mut">Phone</dt><dd style={{ margin: 0 }}>{settings?.phone || '—'}</dd>
          <dt className="c-mut">Email</dt><dd style={{ margin: 0 }}>{settings?.email || '—'}</dd>
          <dt className="c-mut">Hours</dt><dd style={{ margin: 0 }}>{settings ? `${fmtHour(settings.open)} – ${fmtHour(settings.close)}, every day` : '—'}</dd>
        </dl>
      </div>
    </section>
  );
}
function fmtHour(h) { const hh = h % 24; const period = hh < 12 ? 'AM' : 'PM'; const h12 = hh % 12 || 12; return `${h12}${h >= 24 ? ' (next day)' : ''} ${period}`; }
