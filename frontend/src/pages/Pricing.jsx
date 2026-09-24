import { Link } from 'react-router-dom';
import useCatalog, { money } from '../hooks/useCatalog';
import { Loading } from '../components/LoadingState';
import PageHeader from '../components/PageHeader';
import Reveal from '../components/Reveal';
import { photos, gamePhoto, isCutout } from '../assets/photos';

export default function Pricing() {
  const catalog = useCatalog();

  return (
    <>
      <PageHeader img={photos.sim} eyebrow="No membership needed" title="Pricing">
        Straightforward prices. Weekend rates apply Saturday and Sunday where listed.
      </PageHeader>
      <section className="wrap">
        {!catalog && <Loading />}
        {catalog && (
          <div className="grid price-grid">
            {catalog.games.map((g, k) => {
              const img = gamePhoto(g.name);
              return (
                <Reveal className="price-card" key={g._id} delay={k * 80}>
                  <div className={`price-media${isCutout(img) ? ' cut' : ''}`}><img src={img} alt="" loading="lazy" /></div>
                  <div className="price-body">
                    <h3>{g.icon} {g.name}</h3>
                    <PriceTable label="Weekday" data={g.weekday} />
                    {g.weekend && g.weekend.method && JSON.stringify(g.weekend) !== JSON.stringify(g.weekday) && <PriceTable label="Weekend" data={g.weekend} />}
                    <Link className="btn pri block" to="/book" state={{ gameId: g._id }}>Book {g.name}</Link>
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

function PriceTable({ label, data }) {
  if (!data || !data.method) return null;
  return (
    <div className="ptable">
      <div className="ptable-label">{label}</div>
      {data.method === 'minute'
        ? <div className="ptable-row"><span>Per hour</span><b>{money(data.rate * 60)}</b></div>
        : data.pk.map(p => <div className="ptable-row" key={p.l}><span>{p.l}</span><b>{money(p.p)}</b></div>)}
    </div>
  );
}
