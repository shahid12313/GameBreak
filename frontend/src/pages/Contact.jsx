import useCatalog from '../hooks/useCatalog';
import PageHeader from '../components/PageHeader';
import Reveal from '../components/Reveal';
import { Loading } from '../components/LoadingState';
import { photos } from '../assets/photos';

export default function Contact() {
  const catalog = useCatalog();
  const s = catalog?.settings;
  const tel = s?.phone?.replace(/[^\d+]/g, '');
  const wa = s?.phone && `92${s.phone.replace(/\D/g, '').replace(/^0/, '')}`;

  return (
    <>
      <PageHeader img={photos.pc} eyebrow="Say hello" title="Contact">Questions, group bookings, or anything else — reach out.</PageHeader>
      <section className="wrap" style={{ maxWidth: 820 }}>
        {!catalog && <Loading label="Loading contact details…" />}
        {s && (
          <div className="grid contact-grid">
            {s.contactName && (
              <Reveal className="visit-card">
                <span className="visit-ic">👤</span><h3>Owners</h3>
                <p className="contact-big">{s.contactName.split(/\s*&\s*|\s*,\s*/).map(n => <span key={n}>{n}</span>)}</p>
              </Reveal>
            )}
            {s.phone && (
              <Reveal className="visit-card" delay={80}>
                <span className="visit-ic">📞</span><h3>Phone</h3>
                <p><a href={`tel:${tel}`} className="visit-phone">{s.phone}</a></p>
                <div className="contact-actions">
                  <a className="btn pri sm" href={`tel:${tel}`}>Call now</a>
                  <a className="btn sm" href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer">WhatsApp</a>
                </div>
              </Reveal>
            )}
            {s.address && (
              <Reveal className="visit-card" delay={160}>
                <span className="visit-ic">📍</span><h3>Address</h3>
                <p>{s.address}</p>
                <a className="visit-link" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(s.address)}`} target="_blank" rel="noopener noreferrer">Open in Google Maps →</a>
              </Reveal>
            )}
            <Reveal className="visit-card" delay={240}>
              <span className="visit-ic">🕙</span><h3>Opening hours</h3>
              <p>Every day<br /><b className="visit-hours">{fmtHour(s.open)} – {fmtHour(s.close)}</b></p>
              {s.email && <a className="visit-link" href={`mailto:${s.email}`}>{s.email}</a>}
            </Reveal>
          </div>
        )}
      </section>
    </>
  );
}

function fmtHour(h) { const hh = h % 24; const period = hh < 12 ? 'AM' : 'PM'; const h12 = hh % 12 || 12; return `${h12} ${period}${h >= 24 ? ' (next day)' : ''}`; }
