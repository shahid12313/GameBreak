import { useEffect, useState } from 'react';
import { NavLink, Outlet, Link, useLocation } from 'react-router-dom';
import { useCustomerAuth } from '../context/CustomerAuthContext';
import useCatalog from '../hooks/useCatalog';

const LINKS = [
  ['/', 'Home'], ['/games', 'Games'], ['/stations', 'Stations'], ['/pricing', 'Pricing'],
  ['/events', 'Events'], ['/about', 'About'], ['/contact', 'Contact']
];
const DASHBOARD_URL = import.meta.env.VITE_DASHBOARD_URL || 'http://localhost:5174';

function fmtHour(h) { const hh = h % 24; return `${hh % 12 || 12} ${hh < 12 ? 'AM' : 'PM'}`; }

export default function SiteLayout() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { user } = useCustomerAuth();
  const { pathname } = useLocation();
  const catalog = useCatalog();
  const s = catalog?.settings;

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
          <nav className="nav-links">
            {LINKS.map(([to, label]) => <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => isActive ? 'active' : ''}>{label}</NavLink>)}
            {user ? <NavLink to="/account">My Account</NavLink> : <NavLink to="/login">Sign in</NavLink>}
            {user && <NavLink to="/my-bookings">My Bookings</NavLink>}
            <Link className="btn pri sm nav-cta" to="/book">Book now</Link>
          </nav>
          <button id="menuBtn" className={open ? 'x' : ''} onClick={() => setOpen(o => !o)} aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open}>
            <span /><span /><span />
          </button>
        </div>
        <div className={`wrap mobile-drawer${open ? ' open' : ''}`}>
          {LINKS.map(([to, label], k) => <Link key={to} to={to} style={{ '--k': k }}>{label}</Link>)}
          {user ? <Link to="/account">My Account</Link> : <Link to="/login">Sign in</Link>}
          {user && <Link to="/my-bookings">My Bookings</Link>}
          <Link className="btn pri block" to="/book" style={{ marginTop: 8 }}>Book a Session</Link>
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
            {s?.contactName && <span>{s.contactName}</span>}
            {s?.address && <span>{s.address}</span>}
            {s && <span>Open daily {fmtHour(s.open)} – {fmtHour(s.close)}</span>}
            {s?.phone && <span>{s.phone}</span>}
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
