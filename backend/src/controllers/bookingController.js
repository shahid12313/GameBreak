'use strict';
const { Booking, Station, Session } = require('../models');
const { httpError } = require('../middleware/errorHandler');
const { resolveGamePricing } = require('../utils/pricing');
const billing = require('../utils/billing');
const { nextBookingRef } = require('../utils/bookingRef');

exports.list = async (req, res) => {
  const { status } = req.query;
  const q = status && status !== 'all' ? { status } : {};
  res.json(await Booking.find(q).sort({ t: -1 }).limit(300));
};

/* Staff creating a booking by hand at the counter (e.g. a phone call-in). */
exports.create = async (req, res) => {
  const { name, phone, gameId, t, durationMinutes } = req.body || {};
  if (!name || !phone) throw httpError(400, 'Enter a name and phone number.');
  const { Game } = require('../models');
  const game = await Game.findById(gameId);
  if (!game) throw httpError(404, 'Game not found.');
  const when = new Date(t);
  if (isNaN(when.getTime())) throw httpError(400, 'Choose a valid date and time.');
  const resolved = await resolveGamePricing(game._id, when);
  if (!resolved) throw httpError(400, `Set a price for ${game.name} first.`);
  const price = priceFor(resolved, Number(durationMinutes));
  if (price == null) throw httpError(400, 'Choose a valid duration for this game.');
  const stationCount = await Station.countDocuments({ gameId: game._id });
  if (await isFull(game._id, when, Number(durationMinutes), stationCount)) throw httpError(409, 'All stations for this game are already booked at that time.');
  const booking = await Booking.create({
    ref: await nextBookingRef(), name: String(name).trim(), phone: String(phone).trim(),
    gameId: game._id, gameName: game.name, t: when, durationMinutes: Number(durationMinutes), price,
    status: 'confirmed', source: 'staff'
  });
  res.status(201).json(booking);
};

exports.setStatus = async (req, res) => {
  const { status } = req.body || {};
  const { STATUSES } = require('../models/Booking');
  if (!STATUSES.includes(status)) throw httpError(400, 'Invalid status.');
  const booking = await Booking.findByIdAndUpdate(req.params.id, { status }, { new: true });
  if (!booking) throw httpError(404, 'Booking not found.');
  res.json(booking);
};

exports.setPay = async (req, res) => {
  const { pay } = req.body || {};
  if (!['Unpaid', 'Partial', 'Paid'].includes(pay)) throw httpError(400, 'Invalid payment status.');
  const booking = await Booking.findByIdAndUpdate(req.params.id, { pay }, { new: true });
  if (!booking) throw httpError(404, 'Booking not found.');
  res.json(booking);
};

/* Turns a confirmed booking into a running Session on a chosen free station
   (i.e. "check-in"). Reuses the exact same pricing snapshot logic sessions use. */
exports.checkIn = async (req, res) => {
  const booking = await Booking.findById(req.params.id);
  if (!booking) throw httpError(404, 'Booking not found.');
  if (!['pending', 'confirmed'].includes(booking.status)) throw httpError(400, 'This booking is not awaiting check-in.');
  const station = await Station.findOne({ gameId: booking.gameId, status: 'available' });
  if (!station) throw httpError(409, 'No station for this game is free right now.');

  const resolved = await resolveGamePricing(booking.gameId, new Date());
  if (!resolved) throw httpError(400, 'This game has no active pricing.');
  let snap;
  if (resolved.method === 'session') {
    const idx = resolved.pk.findIndex(p => p.m === booking.durationMinutes);
    snap = billing.buildSnap({ method: 'session', pk: resolved.pk }, idx >= 0 ? idx : 0);
  } else {
    snap = billing.buildSnap({ method: 'minute', rate: resolved.rate, min: resolved.min, grace: resolved.grace, round: resolved.round });
  }
  const session = await Session.create({
    stationId: station._id, gameId: booking.gameId, gameName: booking.gameName, stationName: station.name,
    customerId: booking.customerId, customerName: booking.name, bookingId: booking._id,
    status: 'active', start: new Date(), snap
  });
  station.status = 'running'; await station.save();
  booking.status = 'confirmed'; booking.stationId = station._id; await booking.save();
  res.status(201).json(session);
};

function priceFor(resolved, minutes) {
  if (resolved.method === 'minute') return billing.baseAmount({ method: 'minute', rate: resolved.rate, min: resolved.min, grace: resolved.grace, round: resolved.round }, minutes);
  const pkg = resolved.pk.find(p => p.m === minutes);
  return pkg ? pkg.p : null;
}
async function isFull(gameId, t, durationMinutes, stationCount) {
  const from = new Date(t), to = new Date(t.getTime() + durationMinutes * 60000);
  const overlapping = await Booking.countDocuments({
    gameId, status: { $in: ['pending', 'confirmed'] },
    t: { $lt: to }, $expr: { $gt: [{ $add: ['$t', { $multiply: ['$durationMinutes', 60000] }] }, from.getTime()] }
  });
  return overlapping >= stationCount;
}
exports.priceFor = priceFor;
exports.isFull = isFull;
