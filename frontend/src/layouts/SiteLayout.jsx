import { useState } from 'react';
import { NavLink, Outlet, Link } from 'react-router-dom';
import { useCustomerAuth } from '../context/CustomerAuthContext';

const LINKS = [
  ['/', 'Home'], ['/games', 'Games'], ['/stations', 'Stations'], ['/pricing', 'Pricing'], ['/book', 'Book a Session'],
  ['/events', 'Events'], ['/about', 'About'], ['/contact', 'Contact']
];
const DASHBOARD_URL = import.meta.env.VITE_DASHBOARD_URL || 'http://localhost:5174';

export default function SiteLayout() {
  const [open, setOpen] = useState(false);
  const { user } = useCustomerAuth();

  return (
    <div>
      <header className="topnav">
        <div className="wrap topnav-in">
          <Link to="/" className="brand">GameBreak</Link>
          <nav className="nav-links">
            {LINKS.map(([to, label]) => <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => isActive ? 'active' : ''}>{label}</NavLink>)}
            {user ? <NavLink to="/account">My Account</NavLink> : <NavLink to="/login">Sign in</NavLink>}
            {user && <NavLink to="/my-bookings">My Bookings</NavLink>}
            <a className="nav-admin" href={DASHBOARD_URL} target="_blank" rel="noopener noreferrer">Admin</a>
          </nav>
          <button id="menuBtn" onClick={() => setOpen(o => !o)} aria-label="Open menu">☰</button>
        </div>
        <div className={`wrap mobile-drawer${open ? ' open' : ''}`}>
          {LINKS.map(([to, label]) => <Link key={to} to={to} onClick={() => setOpen(false)}>{label}</Link>)}
          {user ? <Link to="/account" onClick={() => setOpen(false)}>My Account</Link> : <Link to="/login" onClick={() => setOpen(false)}>Sign in</Link>}
          {user && <Link to="/my-bookings" onClick={() => setOpen(false)}>My Bookings</Link>}
          <a href={DASHBOARD_URL} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--neon)' }}>Admin</a>
        </div>
      </header>
      <Outlet />
      <footer>
        <div className="wrap">© {new Date().getFullYear()} GameBreak. All rights reserved.</div>
      </footer>
    </div>
  );
}
