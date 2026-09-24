import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useCustomerAuth } from '../context/CustomerAuthContext';
import { apiErrorMessage } from '../services/api';

export default function CustomerLogin() {
  const { user, login } = useCustomerAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState(''); const [password, setPassword] = useState('');
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/account" replace />;

  async function submit(e) {
    e.preventDefault(); setErr(''); setBusy(true);
    try { await login(email, password); navigate('/account'); } catch (ex) { setErr(apiErrorMessage(ex)); } finally { setBusy(false); }
  }

  return (
    <section className="wrap">
      <div className="auth-box">
        <h1 className="sec-title" style={{ marginBottom: 4 }}>Sign in</h1>
        <p className="c-mut" style={{ margin: '0 0 18px' }}>Track your bookings and book faster next time.</p>
        <form onSubmit={submit}>
          <label className="f"><span>Email</span><input className="inp" type="email" required value={email} onChange={e => setEmail(e.target.value)} autoComplete="username" /></label>
          <label className="f"><span>Password</span><input className="inp" type="password" required value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" /></label>
          {err && <p className="err-text">{err}</p>}
          <button className="btn pri block" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
        </form>
        <p className="c-mut" style={{ marginTop: 16, fontSize: 13 }}>New here? <Link to="/register" style={{ color: 'var(--neon)' }}>Create an account</Link></p>
      </div>
    </section>
  );
}
