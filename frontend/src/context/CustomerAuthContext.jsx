import { createContext, useContext, useEffect, useState } from 'react';
import api from '../services/api';

const Ctx = createContext(null);
const TOKEN_KEY = 'gb_customer_token';

export function CustomerAuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) { setLoading(false); return; }
    api.get('/customer-auth/me').then(r => setUser(r.data.user)).catch(() => localStorage.removeItem(TOKEN_KEY)).finally(() => setLoading(false));
  }, []);

  function applySession(token, user) { localStorage.setItem(TOKEN_KEY, token); setUser(user); }
  async function login(email, password) { const r = await api.post('/customer-auth/login', { email, password }); applySession(r.data.token, r.data.user); }
  async function register(name, email, phone, password) { const r = await api.post('/customer-auth/register', { name, email, phone, password }); applySession(r.data.token, r.data.user); }
  function logout() { localStorage.removeItem(TOKEN_KEY); setUser(null); }

  return <Ctx.Provider value={{ user, loading, login, register, logout }}>{children}</Ctx.Provider>;
}
export function useCustomerAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useCustomerAuth must be used inside CustomerAuthProvider');
  return ctx;
}
