import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loading } from '../components/LoadingState';

/** Wraps the whole dashboard route tree. A customer (or anyone with no
 *  valid staff token) is bounced to /login — simply knowing the URL is
 *  never enough to see dashboard pages. minRole additionally hides a
 *  specific page from roles below it (the API enforces this regardless;
 *  this is just so the UI doesn't dead-end someone on a page full of 403s). */
export default function ProtectedRoute({ minRole }) {
  const { user, loading, hasRole } = useAuth();
  if (loading) return <div className="login-wrap"><Loading label="Loading your session…" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (minRole && !hasRole(minRole)) return <Navigate to="/" replace />;
  return <Outlet />;
}
