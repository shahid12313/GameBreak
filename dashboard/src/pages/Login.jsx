import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiErrorMessage } from '../services/api';

export default function Login() {
  const { user, needsBootstrap, login, bootstrap } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  if (user) return <Navigate to="/" replace />;

  async function submit(e) {
    e.preventDefault();
    setErr(''); setBusy(true);
    try {
      if (needsBootstrap) await bootstrap(name, email, password);
      else await login(email, password);
      navigate('/', { replace: true });
    } catch (ex) {
      setErr(apiErrorMessage(ex));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-wrap">
      <div className="login-box">
        <div className="login-logo">GameBreak</div>
        <p className="c-mut" style={{ margin: '0 0 16px' }}>
          {needsBootstrap ? 'First time here — create the owner account to finish setup.' : 'Sign in to the admin dashboard.'}
        </p>
        <form onSubmit={submit}>
          {needsBootstrap && (
            <label className="f"><span>Your name</span><input className="inp" value={name} onChange={e => setName(e.target.value)} /></label>
          )}
          <label className="f"><span>Email</span><input className="inp" type="email" required value={email} onChange={e => setEmail(e.target.value)} autoComplete="username" /></label>
          <label className="f"><span>Password</span><input className="inp" type="password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)} autoComplete={needsBootstrap ? 'new-password' : 'current-password'} /></label>
          {err && <p className="err-text">{err}</p>}
          <button className="btn pri" style={{ width: '100%' }} disabled={busy}>{busy ? 'Please wait…' : needsBootstrap ? 'Create owner account' : 'Sign in'}</button>
        </form>
        {!needsBootstrap && <p className="c-mut" style={{ fontSize: 11.5, margin: '14px 0 0' }}>Not added yet? Ask your business owner to add your email under Staff first.</p>}
      </div>
    </div>
  );
}
