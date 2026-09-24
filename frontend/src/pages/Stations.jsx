import useCatalog from '../hooks/useCatalog';
import { Loading } from '../components/LoadingState';
import PageHeader from '../components/PageHeader';
import Reveal from '../components/Reveal';
import { photos, gamePhoto, isCutout } from '../assets/photos';

export default function Stations() {
  const catalog = useCatalog();
  const total = catalog ? catalog.games.reduce((s, g) => s + g.stations, 0) : 0;

  return (
    <>
      <PageHeader img={photos.pc} eyebrow="The floor" title="Gaming Stations">
        {catalog ? `${total} stations across ${catalog.games.length} games.` : 'How many of each setup we have.'}
      </PageHeader>
      <section className="wrap">
        {!catalog && <Loading />}
        {catalog && (
          <div className="grid st-grid">
            {catalog.games.map((g, k) => {
              const img = gamePhoto(g.name);
              return (
                <Reveal className="st-card" key={g._id} delay={k * 80}>
                  <div className={`st-thumb${isCutout(img) ? ' cut' : ''}`}><img src={img} alt="" loading="lazy" /></div>
                  <div>
                    <h3>{g.icon} {g.name}</h3>
                    <p className="c-mut">{g.stations} station{g.stations === 1 ? '' : 's'} available to book</p>
                    <div className="st-pips" aria-hidden="true">
                      {Array.from({ length: Math.min(g.stations, 12) }, (_, j) => <i key={j} style={{ animationDelay: `${j * 120}ms` }} />)}
                    </div>
                  </div>
                </Reveal>
              );
            })}
          </div>
        )}
      </section>
    </>
  );
}
