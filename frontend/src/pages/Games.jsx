import useCatalog from '../hooks/useCatalog';
import { Loading, EmptyState } from '../components/LoadingState';
import PageHeader from '../components/PageHeader';
import GameCard from '../components/GameCard';
import Reveal from '../components/Reveal';
import { photos } from '../assets/photos';

export default function Games() {
  const catalog = useCatalog();

  return (
    <>
      <PageHeader img={photos.crowd} eyebrow="The lineup" title="Games">
        Everything you can play at {catalog?.settings?.name || 'GameBreak'}.
      </PageHeader>
      <section className="wrap">
        {!catalog && <Loading />}
        {catalog && !catalog.games.length && <EmptyState>Nothing listed yet — check back soon.</EmptyState>}
        {catalog && catalog.games.length > 0 && (
          <div className="grid gcard-grid">
            {catalog.games.map((g, k) => <Reveal key={g._id} delay={k * 80}><GameCard game={g} /></Reveal>)}
          </div>
        )}
      </section>
    </>
  );
}
