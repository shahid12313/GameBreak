import { useEffect, useState } from 'react';
import api, { apiErrorMessage } from '../services/api';
import Modal from '../components/Modal';
import { Loading, ErrorState, EmptyState } from '../components/LoadingState';
import { useToast } from '../components/Toast';

export default function Discounts() {
  const [list, setList] = useState(null);
  const [err, setErr] = useState('');
  const [adding, setAdding] = useState(false);
  const toast = useToast();

  function load() { setErr(''); api.get('/discounts').then(r => setList(r.data)).catch(e => setErr(apiErrorMessage(e))); }
  useEffect(load, []);

  async function toggle(id, active) { try { await api.put(`/discounts/${id}`, { active: !active }); load(); } catch (e) { toast(apiErrorMessage(e), 'err'); } }
  async function del(id) { try { await api.delete(`/discounts/${id}`); load(); } catch (e) { toast(apiErrorMessage(e), 'err'); } }

  return (
    <div>
      <h1 className="page-title">Discounts</h1>
      <p className="page-sub">Codes customers can enter when booking or that staff apply when billing</p>
      <div className="headrow"><span /><button className="btn pri" onClick={() => setAdding(true)}>+ New code</button></div>
      {err && <ErrorState message={err} onRetry={load} />}
      {!err && !list && <Loading />}
      {!err && list && !list.length && <EmptyState>No codes yet.</EmptyState>}
      {!err && list && list.length > 0 && (
        <div className="card scroll-x">
          <table className="tbl">
            <thead><tr><th>Code</th><th>Discount</th><th>Uses</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {list.map(c => (
                <tr key={c._id} style={{ opacity: c.active ? 1 : .5 }}>
                  <td><b style={{ fontFamily: 'var(--f-mono)' }}>{c.code}</b><br /><span className="c-mut" style={{ fontSize: 11.5 }}>{c.desc}</span></td>
                  <td className="c-neon">{c.type === 'percent' ? `${c.value}%` : `PKR ${c.value}`}</td>
                  <td>{c.used}{c.maxUses ? `/${c.maxUses}` : ''}</td>
                  <td><span className={`tag ${c.active ? 'ok' : 'bad'}`}>{c.active ? 'Active' : 'Disabled'}</span></td>
                  <td style={{ textAlign: 'right' }}><button className="btn sm" onClick={() => toggle(c._id, c.active)}>{c.active ? 'Disable' : 'Enable'}</button>{' '}<button className="btn sm danger" onClick={() => del(c._id)}>Delete</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {adding && <AddCode onClose={() => setAdding(false)} onDone={() => { setAdding(false); load(); toast('Code created'); }} />}
    </div>
  );
}

function AddCode({ onClose, onDone }) {
  const [code, setCode] = useState(''); const [desc, setDesc] = useState('');
  const [type, setType] = useState('percent'); const [value, setValue] = useState(10); const [maxUses, setMaxUses] = useState('');
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault(); setBusy(true); setErr('');
    try { await api.post('/discounts', { code, desc, type, value: Number(value), maxUses: maxUses ? Number(maxUses) : 0 }); onDone(); }
    catch (ex) { setErr(apiErrorMessage(ex)); } finally { setBusy(false); }
  }
  return (
    <Modal title="New discount code" onClose={onClose} footer={<><button className="btn" onClick={onClose}>Cancel</button><button className="btn pri" onClick={submit} disabled={busy}>Create code</button></>}>
      {err && <p className="err-text">{err}</p>}
      <label className="f"><span>Code</span><input className="inp" required value={code} onChange={e => setCode(e.target.value)} placeholder="WELCOME10" style={{ textTransform: 'uppercase' }} /></label>
      <label className="f"><span>Description</span><input className="inp" value={desc} onChange={e => setDesc(e.target.value)} /></label>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <label className="f"><span>Type</span><select className="inp" value={type} onChange={e => setType(e.target.value)}><option value="percent">Percent %</option><option value="fixed">Fixed PKR</option></select></label>
        <label className="f"><span>Value</span><input className="inp" type="number" min={1} required value={value} onChange={e => setValue(e.target.value)} /></label>
      </div>
      <label className="f"><span>Max uses (blank = unlimited)</span><input className="inp" type="number" min={1} value={maxUses} onChange={e => setMaxUses(e.target.value)} /></label>
    </Modal>
  );
}
