import { useEffect, useState } from 'react';
import api, { apiErrorMessage } from '../services/api';
import { Loading, EmptyState } from '../components/LoadingState';
import PageHeader from '../components/PageHeader';
import Reveal from '../components/Reveal';
import { photos } from '../assets/photos';

const money = n => 'PKR ' + Math.round(n).toLocaleString('en-US');

export default function Events() {
  const [list, setList] = useState(null);
  const [regFor, setRegFor] = useState(null);
  useEffect(() => { api.get('/public/events').then(r => setList(r.data)).catch(() => setList([])); }, []);

  return (
    <>
    <PageHeader img={photos.crowd} eyebrow="Compete & hang out" title="Events">Tournaments and watch parties — everyone's welcome.</PageHeader>
    <section className="wrap">
      {!list && <Loading />}
      {list && !list.length && <EmptyState>No events scheduled right now — check back soon.</EmptyState>}
      <div className="grid grid-2">
        {list?.map(ev => (
          <Reveal className="card ev-item" key={ev._id}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <b>{ev.title}</b> {ev.starred && <span className="tag warn">★ featured</span>}
                <div className="c-mut" style={{ fontSize: 13, margin: '6px 0' }}>{new Date(ev.t).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })} · {new Date(ev.t).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</div>
                <div className="c-mut" style={{ fontSize: 13 }}>{ev.fee ? `Entry ${money(ev.fee)}` : 'Free entry'}</div>
              </div>
              {ev.full ? <span className="tag bad">Full</span> : <button className="btn sm pri" onClick={() => setRegFor(ev)}>Register</button>}
            </div>
          </Reveal>
        ))}
      </div>
      {regFor && <RegisterModal event={regFor} onClose={() => setRegFor(null)} />}
    </section>
    </>
  );
}

function RegisterModal({ event, onClose }) {
  const [name, setName] = useState(''); const [phone, setPhone] = useState(''); const [email, setEmail] = useState('');
  const [err, setErr] = useState(''); const [done, setDone] = useState(false); const [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault(); setBusy(true); setErr('');
    try { await api.post(`/public/events/${event._id}/register`, { name, phone, email }); setDone(true); }
    catch (ex) { setErr(apiErrorMessage(ex)); } finally { setBusy(false); }
  }
  return (
    <div className="modal-back" style={{ position: 'fixed', inset: 0, background: 'rgba(2,6,8,.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, zIndex: 60 }} onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div className="card modal-box" style={{ maxWidth: 380, width: '100%' }}>
        <h3 style={{ marginBottom: 10 }}>Register · {event.title}</h3>
        {done ? <><p className="ok-text">You're registered! See you there.</p><button className="btn pri block" onClick={onClose}>Close</button></> : (
          <form onSubmit={submit}>
            {err && <p className="err-text">{err}</p>}
            <label className="f"><span>Name</span><input className="inp" required value={name} onChange={e => setName(e.target.value)} /></label>
            <label className="f"><span>Phone</span><input className="inp" required value={phone} onChange={e => setPhone(e.target.value)} /></label>
            <label className="f"><span>Email (optional)</span><input className="inp" type="email" value={email} onChange={e => setEmail(e.target.value)} /></label>
            <div style={{ display: 'flex', gap: 8 }}><button type="button" className="btn" onClick={onClose}>Cancel</button><button className="btn pri" disabled={busy}>Register</button></div>
          </form>
        )}
      </div>
    </div>
  );
}
