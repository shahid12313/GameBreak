import axios from 'axios';

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api' });

api.interceptors.request.use(config => {
  const token = localStorage.getItem('gb_customer_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export function apiErrorMessage(err) {
  return err?.response?.data?.error || 'Something went wrong. Please try again.';
}

export default api;
