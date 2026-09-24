import { Link } from 'react-router-dom';
export default function NotFound() {
  return <section className="wrap" style={{ textAlign: 'center', padding: '80px 0' }}><h1>Page not found</h1><p className="c-mut">That page doesn't exist.</p><Link className="btn pri" to="/">Back home</Link></section>;
}
