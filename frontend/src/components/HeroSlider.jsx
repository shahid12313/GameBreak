import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { photos, gamePhoto, isCutout, TAGLINES } from '../assets/photos';
import { fromPrice } from '../hooks/useCatalog';

const INTERVAL = 6500;

/* Slide 1 is the lounge itself; the rest are built from the live catalog so
   names and prices always match what staff set in the dashboard. */
function buildSlides(catalog) {
  const name = catalog?.settings?.name || 'GameBreak';
  const intro = {
    key: 'intro', img: photos.crowd, eyebrow: `Welcome to ${name}`,
    title: <>Your next <span>gaming session</span> starts here</>,
    text: 'PS5, PC, racing simulators and more. Book online in under a minute, or just walk in.',
  };
  const games = (catalog?.games || []).slice(0, 4).map(g => {
    const img = gamePhoto(g.name);
    return {
      key: g._id, img, gameId: g._id, eyebrow: fromPrice(g) || 'Now playing',
      title: <>{g.icon} <span>{g.name}</span></>,
      text: g.description || TAGLINES[img],
    };
  });
  return [intro, ...games];
}

export default function HeroSlider({ catalog }) {
  const slides = buildSlides(catalog);
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const touch = useRef(null);
  const n = slides.length;

  const go = useCallback(d => setI(x => (x + d + n) % n), [n]);

  useEffect(() => {
    if (paused || n < 2 || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const t = setTimeout(() => go(1), INTERVAL);
    return () => clearTimeout(t);
  }, [i, paused, n, go]);

  useEffect(() => { if (i >= n) setI(0); }, [i, n]);

  function onKey(e) {
    if (e.key === 'ArrowRight') go(1);
    if (e.key === 'ArrowLeft') go(-1);
  }

  return (
    <section
      className="hero-slider" aria-roledescription="carousel" aria-label="Highlights" tabIndex={0}
      onKeyDown={onKey} onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
      onTouchStart={e => { touch.current = e.touches[0].clientX; }}
      onTouchEnd={e => {
        if (touch.current == null) return;
        const dx = e.changedTouches[0].clientX - touch.current;
        if (Math.abs(dx) > 45) go(dx < 0 ? 1 : -1);
        touch.current = null;
      }}
    >
      {slides.map((s, k) => {
        const cut = isCutout(s.img);
        return (
          <div key={s.key} className={`hs-slide${k === i ? ' on' : ''}${cut ? ' cut' : ''}`} aria-hidden={k !== i} role="group" aria-roledescription="slide" aria-label={`${k + 1} of ${n}`}>
            {cut
              ? <div className="hs-stage"><img src={s.img} alt="" className="hs-product" /></div>
              : <img src={s.img} alt="" className="hs-bg" loading={k === 0 ? 'eager' : 'lazy'} />}
            <div className="hs-shade" />
            <div className="wrap hs-content">
              <p className="hs-eyebrow">{s.eyebrow}</p>
              <h1 className="hs-title">{s.title}</h1>
              <p className="hs-text">{s.text}</p>
              <div className="hero-actions hs-actions">
                <Link className="btn pri lg" to="/book" state={s.gameId ? { gameId: s.gameId } : undefined} tabIndex={k === i ? 0 : -1}>Book a Session</Link>
                <Link className="btn ghost lg" to={s.gameId ? '/pricing' : '/games'} tabIndex={k === i ? 0 : -1}>{s.gameId ? 'See prices' : 'Explore games'}</Link>
              </div>
            </div>
          </div>
        );
      })}

      {n > 1 && (
        <>
          <button className="hs-arrow prev" onClick={() => go(-1)} aria-label="Previous slide">‹</button>
          <button className="hs-arrow next" onClick={() => go(1)} aria-label="Next slide">›</button>
          <div className="hs-dots">
            {slides.map((s, k) => (
              <button key={s.key} className={`hs-dot${k === i ? ' on' : ''}${paused ? ' paused' : ''}`} onClick={() => setI(k)} aria-label={`Go to slide ${k + 1}`}>
                <i style={{ animationDuration: `${INTERVAL}ms` }} />
              </button>
            ))}
          </div>
        </>
      )}
      <div className="hs-scroll" aria-hidden="true"><span /></div>
    </section>
  );
}
