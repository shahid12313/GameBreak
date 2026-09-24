'use strict';
const { PricingPackage } = require('../models');

/** Resolves a game's active pricing for a given date into the {method,...}
 *  shape utils/billing.js already understands, so billing.js never needs to
 *  know PricingPackage exists. Weekend-specific records (Sat/Sun) win over
 *  "all" records when both exist; otherwise "all" applies every day. */
async function resolveGamePricing(gameId, forDate = new Date()) {
  const isWeekend = [0, 6].includes(forDate.getDay());
  const all = await PricingPackage.find({ gameId, active: true, dayType: { $ne: 'event' } }).lean();
  const weekendSet = all.filter(p => p.dayType === 'weekend');
  const rows = isWeekend && weekendSet.length ? weekendSet : all.filter(p => p.dayType === 'all');

  const hourly = rows.find(p => p.kind === 'hourly');
  if (hourly) {
    return { method: 'minute', rate: hourly.price / 60, min: 0, grace: 0, round: 'floor' };
  }
  const sessions = rows.filter(p => p.kind === 'session' && p.durationMinutes > 0);
  if (sessions.length) {
    return {
      method: 'session',
      pk: sessions
        .sort((a, b) => a.durationMinutes - b.durationMinutes)
        .map(p => ({ l: p.label || `${p.durationMinutes} min`, m: p.durationMinutes, p: p.price }))
    };
  }
  return null; // no active pricing at all for this game right now
}

/** For the pricing management screen: every record for a game, grouped by dayType. */
async function listGamePricing(gameId) {
  return PricingPackage.find({ gameId }).sort({ dayType: 1, kind: 1, durationMinutes: 1 });
}

module.exports = { resolveGamePricing, listGamePricing };
