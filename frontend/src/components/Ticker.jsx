/* Endless scrolling news strip. Items are duplicated so the loop is seamless. */
export default function Ticker({ items }) {
  if (!items.length) return null;
  const row = items.map((t, k) => <span className="tk-item" key={k}>{t}</span>);
  return (
    <div className="ticker" role="marquee" aria-label="Latest news">
      <div className="tk-label"><i className="live-dot" /> Live</div>
      <div className="tk-viewport">
        <div className="tk-track" style={{ animationDuration: `${Math.max(24, items.length * 7)}s` }}>
          <div className="tk-row">{row}</div>
          <div className="tk-row" aria-hidden="true">{row}</div>
        </div>
      </div>
    </div>
  );
}
