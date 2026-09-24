'use strict';
const mongoose = require('mongoose');
const { Session, Station, Game, Customer, InventoryItem, InventoryTransaction, DiscountCode, Payment, Booking } = require('../models');
const { httpError } = require('../middleware/errorHandler');
const { resolveGamePricing } = require('../utils/pricing');
const billing = require('../utils/billing');

/* The whole board: every station, grouped implicitly by gameId, with its
   live status and (if running) a server-computed current charge. Nothing
   here is ever taken from the client. */
exports.board = async (req, res) => {
  const [stations, active] = await Promise.all([
    Station.find().sort({ name: 1 }).lean(),
    Session.find({ status: 'active' }).lean()
  ]);
  const now = Date.now();
  const byStation = {};
  active.forEach(s => { byStation[s.stationId] = s; });
  res.json(stations.map(st => {
    const s = byStation[st._id];
    return {
      ...st,
      session: s ? { ...s, liveAmount: billing.baseAmount(s.snap, (now - new Date(s.start).getTime()) / 60000) } : null
    };
  }));
};

exports.quote = async (req, res) => {
  const session = await Session.findOne({ _id: req.params.id, status: 'active' });
  if (!session) throw httpError(404, 'That session is not running.');
  const minutes = (Date.now() - session.start.getTime()) / 60000;
  res.json({ minutes: Math.ceil(minutes), amount: billing.baseAmount(session.snap, minutes) });
};

exports.start = async (req, res) => {
  const { stationId, customerName, customerId, pkIndex } = req.body || {};
  const station = await Station.findById(stationId);
  if (!station) throw httpError(404, 'Station not found.');
  if (station.status !== 'available') throw httpError(409, `This station is ${station.status}, not available.`);
  const game = await Game.findById(station.gameId);
  if (!game || !game.active) throw httpError(400, 'This game is not available.');

  const resolved = await resolveGamePricing(game._id, new Date());
  if (!resolved) throw httpError(400, `Set a price for ${game.name} in Pricing first.`);
  const problem = billing.priceProblem({ method: resolved.method, rate: resolved.rate, pk: resolved.pk });
  if (problem) throw httpError(400, problem);

  const idx = resolved.method === 'session' ? Math.min(Math.max(0, Number(pkIndex) || 0), resolved.pk.length - 1) : null;
  const snap = billing.buildSnap({ method: resolved.method, rate: resolved.rate, min: resolved.min, grace: resolved.grace, round: resolved.round, pk: resolved.pk }, idx);
  if (!snap) throw httpError(400, 'Could not work out a price for this session.');

  let customer = null;
  if (customerId) { customer = await Customer.findById(customerId); if (!customer) throw httpError(404, 'Customer not found.'); }

  const session = await Session.create({
    stationId: station._id, gameId: game._id, gameName: game.name, stationName: station.name,
    customerId: customer ? customer._id : null, customerName: customer ? customer.name : (customerName || '').trim(),
    status: 'active', start: new Date(), pkIndex: idx, snap
  });
  station.status = 'running';
  await station.save();
  res.status(201).json(session);
};

exports.stop = async (req, res) => {
  const session = await Session.findOne({ _id: req.params.id, status: 'active' });
  if (!session) throw httpError(404, 'That session is not running (it may already be billed).');
  const game = await Game.findById(session.gameId);
  const now = new Date();
  const minutesElapsed = (now - session.start.getTime()) / 60000;

  const { extras: extrasIn, discountCode, paymentMethod } = req.body || {};
  if (!['cash', 'card', 'tab'].includes(paymentMethod)) throw httpError(400, 'Choose how this was paid.');
  if (paymentMethod === 'tab' && !session.customerId && !(req.body.customerName || session.customerName)) {
    throw httpError(400, "A customer's tab needs a customer name.");
  }

  // Resolve + validate extras against real stock, never trust a client-sent price.
  const extras = [];
  if (Array.isArray(extrasIn)) {
    for (const e of extrasIn) {
      if (!e || !e.itemId || !(e.qty > 0)) continue;
      const item = await InventoryItem.findById(e.itemId);
      if (!item || !item.sellable) continue;
      const qty = Math.min(Math.round(e.qty), item.stock);
      if (qty > 0) extras.push({ item, qty });
    }
  }

  const base = billing.baseAmount(session.snap, minutesElapsed);
  const gameDiscount = Math.round((base * (game.disc || 0)) / 100);
  let discountResult = null;
  if (discountCode) {
    const code = await DiscountCode.findOne({ code: String(discountCode).toUpperCase().trim() });
    const minutesForCode = session.snap.method === 'session' ? session.snap.pkg.m : Math.ceil(minutesElapsed);
    discountResult = billing.evaluateCode(code, { game, minutes: minutesForCode, baseAfterGameDiscount: base - gameDiscount, now });
    if (!discountResult.ok) throw httpError(400, discountResult.reason);
  }

  const bill = billing.computeBill({ game, snap: session.snap, minutesElapsed, extras, discountResult, now });

  // Everything below either all happens or none of it does.
  const mongoSession = await mongoose.startSession();
  try {
    await mongoSession.withTransaction(async () => {
      for (const { item, qty } of extras) {
        item.stock -= qty;
        await item.save({ session: mongoSession });
        await InventoryTransaction.create([{ itemId: item._id, type: 'out', qty, reason: 'session-sale', sessionId: session._id }], { session: mongoSession });
      }
      if (discountResult && discountResult.ok) {
        await DiscountCode.updateOne({ code: String(discountCode).toUpperCase().trim() }, { $inc: { used: 1 } }, { session: mongoSession });
      }

      let customer = session.customerId ? await Customer.findById(session.customerId).session(mongoSession) : null;
      if (!customer && paymentMethod === 'tab') {
        const name = (req.body.customerName || session.customerName || '').trim();
        customer = (await Customer.create([{ name, phone: (req.body.customerPhone || '').trim() }], { session: mongoSession }))[0];
      }
      if (customer) {
        customer.sessions += 1;
        if (paymentMethod === 'tab') customer.due += bill.total; else customer.paid += bill.total;
        await customer.save({ session: mongoSession });
      }
      if (paymentMethod !== 'tab') {
        await Payment.create([{ amount: bill.total, method: paymentMethod, sessionId: session._id, customerId: customer ? customer._id : null, at: now }], { session: mongoSession });
      }

      session.status = 'completed';
      session.end = now;
      session.minutes = bill.minutes;
      session.gameAmount = bill.gameAmount;
      session.gameDiscount = bill.gameDiscount;
      session.codeDiscount = bill.codeDiscount;
      session.discountCode = discountResult && discountResult.ok ? String(discountCode).toUpperCase().trim() : '';
      session.extras = extras.map(e => ({ itemId: e.item._id, name: e.item.name, qty: e.qty, price: e.item.price }));
      session.extrasAmount = bill.extrasTotal;
      session.total = bill.total;
      session.paymentMethod = paymentMethod;
      session.customerId = customer ? customer._id : session.customerId;
      session.customerName = customer ? customer.name : session.customerName;
      await session.save({ session: mongoSession });

      if (session.bookingId) await Booking.findByIdAndUpdate(session.bookingId, { status: 'completed' }, { session: mongoSession });
      await Station.findByIdAndUpdate(session.stationId, { status: 'available' }, { session: mongoSession });
    });
  } finally {
    mongoSession.endSession();
  }

  res.json(session);
};

exports.history = async (req, res) => {
  const { from, to, gameId, limit } = req.query;
  const q = { status: 'completed' };
  if (from || to) q.start = {};
  if (from) q.start.$gte = new Date(from);
  if (to) q.start.$lte = new Date(to);
  if (gameId) q.gameId = gameId;
  const rows = await Session.find(q).sort({ start: -1 }).limit(Math.min(500, Number(limit) || 100));
  res.json(rows);
};
