import PageHeader from '../components/PageHeader';
import { credits, photos } from '../assets/photos';

/* Attribution required by the CC BY / CC BY-SA licences of the site photos. */
export default function Credits() {
  return (
    <>
      <PageHeader eyebrow="Thank you" title="Photo credits">Photos used on this site, via Wikimedia Commons.</PageHeader>
      <section className="wrap" style={{ maxWidth: 820 }}>
        <div className="credits">
          {credits.map(c => (
            <div className="credit" key={c.key}>
              <img src={photos[c.key]} alt="" loading="lazy" />
              <div>
                <a href={c.source} target="_blank" rel="noopener noreferrer"><b>{c.title.replace(/\.(jpe?g|png)$/i, '')}</b></a>
                <p className="c-mut">
                  by {c.artist || 'unknown'} ·{' '}
                  {c.licenseUrl ? <a href={c.licenseUrl} target="_blank" rel="noopener noreferrer">{c.license}</a> : c.license}
                  {c.key === 'ps5' && ' · background removed'}
                  {c.key !== 'ps5' && c.license !== 'Public domain' && ' · resized'}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
