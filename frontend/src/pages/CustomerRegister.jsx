import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useCustomerAuth } from '../context/CustomerAuthContext';
import { apiErrorMessage } from '../services/api';

export default function CustomerRegister() {
  const { user, register } = useCustomerAuth();
  const navigate = useNavigate();
  const [name, setName] = useState(''); const [email, setEmail] = useState(''); const [phone, setPhone] = useState(''); const [password, setPassword] = useState('');
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/account" replace />;

  async function submit(e) {
    e.preventDefault(); setErr(''); setBusy(true);
    try { await register(name, email, phone, password); navigate('/account'); } catch (ex) { setErr(apiErrorMessage(ex)); } finally { setBusy(false); }
  }

  return (
    <section className="wrap">
      <div className="auth-box">
        <h1 className="sec-title" style={{ marginBottom: 4 }}>Create an account</h1>
        <p className="c-mut" style={{ margin: '0 0 18px' }}>Book faster and keep track of your sessions.</p>
        <form onSubmit={submit}>
          <label className="f"><span>Name</span><input className="inp" required value={name} onChange={e => setName(e.target.value)} /></label>
          <label className="f"><span>Email</span><input className="inp" type="email" required value={email} onChange={e => setEmail(e.target.value)} autoComplete="username" /></label>
          <label className="f"><span>Phone (optional)</span><input className="inp" value={phone} onChange={e => setPhone(e.target.value)} /></label>
          <label className="f"><span>Password</span><input className="inp" type="password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)} autoComplete="new-password" /></label>
          {err && <p className="err-text">{err}</p>}
          <button className="btn pri block" disabled={busy}>{busy ? 'Creating…' : 'Create account'}</button>
        </form>
        <p className="c-mut" style={{ marginTop: 16, fontSize: 13 }}>Already have one? <Link to="/login" style={{ color: 'var(--neon)' }}>Sign in</Link></p>
      </div>
    </section>
  );
}
