import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/* Mirrors the reference site's Operations / Administration grouping. Each
   item's minRole is enforced again server-side by every route it calls —
   hiding it here is only so nobody lands on a page that's just a wall of
   403 errors; it is not itself a security boundary. */
const NAV = [
  ['Operations', [
    ['/', 'Dashboard', 'Staff'],
    ['/sessions', 'Live Sessions', 'Staff'],
    ['/customers', 'Customers', 'Staff'],
    ['/bookings', 'Bookings', 'Manager'],
    ['/waiting', 'Waiting List', 'Manager'],
    ['/bookings/web', 'Web Bookings', 'Manager']
  ]],
  ['Administration', [
    ['/pricing', 'Pricing', 'Admin'],
    ['/discounts', 'Discounts', 'Admin'],
    ['/revenue', 'Revenue', 'Admin'],
    ['/expenses', 'Expenses', 'Admin'],
    ['/inventory', 'Inventory', 'Admin'],
    ['/events', 'Events', 'Admin'],
    ['/staff', 'Staff', 'Owner'],
    ['/settings', 'Settings', 'Admin']
  ]]
];

export default function DashboardLayout() {
  const { user, logout, hasRole } = useAuth();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  function doLogout() { logout(); navigate('/login', { replace: true }); }

  return (
    <div className="app-shell">
      <aside className={`sidebar${open ? ' open' : ''}`} aria-label="Main navigation">
        <div className="brand"><b>GameBreak</b><small>Admin dashboard</small></div>
        <nav>
          {NAV.map(([section, items]) => {
            const visible = items.filter(([, , minRole]) => hasRole(minRole));
            if (!visible.length) return null;
            return (
              <div key={section}>
                <div className="nav-sec">{section}</div>
                {visible.map(([to, label]) => (
                  <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`} onClick={() => setOpen(false)}>
                    {label}
                  </NavLink>
                ))}
              </div>
            );
          })}
        </nav>
        <div className="who">
          <span className="av">{(user?.name || user?.email || '?').charAt(0).toUpperCase()}</span>
          <span style={{ minWidth: 0, flex: 1 }}>
            <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--tx)' }}>{user?.name || user?.email}</span>
            <span className="c-mut">{user?.role}</span>{' '}
            <button className="btn sm" style={{ padding: '2px 8px', marginLeft: 4 }} onClick={doLogout}>Sign out</button>
          </span>
        </div>
      </aside>
      <div className={`scrim${open ? ' open' : ''}`} onClick={() => setOpen(false)} />
      <main className="main">
        <div className="topbar">
          <button id="menuBtn" onClick={() => setOpen(true)} aria-label="Open menu">☰</button>
          <span className="pill"><i /> Live</span>
        </div>
        <Outlet />
      </main>
    </div>
  );
}
