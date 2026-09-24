/* Upcoming game releases shown in the hero slider, the "Coming soon" section
   and the news ticker. Edit this list to add/remove games — each release
   automatically switches from a countdown to "Out now" on its date.

   Artwork is original (see components/PromoArt.jsx); never use official
   game logos or key art here, they're copyrighted/trademarked.

   theme: 'vice' | 'claws' | 'atlantis' | 'noir'
   Dates verified 2026-09-24. */
const UPCOMING = [
  {
    id: 'gta6', title: 'Grand Theft Auto VI', short: 'GTA VI', date: '2026-11-19',
    platforms: 'PS5 · Xbox Series X|S', theme: 'vice', featured: true,
    tagline: 'Back to Vice City. The most anticipated game ever lands this November — plan your launch-week session now.',
  },
  {
    id: 'wolverine', title: "Marvel's Wolverine", short: 'Wolverine', date: '2026-09-15',
    platforms: 'PS5', theme: 'claws',
    tagline: "Insomniac's brutal new PlayStation exclusive.",
  },
  {
    id: 'sth', title: 'Stranger Than Heaven', short: 'Stranger Than Heaven', date: '2027-01-15',
    platforms: 'PS5 · PC · Xbox Series X|S', theme: 'noir',
    tagline: 'A crime drama told through music, across decades of Japanese history.',
  },
  {
    id: 'tomb', title: 'Tomb Raider: Legacy of Atlantis', short: 'Tomb Raider', date: '2027-02-12',
    platforms: 'PS5 · PC · Xbox Series X|S', theme: 'atlantis',
    tagline: 'Lara Croft goes hunting for a lost civilisation.',
  },
];

const DAY = 86400000;
/* Release dates are local midnight in Pakistan (UTC+5). */
export const releaseTime = r => Date.parse(`${r.date}T00:00:00+05:00`);
export const isOut = (r, now = Date.now()) => releaseTime(r) <= now;
export const daysLeft = (r, now = Date.now()) => Math.max(0, Math.ceil((releaseTime(r) - now) / DAY));
/* Keep "Out now" items for 30 days, then drop them. */
export const current = (now = Date.now()) => UPCOMING.filter(r => releaseTime(r) + 30 * DAY > now);

export default UPCOMING;
