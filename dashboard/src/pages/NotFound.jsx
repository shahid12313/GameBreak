import { Link } from 'react-router-dom';
export default function NotFound() {
  return <div className="login-wrap"><div className="login-box" style={{ textAlign: 'center' }}><h2>Page not found</h2><p className="c-mut">That page doesn't exist.</p><Link className="btn pri" to="/">Back to dashboard</Link></div></div>;
}
