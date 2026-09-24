'use strict';
const { Game, Station, BusinessSettings, Event, EventRegistration, Booking, WaitingList, DiscountCode, Customer } = require('../models');
const { httpError } = require('../middleware/errorHandler');
const { resolveGamePricing } = require('../utils/pricing');
const billing = require('../utils/billing');
const { nextBookingRef } = require('../utils/bookingRef');
const { priceFor, isFull } = require('./bookingController');

exports.catalog = async (req, res) => {
  const [settings, games, stations] = await Promise.all([
    BusinessSettings.findById('main').lean(),
    Game.find({ active: true }).sort({ name: 1 }).lean(),
    Station.find().lean()
  ]);
  const stationCount = {};
  stations.forEach(s => { stationCount[s.gameId] = (stationCount[s.gameId] || 0) + 1; });
  const games2 = [];
  for (const g of games) {
    const weekday = await resolveGamePricing(g._id, new Date(2026, 0, 5)); // a Monday
    const weekend = await resolveGamePricing(g._id, new Date(2026, 0, 3)); // a Saturday
    games2.push({ ...g, stations: stationCount[g._id] || 0, weekday, weekend });
  }
  res.json({ settings: settings || { name: 'GameBreak', open: 10, close: 26, currency: 'PKR' }, games: games2 });
};

exports.availability = async (req, res) => {
  const { gameId, from, to } = req.query;
  if (!gameId || !from || !to) throw httpError(400, 'gameId, from and to are required.');
  const bookings = await Booking.find({
    gameId, status: { $in: ['pending', 'confirmed'] },
    t: { $lt: new Date(to) }, $expr: { $gt: [{ $add: ['$t', { $multiply: ['$durationMinutes', 60000] }] }, new Date(from).getTime()] }
  }).select('t durationMinutes').lean();
  const stationCount = await Station.countDocuments({ gameId });
  res.json({ stationCount, busy: bookings.map(b => ({ t: b.t, dur: b.durationMinutes })) });
};

exports.checkCode = async (req, res) => {
  const { code, gameId, durationMinutes } = req.query;
  if (!code) throw httpError(400, 'Enter a code.');
  const found = await DiscountCode.findOne({ code: String(code).toUpperCase().trim() });
  const game = gameId ? await Game.findById(gameId) : null;
  const result = billing.evaluateCode(found, { game: game || { _id: null, name: '' }, minutes: Number(durationMinutes) || 0, baseAfterGameDiscount: 0, now: new Date() });
  res.json(result);
};

exports.createBooking = async (req, res) => {
  const { name, phone, email, gameId, t, durationMinutes, discountCode } = req.body || {};
  if (!name || String(name).trim().length < 2) throw httpError(400, 'Please enter your name.');
  if (!phone || String(phone).replace(/\D/g, '').length < 7) throw httpError(400, 'Please enter a valid phone number.');
  const game = await Game.findById(gameId);
  if (!game || !game.active) throw httpError(404, 'Unknown game.');
  const when = new Date(t);
  const now = Date.now();
  if (isNaN(when.getTime()) || when.getTime() < now + 10 * 60000) throw httpError(400, 'Please choose a time at least 10 minutes from now.');
  if (when.getTime() > now + 60 * 86400000) throw httpError(400, 'Bookings open up to 60 days ahead.');

  const resolved = await resolveGamePricing(game._id, when);
  if (!resolved) throw httpError(400, 'This game has no active pricing right now.');
  const basePrice = priceFor(resolved, Number(durationMinutes));
  if (basePrice == null) throw httpError(400, 'Please choose one of the listed durations.');

  const stationCount = await Station.countDocuments({ gameId: game._id });
  if (await isFull(game._id, when, Number(durationMinutes), stationCount)) {
    throw httpError(409, 'That time is already fully booked. Please pick another slot.');
  }

  let price = basePrice, appliedCode = '';
  if (discountCode) {
    const code = await DiscountCode.findOne({ code: String(discountCode).toUpperCase().trim() });
    const result = billing.evaluateCode(code, { game, minutes: Number(durationMinutes), baseAfterGameDiscount: basePrice, now: new Date() });
    if (!result.ok) throw httpError(400, result.reason);
    price = basePrice - result.amountOff;
    appliedCode = code.code;
    await DiscountCode.updateOne({ _id: code._id }, { $inc: { used: 1 } });
  }

  // Cap: a phone number with 3+ bookings already awaiting confirmation can't spam more.
  const pendingCount = await Booking.countDocuments({ phone: String(phone).trim(), status: 'pending' });
  if (pendingCount >= 3) throw httpError(429, 'You already have 3 bookings waiting for confirmation.');

  const booking = await Booking.create({
    ref: await nextBookingRef(), customerId: req.customer ? req.customer.sub : null,
    name: String(name).trim(), phone: String(phone).trim(), email: (email || '').trim(),
    gameId: game._id, gameName: game.name, t: when, durationMinutes: Number(durationMinutes),
    price, discountCode: appliedCode, status: 'pending', source: 'web'
  });
  res.status(201).json({ ref: booking.ref, price: booking.price });
};

exports.events = async (req, res) => {
  const events = await Event.find({ t: { $gte: new Date(Date.now() - 86400000) } }).sort({ t: 1 }).lean();
  const counts = await EventRegistration.aggregate([{ $group: { _id: '$eventId', n: { $sum: 1 } } }]);
  const byEvent = Object.fromEntries(counts.map(c => [String(c._id), c.n]));
  res.json(events.map(e => ({ ...e, registered: byEvent[String(e._id)] || 0, full: e.maxParticipants > 0 && (byEvent[String(e._id)] || 0) >= e.maxParticipants })));
};

exports.registerForEvent = async (req, res) => {
  const { name, phone, email } = req.body || {};
  if (!name || !phone) throw httpError(400, 'Enter your name and phone number.');
  const event = await Event.findById(req.params.id);
  if (!event) throw httpError(404, 'Event not found.');
  if (event.maxParticipants > 0) {
    const count = await EventRegistration.countDocuments({ eventId: event._id });
    if (count >= event.maxParticipants) throw httpError(409, 'This event is full.');
  }
  const reg = await EventRegistration.create({ eventId: event._id, customerId: req.customer ? req.customer.sub : null, name: String(name).trim(), phone: String(phone).trim(), email: (email || '').trim() });
  res.status(201).json(reg);
};

exports.joinWaitingList = async (req, res) => {
  const { name, phone, gameId, notes } = req.body || {};
  if (!name || !phone || !gameId) throw httpError(400, 'Enter your name, phone and game.');
  const game = await Game.findById(gameId);
  if (!game) throw httpError(404, 'Unknown game.');
  const row = await WaitingList.create({ name: String(name).trim(), phone: String(phone).trim(), gameId, notes: (notes || '').trim() });
  res.status(201).json(row);
};

exports.myBookings = async (req, res) => {
  const customer = await Customer.findById(req.customer.sub);
  const bookings = await Booking.find({ $or: [{ customerId: req.customer.sub }, { phone: customer ? customer.phone : '__none__' }] }).sort({ t: -1 }).limit(200);
  res.json(bookings);
};
