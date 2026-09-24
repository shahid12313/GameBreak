import ps5 from './ps5.webp';
import ps4 from './ps4.webp';
import sim from './sim.webp';
import pc from './pc.webp';
import crowd from './crowd.webp';
import credits from './credits.json';

export const photos = { ps5, ps4, sim, pc, crowd };
export { credits };

/* Games are created by staff in the dashboard, so match on name rather than
   id. Anything unrecognised falls back to the general lounge shot. */
const RULES = [
  [/ps\s*5|playstation\s*5/i, 'ps5'],
  [/ps\s*4|playstation\s*4/i, 'ps4'],
  [/sim|racing|driv|wheel/i, 'sim'],
  [/\bpc\b|computer|desktop|valorant|cs2|steam/i, 'pc'],
  [/playstation|console|xbox|controller/i, 'ps5'],
];

export function gamePhoto(name = '') {
  const hit = RULES.find(([re]) => re.test(name));
  return photos[hit ? hit[1] : 'crowd'];
}

/* Transparent product shots float on a glow instead of being cropped. */
export const isCutout = src => src === ps4 || src === ps5;

/* Short marketing line per photo, used on the slider and game cards. */
export const TAGLINES = {
  [ps5]: 'Next-gen PlayStation with DualSense haptics',
  [ps4]: 'The classics, co-op and couch favourites',
  [sim]: 'Wheel, pedals and bucket seat — feel every corner',
  [pc]: 'High-refresh PCs built for competitive play',
  [crowd]: 'Grab your squad and play',
};
