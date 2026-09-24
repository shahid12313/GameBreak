/* Original animated backdrops for "coming soon" promos, drawn in SVG/CSS.
   They evoke each game's setting without using any official artwork. */

function Palm({ x, y, s = 1, flip = false, delay = 0 }) {
  const leaves = [-160, -128, -96, -64, -32, -8, 18];
  return (
    <g transform={`translate(${x} ${y}) scale(${flip ? -s : s} ${s})`}>
      <path d="M0 0 C 14 -120 -6 -250 34 -380" stroke="#12051c" strokeWidth="16" fill="none" strokeLinecap="round" />
      <g className="palm-crown" style={{ animationDelay: `${delay}s` }} transform="translate(34 -380)">
        {leaves.map(a => (
          <path key={a} transform={`rotate(${a})`} d="M0 0 Q 70 -34 170 18 Q 120 0 96 6 Q 60 -8 0 0Z" fill="#12051c" />
        ))}
      </g>
    </g>
  );
}

function Vice() {
  return (
    <div className="art art-vice" aria-hidden="true">
      <div className="vice-stars" />
      <div className="vice-sun"><i /><i /><i /><i /><i /></div>
      <div className="vice-sea" />
      <div className="vice-grid" />
      <svg className="vice-palms" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMax slice">
        <Palm x={1180} y={900} s={1.25} delay={0} />
        <Palm x={1420} y={930} s={1.5} flip delay={0.8} />
        <Palm x={120} y={940} s={1.1} delay={1.4} />
        <Palm x={930} y={910} s={0.8} flip delay={0.4} />
      </svg>
    </div>
  );
}

function Claws() {
  return (
    <div className="art art-claws" aria-hidden="true">
      <div className="claws-glow" />
      <svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice">
        {[0, 1, 2].map(k => (
          <path key={k} className="claw" style={{ animationDelay: `${0.25 + k * 0.14}s` }}
            d={`M${980 + k * 110} 120 C ${1040 + k * 110} 360 ${1130 + k * 110} 560 ${1250 + k * 110} 790`}
            stroke="url(#clawG)" strokeWidth={26 - k * 4} strokeLinecap="round" fill="none" />
        ))}
        <defs>
          <linearGradient id="clawG" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fff" stopOpacity="0" /><stop offset=".35" stopColor="#ffe3e3" /><stop offset="1" stopColor="#ff3b3b" stopOpacity=".2" />
          </linearGradient>
        </defs>
      </svg>
      <div className="embers">{Array.from({ length: 18 }, (_, k) => <i key={k} style={{ '--x': `${(k * 53) % 100}%`, '--t': `${4 + (k % 5)}s`, '--dl': `${(k * 0.37) % 4}s` }} />)}</div>
    </div>
  );
}

function Atlantis() {
  return (
    <div className="art art-atlantis" aria-hidden="true">
      <div className="atl-rays" />
      <svg className="atl-ruins" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMax slice">
        <path fill="#021a1f" d="M860 900V600h30v-20h140v20h30v300h-40V640h-30v260h-40V640h-30v260zM1120 900V520h24v-16h120v16h24v380h-36V560h-24v340h-36V560h-24v340zM1340 900V650h200v250z" />
        <path fill="#032a30" d="M0 900 Q 400 780 800 860 T 1600 820 V900Z" />
      </svg>
      <div className="bubbles">{Array.from({ length: 16 }, (_, k) => <i key={k} style={{ '--x': `${(k * 61) % 100}%`, '--s': `${6 + (k % 4) * 4}px`, '--t': `${6 + (k % 6)}s`, '--dl': `${(k * 0.53) % 6}s` }} />)}</div>
    </div>
  );
}

function Noir() {
  const towers = [[820, 330], [900, 460], [990, 380], [1070, 520], [1170, 300], [1260, 440], [1350, 360], [1450, 500], [1530, 340]];
  return (
    <div className="art art-noir" aria-hidden="true">
      <svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMax slice">
        {towers.map(([x, h], k) => (
          <g key={x}>
            <rect x={x} y={900 - h} width="80" height={h} fill="#07060f" />
            {Array.from({ length: Math.floor(h / 46) }, (_, r) => (
              <rect key={r} className="win" style={{ animationDelay: `${(k * 7 + r * 3) % 11 * 0.4}s` }}
                x={x + 14 + (r % 2) * 30} y={900 - h + 20 + r * 44} width="18" height="10" fill={(k + r) % 3 ? '#ffb347' : '#ff4fa3'} />
            ))}
          </g>
        ))}
      </svg>
      <div className="rain" />
    </div>
  );
}

const THEMES = { vice: Vice, claws: Claws, atlantis: Atlantis, noir: Noir };

export default function PromoArt({ theme }) {
  const Art = THEMES[theme] || Vice;
  return <Art />;
}
