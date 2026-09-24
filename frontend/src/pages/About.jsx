export default function About() {
  return (
    <section className="wrap" style={{ paddingTop: 40, maxWidth: 720 }}>
      <h1 className="sec-title">About GameBreak</h1>
      <p style={{ color: 'var(--tx2)', lineHeight: 1.8 }}>
        GameBreak is a gaming lounge with the latest consoles, a full racing simulator rig, and gaming PCs —
        all bookable online or walk-in. Whether you're here for a quick match or a full tournament night,
        our team keeps every station ready to go.
      </p>
      <div className="grid grid-3" style={{ marginTop: 24 }}>
        <div className="card"><b>🎮 Latest gear</b><p className="c-mut">PS5, PC and a real racing rig, kept fresh and well maintained.</p></div>
        <div className="card"><b>💳 Fair pricing</b><p className="c-mut">Pay by the minute or by the session — whatever suits your visit.</p></div>
        <div className="card"><b>🏆 Community events</b><p className="c-mut">Weekly tournaments and watch parties for every skill level.</p></div>
      </div>
    </section>
  );
}
