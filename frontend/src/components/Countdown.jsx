import { useEffect, useState } from 'react';

/* Live days/hours/minutes/seconds countdown to `to` (ms timestamp). */
export default function Countdown({ to, compact = false }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const left = Math.max(0, to - now);
  const parts = [
    [Math.floor(left / 86400000), 'Days'],
    [Math.floor(left / 3600000) % 24, 'Hrs'],
    [Math.floor(left / 60000) % 60, 'Min'],
    [Math.floor(left / 1000) % 60, 'Sec'],
  ];

  return (
    <div className={`countdown${compact ? ' compact' : ''}`} role="timer" aria-label={`${parts[0][0]} days ${parts[1][0]} hours left`}>
      {parts.map(([v, l]) => (
        <div className="cd-cell" key={l}>
          <b key={v}>{String(v).padStart(2, '0')}</b>
          <span>{l}</span>
        </div>
      ))}
    </div>
  );
}
