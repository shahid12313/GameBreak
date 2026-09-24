import { useEffect, useState } from 'react';
import api, { apiErrorMessage } from '../services/api';
import Modal from '../components/Modal';
import { Loading, ErrorState } from '../components/LoadingState';
import { useToast } from '../components/Toast';

const money = n => 'PKR ' + Math.round(n || 0).toLocaleString('en-US');

export default function Inventory() {
  const [list, setList] = useState(null);
  const [err, setErr] = useState('');
  const [adding, setAdding] = useState(false);
  const [restocking, setRestocking] = useState(null);
  const toast = useToast();

  function load() { setErr(''); api.get('/inventory').then(r => setList(r.data)).catch(e => setErr(apiErrorMessage(e))); }
  useEffect(load, []);

  async function del(id) { if (!confirm('Delete this item?')) return; try { await api.delete(`/inventory/${id}`); load(); } catch (e) { toast(apiErrorMessage(e), 'err'); } }

  if (err) return <ErrorState message={err} onRetry={load} />;
  if (!list) return <Loading />;

  const sellable = list.filter(i => i.sellable), nonSellable = list.filter(i => !i.sellable);
  const low = list.filter(i => i.stock <= i.lowStockThreshold).length;

  const Grid = ({ items }) => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 12, marginBottom: 22 }}>
      {items.map(i => (
        <div className="card" key={i._id}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 22 }}>{i.icon}</span>
            <div><b>{i.name}</b><br /><span className={`tag ${i.sellable ? 'ok' : 'warn'}`}>{i.sellable ? 'Sellable' : 'Non-sellable'}</span></div>
          </div>
          {i.sellable ? (
            <div style={{ fontSize: 12.5, display: 'grid', gridTemplateColumns: '1fr auto', rowGap: 3 }}>
              <span className="c-mut">Sale price</span><span style={{ textAlign: 'right' }}>{money(i.price)}</span>
              <span className="c-mut">Cost</span><span style={{ textAlign: 'right' }}>{money(i.cost)}</span>
              <span className="c-mut">Margin</span><span className="c-neon" style={{ textAlign: 'right' }}>{money(i.price - i.cost)}</span>
            </div>
          ) : <div style={{ fontSize: 12.5 }}><span className="c-mut">Unit cost</span> <span className="c-amber">{money(i.cost)}</span></div>}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--line)', marginTop: 9, paddingTop: 9, fontSize: 12 }}>
            <span className={i.stock <= i.lowStockThreshold ? 'c-red' : 'c-mut'}>{i.stock} {i.unit}(s) {i.stock <= i.lowStockThreshold ? '· low' : 'in stock'}</span>
            <span style={{ display: 'flex', gap: 6 }}>
              <button className="btn sm" onClick={() => setRestocking(i)}>Restock</button>
              <button className="btn sm danger" onClick={() => del(i._id)}>✕</button>
            </span>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div>
      <h1 className="page-title">Inventory</h1>
      <p className="page-sub">Snacks, drinks, accessories and consumables</p>
      <div className="kpis">
        <div className="card kpi"><div className="ic">☕</div><div><small>Sellable items</small><b>{sellable.length}</b></div></div>
        <div className="card kpi"><div className="ic">📋</div><div><small>Non-sellable items</small><b className="c-amber">{nonSellable.length}</b></div></div>
        <div className="card kpi"><div className="ic">⚠️</div><div><small>Low stock alerts</small><b className={low ? 'c-red' : ''}>{low}</b></div></div>
      </div>
      <div className="headrow"><span /><button className="btn pri" onClick={() => setAdding(true)}>+ Add item</button></div>
      <h3 style={{ marginBottom: 10 }}>Sellable <small className="c-mut" style={{ fontWeight: 400 }}>appear in session extras</small></h3>
      <Grid items={sellable} />
      <h3 style={{ marginBottom: 10 }}>Non-sellable <small className="c-mut" style={{ fontWeight: 400 }}>consumables · restocking logs an expense</small></h3>
      <Grid items={nonSellable} />
      {adding && <AddItem onClose={() => setAdding(false)} onDone={() => { setAdding(false); load(); toast('Item added'); }} />}
      {restocking && <Restock item={restocking} onClose={() => setRestocking(null)} onDone={() => { setRestocking(null); load(); toast('Restocked'); }} />}
    </div>
  );
}

function AddItem({ onClose, onDone }) {
  const [name, setName] = useState(''); const [icon, setIcon] = useState('🥤'); const [sellable, setSellable] = useState(true);
  const [price, setPrice] = useState(''); const [cost, setCost] = useState(''); const [stock, setStock] = useState(10); const [unit, setUnit] = useState('piece');
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault(); setBusy(true); setErr('');
    try { await api.post('/inventory', { name, icon, sellable, price: sellable ? Number(price) || 0 : 0, cost: Number(cost), stock: Number(stock), unit }); onDone(); }
    catch (ex) { setErr(apiErrorMessage(ex)); } finally { setBusy(false); }
  }
  return (
    <Modal title="Add inventory item" onClose={onClose} footer={<><button className="btn" onClick={onClose}>Cancel</button><button className="btn pri" onClick={submit} disabled={busy}>Add item</button></>}>
      {err && <p className="err-text">{err}</p>}
      <div style={{ display: 'grid', gridTemplateColumns: '70px 1fr', gap: 10 }}>
        <label className="f"><span>Icon</span><input className="inp" value={icon} onChange={e => setIcon(e.target.value)} maxLength={4} /></label>
        <label className="f"><span>Name</span><input className="inp" required value={name} onChange={e => setName(e.target.value)} /></label>
      </div>
      <label className="f"><span>Type</span><select className="inp" value={sellable ? '1' : '0'} onChange={e => setSellable(e.target.value === '1')}><option value="1">Sellable (shows on bills)</option><option value="0">Non-sellable (consumable)</option></select></label>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {sellable && <label className="f"><span>Sale price</span><input className="inp" type="number" min={0} value={price} onChange={e => setPrice(e.target.value)} /></label>}
        <label className="f"><span>Cost price</span><input className="inp" type="number" min={0} required value={cost} onChange={e => setCost(e.target.value)} /></label>
        <label className="f"><span>Starting stock</span><input className="inp" type="number" min={0} value={stock} onChange={e => setStock(e.target.value)} /></label>
        <label className="f"><span>Unit</span><input className="inp" value={unit} onChange={e => setUnit(e.target.value)} /></label>
      </div>
    </Modal>
  );
}

function Restock({ item, onClose, onDone }) {
  const [qty, setQty] = useState(10); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault(); setBusy(true); setErr('');
    try { await api.post(`/inventory/${item._id}/restock`, { qty: Number(qty) }); onDone(); } catch (ex) { setErr(apiErrorMessage(ex)); } finally { setBusy(false); }
  }
  return (
    <Modal title={`Restock ${item.name}`} onClose={onClose} footer={<><button className="btn" onClick={onClose}>Cancel</button><button className="btn pri" onClick={submit} disabled={busy}>Restock</button></>}>
      {err && <p className="err-text">{err}</p>}
      <label className="f"><span>Quantity ({item.unit}s)</span><input className="inp" type="number" min={1} value={qty} onChange={e => setQty(e.target.value)} /></label>
      <p className="c-mut" style={{ margin: 0 }}>Logs an expense at {money(item.cost)} each.</p>
    </Modal>
  );
}
