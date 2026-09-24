import { useEffect, useState } from 'react';
import api, { apiErrorMessage } from '../services/api';
import { Loading, ErrorState } from '../components/LoadingState';
import { useToast } from '../components/Toast';

export default function Settings() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  function load() { setErr(''); api.get('/settings').then(r => setData(r.data)).catch(e => setErr(apiErrorMessage(e))); }
  useEffect(load, []);

  async function submit(e) {
    e.preventDefault(); setBusy(true);
    try {
      const res = await api.put('/settings', {
        name: data.name, contactName: data.contactName || '', address: data.address, phone: data.phone, email: data.email,
        currency: data.currency, taxPercent: Number(data.taxPercent) || 0,
        open: Number(data.open), close: Number(data.close), bookingLeadMinutes: Number(data.bookingLeadMinutes) || 0
      });
      setData(res.data);
      toast('Settings saved');
    } catch (ex) { toast(apiErrorMessage(ex), 'err'); } finally { setBusy(false); }
  }
  function set(k, v) { setData(d => ({ ...d, [k]: v })); }

  if (err) return <ErrorState message={err} onRetry={load} />;
  if (!data) return <Loading />;

  return (
    <div>
      <h1 className="page-title">Settings</h1>
      <p className="page-sub">Business details shown on the public site and receipts</p>
      <form className="card" style={{ maxWidth: 480 }} onSubmit={submit}>
        <label className="f"><span>Business name</span><input className="inp" required value={data.name} onChange={e => set('name', e.target.value)} /></label>
        <label className="f"><span>Owner / contact name(s)</span><input className="inp" maxLength={60} value={data.contactName || ''} onChange={e => set('contactName', e.target.value)} /></label>
        <label className="f"><span>Address</span><input className="inp" value={data.address} onChange={e => set('address', e.target.value)} /></label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <label className="f"><span>Phone</span><input className="inp" value={data.phone} onChange={e => set('phone', e.target.value)} /></label>
          <label className="f"><span>Email</span><input className="inp" type="email" value={data.email} onChange={e => set('email', e.target.value)} /></label>
          <label className="f"><span>Currency</span><input className="inp" value={data.currency} onChange={e => set('currency', e.target.value)} /></label>
          <label className="f"><span>Tax %</span><input className="inp" type="number" min={0} max={100} value={data.taxPercent} onChange={e => set('taxPercent', e.target.value)} /></label>
          <label className="f"><span>Opens (hour, 0–23)</span><input className="inp" type="number" min={0} max={23} required value={data.open} onChange={e => set('open', e.target.value)} /></label>
          <label className="f"><span>Closes (24=midnight, 26=2am)</span><input className="inp" type="number" min={1} max={30} required value={data.close} onChange={e => set('close', e.target.value)} /></label>
        </div>
        <label className="f"><span>Booking lead time (minutes' notice required)</span><input className="inp" type="number" min={0} value={data.bookingLeadMinutes} onChange={e => set('bookingLeadMinutes', e.target.value)} /></label>
        <button className="btn pri" disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</button>
      </form>
    </div>
  );
}
