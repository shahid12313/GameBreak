import { useEffect, useState } from 'react';
import { NavLink, Outlet, Link, useLocation } from 'react-router-dom';
import { useCustomerAuth } from '../context/CustomerAuthContext';
import useCatalog, { money } from '../hooks/useCatalog';
import api from '../services/api';
import Ticker from '../components/Ticker';
import { current, isOut, daysLeft } from '../content/upcoming';

const LINKS = [
  ['/', 'Home'], ['/games', 'Games'], ['/stations', 'Stations'], ['/pricing', 'Pricing'],
  ['/events', 'Events'], ['/about', 'About'], ['/contact', 'Contact']
];
const DASHBOARD_URL = import.meta.env.VITE_DASHBOARD_URL || 'http://localhost:5174';

function fmtHour(h) { const hh = h % 24; return `${hh % 12 || 12} ${hh < 12 ? 'AM' : 'PM'}`; }

/* Is the lounge open right now, in Pakistan time? close may run past
   midnight (e.g. 26 = 2 AM next day). */
function openState(s) {
  if (!s) return null;
  const h = Number(new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hourCycle: 'h23', timeZone: 'Asia/Karachi' }).format(new Date()));
  const open = h >= s.open ? h < s.close : h + 24 < s.close;
  return open ? { open, label: `Open now · until ${fmtHour(s.close)}` } : { open, label: `Closed · opens ${fmtHour(s.open)}` };
}

function tickerItems(s, events, status) {
  const items = [];
  if (status) items.push(`${status.open ? '🟢' : '🟠'} ${status.label}`);
  current().forEach(r => items.push(isOut(r)
    ? `🔥 ${r.title} — out now on ${r.platforms}`
    : `⏳ ${r.title} — ${daysLeft(r)} days to go (${r.platforms})`));
  events.slice(0, 3).forEach(ev => items.push(`🏆 ${ev.title} — ${new Date(ev.t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} · ${ev.fee ? money(ev.fee) : 'free entry'}`));
  items.push('🎮 PS5 · PS4 Pro · Gaming PCs · Racing simulator');
  items.push('⚡ Book online in under a minute — no app needed');
  if (s?.address) items.push(`📍 ${s.address}`);
  if (s?.phone) items.push(`📞 Call ${s.contactName ? `${s.contactName} on ` : ''}${s.phone}`);
  return items;
}

export default function SiteLayout() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { user } = useCustomerAuth();
  const { pathname } = useLocation();
  const catalog = useCatalog();
  const s = catalog?.settings;
  const [events, setEvents] = useState([]);
  const [, tick] = useState(0);
  useEffect(() => { api.get('/public/events').then(r => setEvents(r.data)).catch(() => {}); }, []);
  // Re-evaluate the open/closed badge every minute.
  useEffect(() => { const t = setInterval(() => tick(x => x + 1), 60000); return () => clearInterval(t); }, []);
  const status = openState(s);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // New page → start at the top and close the mobile menu.
  useEffect(() => { window.scrollTo(0, 0); setOpen(false); }, [pathname]);

  const overHero = pathname === '/' && !scrolled && !open;

  return (
    <div className="site">
      <header className={`topnav${scrolled ? ' scrolled' : ''}${overHero ? ' clear' : ''}`}>
        <div className="wrap topnav-in">
          <Link to="/" className="brand"><span className="brand-mark" aria-hidden="true">◆</span>{s?.name || 'GameBreak'}</Link>
          {status && <span className={`open-pill${status.open ? '' : ' closed'}`}><i />{status.label}</span>}
          <nav className="nav-links">
            {LINKS.map(([to, label]) => <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => isActive ? 'active' : ''}>{label}</NavLink>)}
            {user ? <NavLink to="/account">My Account</NavLink> : <NavLink to="/login">Sign in</NavLink>}
            {user && <NavLink to="/my-bookings">My Bookings</NavLink>}
            <a className="btn sm nav-staff" href={DASHBOARD_URL} target="_blank" rel="noopener noreferrer">🔒 Staff login</a>
            <Link className="btn pri sm nav-cta" to="/book">Book now</Link>
          </nav>
          <button id="menuBtn" className={open ? 'x' : ''} onClick={() => setOpen(o => !o)} aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open}>
            <span /><span /><span />
          </button>
        </div>
        <Ticker items={tickerItems(s, events, status)} />
        <div className={`wrap mobile-drawer${open ? ' open' : ''}`}>
          {LINKS.map(([to, label], k) => <Link key={to} to={to} style={{ '--k': k }}>{label}</Link>)}
          {user ? <Link to="/account">My Account</Link> : <Link to="/login">Sign in</Link>}
          {user && <Link to="/my-bookings">My Bookings</Link>}
          <Link className="btn pri block" to="/book" style={{ marginTop: 8 }}>Book a Session</Link>
          <a className="btn block" href={DASHBOARD_URL} target="_blank" rel="noopener noreferrer" style={{ marginTop: 6 }}>🔒 Staff login</a>
        </div>
      </header>

      <main key={pathname} className="page-enter">
        <Outlet />
      </main>

      <footer className="site-foot">
        <div className="wrap foot-grid">
          <div>
            <Link to="/" className="brand"><span className="brand-mark" aria-hidden="true">◆</span>{s?.name || 'GameBreak'}</Link>
            <p className="c-mut">Consoles, PCs and a racing simulator — book online or walk in.</p>
          </div>
          <div>
            <h4>Explore</h4>
            <Link to="/games">Games</Link><Link to="/pricing">Pricing</Link><Link to="/events">Events</Link><Link to="/book">Book a Session</Link>
          </div>
          <div>
            <h4>Visit</h4>
            {s?.contactName && <span>👤 {s.contactName}</span>}
            {s?.address && <span>📍 {s.address}</span>}
            {s && <span>🕙 Open daily {fmtHour(s.open)} – {fmtHour(s.close)}</span>}
            {s?.phone && <a href={`tel:${s.phone.replace(/[^\d+]/g, '')}`}>📞 {s.phone}</a>}
            {s?.email && <a href={`mailto:${s.email}`}>✉️ {s.email}</a>}
            <Link to="/contact">Contact us</Link>
          </div>
        </div>
        <div className="wrap foot-base">
          <span>© {new Date().getFullYear()} {s?.name || 'GameBreak'}. All rights reserved.</span>
          <span><Link to="/credits">Photo credits</Link> · <a href={DASHBOARD_URL} target="_blank" rel="noopener noreferrer">Staff login</a></span>
        </div>
      </footer>
    </div>
  );
}
