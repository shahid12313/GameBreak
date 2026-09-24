import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { gamePhoto, isCutout, TAGLINES } from '../assets/photos';
import { fromPrice } from '../hooks/useCatalog';

/* Photo card with a subtle 3D tilt that follows the pointer (mouse only). */
export default function GameCard({ game, showStations = true }) {
  const ref = useRef(null);
  const img = gamePhoto(game.name);
  const price = fromPrice(game);

  function onMove(e) {
    if (e.pointerType !== 'mouse') return;
    const el = ref.current, r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
    el.style.setProperty('--rx', `${(-y * 7).toFixed(2)}deg`);
    el.style.setProperty('--ry', `${(x * 9).toFixed(2)}deg`);
    el.style.setProperty('--mx', `${((x + 0.5) * 100).toFixed(1)}%`);
    el.style.setProperty('--my', `${((y + 0.5) * 100).toFixed(1)}%`);
  }
  function onLeave() {
    const el = ref.current;
    ['--rx', '--ry'].forEach(p => el.style.setProperty(p, '0deg'));
  }

  return (
    <article ref={ref} className="gcard" onPointerMove={onMove} onPointerLeave={onLeave}>
      <div className={`gcard-media${isCutout(img) ? ' cut' : ''}`}>
        <img src={img} alt={game.name} loading="lazy" />
        {price && <span className="gcard-price">{price}</span>}
        <span className="gcard-icon" aria-hidden="true">{game.icon}</span>
      </div>
      <div className="gcard-body">
        <h3>{game.name}</h3>
        <p>{game.description || TAGLINES[img]}</p>
        <div className="gcard-foot">
          {showStations && <span className="gcard-meta"><i className="live-dot" />{game.stations} station{game.stations === 1 ? '' : 's'}</span>}
          <Link className="btn sm pri" to="/book" state={{ gameId: game._id }}>Book now <span aria-hidden="true">→</span></Link>
        </div>
      </div>
      <span className="gcard-glare" aria-hidden="true" />
    </article>
  );
}
