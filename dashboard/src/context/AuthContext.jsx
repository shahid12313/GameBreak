import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import api, { setUnauthorizedHandler } from '../services/api';

const AuthContext = createContext(null);
const TOKEN_KEY = 'gb_dashboard_token';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [needsBootstrap, setNeedsBootstrap] = useState(false);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
  }, []);

  useEffect(() => { setUnauthorizedHandler(logout); }, [logout]);

  useEffect(() => {
    (async () => {
      const token = localStorage.getItem(TOKEN_KEY);
      if (!token) {
        try { const s = await api.get('/auth/status'); setNeedsBootstrap(s.data.needsBootstrap); } catch { /* backend unreachable — login screen will show the error on submit */ }
        setLoading(false);
        return;
      }
      try {
        const res = await api.get('/auth/me');
        setUser(res.data.user);
      } catch {
        localStorage.removeItem(TOKEN_KEY);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function applySession(token, user) {
    localStorage.setItem(TOKEN_KEY, token);
    setUser(user);
    setNeedsBootstrap(false);
  }

  async function login(email, password) {
    const res = await api.post('/auth/login', { email, password });
    applySession(res.data.token, res.data.user);
  }
  async function bootstrap(name, email, password) {
    const res = await api.post('/auth/bootstrap', { name, email, password });
    applySession(res.data.token, res.data.user);
  }

  const ROLE_LEVEL = { Owner: 4, Admin: 3, Manager: 2, Staff: 1 };
  const hasRole = min => !!user && ROLE_LEVEL[user.role] >= ROLE_LEVEL[min];

  return (
    <AuthContext.Provider value={{ user, loading, needsBootstrap, login, bootstrap, logout, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
