'use strict';
/* ---------------------------------------------------------------
   Billing math. Pure functions only (no DB, no Express) so they can
   be unit-tested directly and reused by both the "live quote while a
   session is running" endpoint and the "final bill on stop" endpoint.

   Core rule: a session is billed for the time actually used, at the
   per-minute rate implied by the price that was set for it. Picking
   a "1 Hour" package does NOT mean paying that price no matter when
   you stop — stopping early bills proportionally; running over bills
   the same rate for the extra minutes.
   --------------------------------------------------------------- */

function perMinuteAmount(snap, minutesElapsed) {
  let m = Math.max(0, minutesElapsed - (snap.grace || 0));
  m = snap.round === 'ceil' ? Math.ceil(m) : snap.round === 'round' ? Math.round(m) : Math.floor(m);
  return Math.max(snap.min || 0, m * (snap.rate || 0));
}

/** snap = the frozen pricing snapshot stored on the running session.
 *  minutesElapsed = (now - start) in minutes, may be fractional.
 *  Returns the game-only amount (no extras, no discounts) in whole currency units. */
function baseAmount(snap, minutesElapsed) {
  const min = Math.max(0, minutesElapsed);
  if (snap.method === 'minute') return perMinuteAmount(snap, min);
  const pkg = snap.pkg;
  if (!pkg || !pkg.m) return 0;
  const rate = pkg.p / pkg.m;
  return Math.round(Math.ceil(min) * rate);
}

/** Builds the pricing snapshot frozen onto a session when it starts. */
function buildSnap(game, pkIndex) {
  if (game.method === 'session') {
    const pkg = game.pk && game.pk[pkIndex];
    if (!pkg) return null;
    return { method: 'session', pkg: { l: pkg.l, m: pkg.m, p: pkg.p } };
  }
  if (!(game.rate > 0)) return null;
  return { method: 'minute', rate: game.rate, min: game.min || 0, grace: game.grace || 0, round: game.round || 'floor' };
}

/** Why a game can't be started yet (empty string = fine to start). */
function priceProblem(game) {
  if (game.method === 'session' && (!game.pk || !game.pk.length)) return `Add a package for ${game.name} in Pricing first.`;
  if (game.method === 'minute' && !(game.rate > 0)) return `Set a per-minute rate for ${game.name} in Pricing first.`;
  return '';
}

/** Evaluates one discount code against a game+duration+now. Returns {ok, reason, amountOff}. */
function evaluateCode(code, { game, minutes, baseAfterGameDiscount, now }) {
  if (!code || !code.active) return { ok: false, reason: 'This code is not valid.' };
  if (code.maxUses && code.used >= code.maxUses) return { ok: false, reason: 'This code has reached its usage limit.' };
  if (code.games && code.games.length && !code.games.map(String).includes(String(game._id))) {
    return { ok: false, reason: `This code does not apply to ${game.name}.` };
  }
  if (code.durations && code.durations.length && !code.durations.includes(minutes)) {
    return { ok: false, reason: `This code needs a ${code.durations.join('/')} min package.` };
  }
  const d = now || new Date();
  const ymd = d.toISOString().slice(0, 10);
  if ((code.from && ymd < code.from) || (code.to && ymd > code.to)) {
    return { ok: false, reason: 'This code is outside its valid dates.' };
  }
  if (code.timeFrom && code.timeTo) {
    const hm = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    if (hm < code.timeFrom || hm > code.timeTo) {
      return { ok: false, reason: `This code is valid ${code.timeFrom} to ${code.timeTo} only.` };
    }
  }
  const off = code.type === 'percent' ? Math.round((baseAfterGameDiscount * code.value) / 100) : Math.min(code.value, baseAfterGameDiscount);
  return { ok: true, amountOff: off };
}

/** Full bill breakdown for the stop/bill screen and the receipt. extras = [{item, qty}] */
function computeBill({ game, snap, minutesElapsed, extras = [], discountResult = null, now = new Date() }) {
  const base = baseAmount(snap, minutesElapsed);
  const gameDiscount = Math.round((base * (game.disc || 0)) / 100);
  const afterGameDiscount = base - gameDiscount;
  const codeDiscount = discountResult && discountResult.ok ? Math.min(discountResult.amountOff, afterGameDiscount) : 0;
  const extrasTotal = extras.reduce((sum, e) => sum + e.qty * e.item.price, 0);
  const gameAmount = afterGameDiscount - codeDiscount;
  return {
    minutes: Math.ceil(Math.max(0, minutesElapsed)),
    base, gameDiscount, codeDiscount, extrasTotal, gameAmount,
    total: gameAmount + extrasTotal
  };
}

module.exports = { perMinuteAmount, baseAmount, buildSnap, priceProblem, evaluateCode, computeBill };
