import axios from 'axios';

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api' });

api.interceptors.request.use(config => {
  const token = localStorage.getItem('gb_dashboard_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/** Every backend error comes back as {error: "human readable message"} —
 *  this normalizes that into a plain string so components never have to
 *  reach into err.response.data.error themselves. */
export function apiErrorMessage(err) {
  return err?.response?.data?.error || 'Something went wrong. Please try again.';
}

let onUnauthorized = null;
export function setUnauthorizedHandler(fn) { onUnauthorized = fn; }
api.interceptors.response.use(
  res => res,
  err => {
    if (err?.response?.status === 401 && onUnauthorized) onUnauthorized();
    return Promise.reject(err);
  }
);

export default api;
