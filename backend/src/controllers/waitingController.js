'use strict';
const { WaitingList, Station, Booking } = require('../models');
const { httpError } = require('../middleware/errorHandler');
const { nextBookingRef } = require('../utils/bookingRef');

exports.list = async (req, res) => {
  res.json(await WaitingList.find({ status: { $in: ['waiting', 'notified'] } }).sort({ createdAt: 1 }));
};

exports.create = async (req, res) => {
  const { name, phone, gameId, notes } = req.body || {};
  if (!name || !gameId) throw httpError(400, 'Enter a name and game.');
  res.status(201).json(await WaitingList.create({ name: String(name).trim(), phone: (phone || '').trim(), gameId, notes: (notes || '').trim() }));
};

exports.markNotified = async (req, res) => {
  const row = await WaitingList.findByIdAndUpdate(req.params.id, { status: 'notified', notifiedAt: new Date() }, { new: true });
  if (!row) throw httpError(404, 'Not found.');
  res.json(row);
};

exports.remove = async (req, res) => {
  await WaitingList.findByIdAndUpdate(req.params.id, { status: 'cancelled' });
  res.status(204).end();
};

/* Turns a waiting-list entry directly into a confirmed booking for right now
   (used when a station just freed up and the person is still on-site). */
exports.convert = async (req, res) => {
  const row = await WaitingList.findById(req.params.id);
  if (!row || row.status === 'converted' || row.status === 'cancelled') throw httpError(404, 'Not found.');
  const station = await Station.findOne({ gameId: row.gameId, status: 'available' });
  if (!station) throw httpError(409, 'No station for this game is free yet.');
  const { Game } = require('../models');
  const game = await Game.findById(row.gameId);
  const booking = await Booking.create({
    ref: await nextBookingRef(), name: row.name, phone: row.phone, gameId: row.gameId, gameName: game ? game.name : '',
    t: new Date(), durationMinutes: 60, price: 0, status: 'confirmed', source: 'staff'
  });
  row.status = 'converted'; row.bookingId = booking._id; await row.save();
  res.json({ waitingEntry: row, booking });
};
