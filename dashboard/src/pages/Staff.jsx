import { useEffect, useState } from 'react';
import api, { apiErrorMessage } from '../services/api';
import Modal from '../components/Modal';
import { Loading, ErrorState } from '../components/LoadingState';
import { useToast } from '../components/Toast';
import { useAuth } from '../context/AuthContext';

const ROLES = ['Owner', 'Admin', 'Manager', 'Staff'];

export default function StaffPage() {
  const { user } = useAuth();
  const [list, setList] = useState(null);
  const [err, setErr] = useState('');
  const [adding, setAdding] = useState(false);
  const [resettingFor, setResettingFor] = useState(null);
  const toast = useToast();

  function load() { setErr(''); api.get('/staff').then(r => setList(r.data)).catch(e => setErr(apiErrorMessage(e))); }
  useEffect(load, []);

  async function setRole(id, role) { try { await api.put(`/staff/${id}`, { role }); load(); } catch (e) { toast(apiErrorMessage(e), 'err'); } }
  async function toggleActive(s) { try { await api.put(`/staff/${s._id}`, { active: !s.active }); load(); } catch (e) { toast(apiErrorMessage(e), 'err'); } }
  async function remove(id) { if (!confirm('Remove this account? They will no longer be able to sign in.')) return; try { await api.delete(`/staff/${id}`); load(); } catch (e) { toast(apiErrorMessage(e), 'err'); } }

  if (err) return <ErrorState message={err} onRetry={load} />;
  if (!list) return <Loading />;

  return (
    <div>
      <h1 className="page-title">Staff</h1>
      <p className="page-sub">Who can sign in, and what they can do · Owner only</p>
      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ marginBottom: 8 }}>Roles</h3>
        <p className="c-mut" style={{ margin: 0, lineHeight: 1.7 }}>
          <b>Staff</b> — sessions and customers. <b>Manager</b> — also bookings and the waiting list.{' '}
          <b>Admin</b> — also pricing, discounts, revenue, expenses, inventory, events and settings.{' '}
          <b>Owner</b> — everything, including managing staff accounts.
        </p>
      </div>
      <div className="headrow"><span /><button className="btn pri" onClick={() => setAdding(true)}>+ Add staff</button></div>
      <div className="card scroll-x">
        <table className="tbl">
          <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {list.map(s => {
              const isMe = user && s.email === user.email;
              return (
                <tr key={s._id} style={{ opacity: s.active ? 1 : .5 }}>
                  <td>{s.name || '—'}{isMe && <span className="tag ok" style={{ marginLeft: 6 }}>you</span>}</td>
                  <td className="c-mut" style={{ fontFamily: 'var(--f-mono)', fontSize: 12 }}>{s.email}</td>
                  <td><select className="inp" style={{ width: 110, minHeight: 30, padding: '3px 8px' }} value={s.role} disabled={isMe} onChange={e => setRole(s._id, e.target.value)}>{ROLES.map(r => <option key={r}>{r}</option>)}</select></td>
                  <td><span className={`tag ${s.active ? 'ok' : 'bad'}`}>{s.active ? 'Active' : 'Disabled'}</span></td>
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <button className="btn sm" disabled={isMe} onClick={() => toggleActive(s)}>{s.active ? 'Disable' : 'Enable'}</button>{' '}
                    <button className="btn sm" onClick={() => setResettingFor(s)}>Reset password</button>{' '}
                    <button className="btn sm danger" disabled={isMe} onClick={() => remove(s._id)}>Remove</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {adding && <AddStaff onClose={() => setAdding(false)} onDone={() => { setAdding(false); load(); toast('Staff account added'); }} />}
      {resettingFor && <ResetPassword staff={resettingFor} onClose={() => setResettingFor(null)} onDone={() => { setResettingFor(null); toast('Password reset'); }} />}
    </div>
  );
}

function AddStaff({ onClose, onDone }) {
  const [name, setName] = useState(''); const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [role, setRole] = useState('Staff');
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault(); setBusy(true); setErr('');
    try { await api.post('/staff', { name, email, password, role }); onDone(); } catch (ex) { setErr(apiErrorMessage(ex)); } finally { setBusy(false); }
  }
  return (
    <Modal title="Add a staff member" onClose={onClose} footer={<><button className="btn" onClick={onClose}>Cancel</button><button className="btn pri" onClick={submit} disabled={busy}>Add staff</button></>}>
      {err && <p className="err-text">{err}</p>}
      <label className="f"><span>Full name</span><input className="inp" value={name} onChange={e => setName(e.target.value)} /></label>
      <label className="f"><span>Email</span><input className="inp" type="email" required value={email} onChange={e => setEmail(e.target.value)} /></label>
      <label className="f"><span>Temporary password</span><input className="inp" type="password" minLength={6} required value={password} onChange={e => setPassword(e.target.value)} /></label>
      <label className="f"><span>Role</span><select className="inp" value={role} onChange={e => setRole(e.target.value)}>{ROLES.map(r => <option key={r}>{r}</option>)}</select></label>
    </Modal>
  );
}

function ResetPassword({ staff, onClose, onDone }) {
  const [password, setPassword] = useState(''); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault(); setBusy(true); setErr('');
    try { await api.post(`/staff/${staff._id}/reset-password`, { password }); onDone(); } catch (ex) { setErr(apiErrorMessage(ex)); } finally { setBusy(false); }
  }
  return (
    <Modal title={`Reset password · ${staff.email}`} onClose={onClose} footer={<><button className="btn" onClick={onClose}>Cancel</button><button className="btn pri" onClick={submit} disabled={busy}>Reset password</button></>}>
      {err && <p className="err-text">{err}</p>}
      <label className="f"><span>New password</span><input className="inp" type="password" minLength={6} required value={password} onChange={e => setPassword(e.target.value)} /></label>
      <p className="c-mut" style={{ margin: 0, fontSize: 12 }}>Tell them the new password directly — there is no email reset link in this build.</p>
    </Modal>
  );
}
