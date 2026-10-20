import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles/theme.css';
import './styles/site.css';

/* Lower-end phones (≤4 GB memory or ≤4 cores) and data-saver users get "lite"
   mode: the always-moving background decorations hold still so scrolling stays
   smooth. Interactive animations are unaffected — see .lite in site.css. */
const nav = navigator;
if ((nav.deviceMemory && nav.deviceMemory <= 4) || (nav.hardwareConcurrency && nav.hardwareConcurrency <= 4) || nav.connection?.saveData) {
  document.documentElement.classList.add('lite');
}

createRoot(document.getElementById('root')).render(
  <StrictMode><App /></StrictMode>
);
