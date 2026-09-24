import { useEffect, useState } from 'react';
import api, { apiErrorMessage } from '../services/api';
import { Loading, ErrorState } from '../components/LoadingState';
import { useToast } from '../components/Toast';

const money = n => 'PKR ' + Math.round(n || 0).toLocaleString('en-US');
function firstOfMonth() { const d = new Date(); d.setDate(1); return d.toISOString().slice(0, 10); }
function today() { return new Date().toISOString().slice(0, 10); }

export default function Revenue() {
  const [from, setFrom] = useState(firstOfMonth());
  const [to, setTo] = useState(today());
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  const [exporting, setExporting] = useState(false);
  const toast = useToast();

  function load() {
    setErr('');
    api.get('/revenue/summary', { params: { from, to } }).then(r => setData(r.data)).catch(e => setErr(apiErrorMessage(e)));
  }
  useEffect(load, [from, to]);

  async function exportExcel() {
    setExporting(true);
    try {
      const res = await api.get('/revenue/export', { params: { from, to }, responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url; a.download = `gamebreak-revenue-${from}.xlsx`; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast('Excel file downloaded');
    } catch (e) { toast(apiErrorMessage(e), 'err'); } finally { setExporting(false); }
  }

  if (err) return <ErrorState message={err} onRetry={load} />;
  if (!data) return <Loading />;

  const maxRev = Math.max(1, ...data.byGame.map(g => g.revenue));

  return (
    <div>
      <h1 className="page-title">Revenue</h1>
      <p className="page-sub">Real-time earnings overview</p>
      <div className="card" style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
        <label className="c-mut" style={{ fontSize: 12 }}>From <input className="inp" type="date" style={{ width: 'auto', display: 'inline-block' }} value={from} onChange={e => setFrom(e.target.value)} /></label>
        <label className="c-mut" style={{ fontSize: 12 }}>To <input className="inp" type="date" style={{ width: 'auto', display: 'inline-block' }} value={to} onChange={e => setTo(e.target.value)} /></label>
        <button className="btn pri" style={{ marginLeft: 'auto' }} onClick={exportExcel} disabled={exporting}>{exporting ? 'Preparing…' : '⬇ Download Excel'}</button>
      </div>

      <div className="kpis">
        <div className="card kpi"><div className="ic">🎮</div><div><small>Game revenue</small><b>{money(data.gameRevenue)}</b></div></div>
        <div className="card kpi"><div className="ic">🛒</div><div><small>Extras revenue</small><b>{money(data.extrasRevenue)}</b></div></div>
        <div className="card kpi"><div className="ic">💰</div><div><small>Total revenue</small><b className="c-neon">{money(data.totalRevenue)}</b></div></div>
        <div className="card kpi"><div className="ic">📉</div><div><small>Expenses</small><b className="c-red">{money(data.totalExpenses)}</b></div></div>
        <div className="card kpi"><div className="ic">📈</div><div><small>Net revenue</small><b className="c-neon">{money(data.netRevenue)}</b></div></div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px,1.2fr) 1fr', gap: 14 }}>
        <div className="card">
          <h3 style={{ marginBottom: 10 }}>Revenue by game</h3>
          {data.byGame.length ? (
            <table className="tbl"><thead><tr><th>Game</th><th>Sessions</th><th>Revenue</th></tr></thead>
              <tbody>{data.byGame.map(g => (
                <tr key={g.gameId}><td>{g.gameName}</td><td>{g.sessions}</td>
                  <td><div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ display: 'inline-block', height: 6, width: Math.round(g.revenue / maxRev * 90), background: 'linear-gradient(90deg,var(--neon),var(--cyan))', borderRadius: 3 }} /><b className="c-neon" style={{ fontFamily: 'var(--f-mono)' }}>{money(g.revenue)}</b></div></td>
                </tr>
              ))}</tbody>
            </table>
          ) : <p className="c-mut">No sessions in this period yet.</p>}
        </div>
        <div className="card">
          <h3 style={{ marginBottom: 10 }}>By payment method</h3>
          {data.byPaymentMethod.length ? data.byPaymentMethod.map(p => (
            <div key={p.method} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--line)' }}>
              <span style={{ textTransform: 'capitalize' }}>{p.method === 'tab-settled' ? 'Tab (settled)' : p.method}</span><b className="c-neon" style={{ fontFamily: 'var(--f-mono)' }}>{money(p.amount)}</b>
            </div>
          )) : <p className="c-mut">Nothing recorded yet.</p>}
        </div>
      </div>
    </div>
  );
}
