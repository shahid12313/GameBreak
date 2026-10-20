import { useEffect, useState } from 'react';
import api from '../services/api';

/* The public catalog barely changes during a visit, so share one request
   across pages — navigating Home → Games → Pricing renders instantly. */
let cached = null;
let inflight = null;

function load() {
  inflight ||= api.get('/public/catalog')
    .then(r => (cached = r.data))
    .catch(() => { inflight = null; return { settings: null, games: [] }; });
  return inflight;
}
load(); // start as soon as the site's code loads, before the first page even renders

export default function useCatalog() {
  const [catalog, setCatalog] = useState(cached);
  useEffect(() => {
    if (cached) return;
    let live = true;
    load().then(d => live && setCatalog(d));
    return () => { live = false; };
  }, []);
  return catalog;
}

export const money = n => 'PKR ' + Math.round(n).toLocaleString('en-US');

/* "0325-9347619" → a wa.me chat link (Pakistan country code), optionally with a pre-written message. */
export const waLink = (phone, text) =>
  `https://wa.me/92${String(phone).replace(/\D/g, '').replace(/^(92|0)/, '')}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
export const telLink = phone => `tel:${String(phone).replace(/[^\d+]/g, '')}`;

/* Cheapest weekday price, as a short label ("from PKR 300" / "PKR 600/hr"). */
export function fromPrice(g) {
  const w = g?.weekday;
  if (w?.method === 'session' && w.pk?.length) return `from ${money(Math.min(...w.pk.map(p => p.p)))}`;
  if (w?.method === 'minute') return `${money(w.rate * 60)}/hr`;
  return null;
}
