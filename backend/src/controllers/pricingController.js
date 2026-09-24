'use strict';
const { PricingPackage, Game } = require('../models');
const { httpError } = require('../middleware/errorHandler');
const { listGamePricing } = require('../utils/pricing');

exports.listForGame = async (req, res) => {
  res.json(await listGamePricing(req.params.gameId));
};

exports.create = async (req, res) => {
  const { gameId, kind, dayType, label, durationMinutes, price } = req.body || {};
  const game = await Game.findById(gameId);
  if (!game) throw httpError(404, 'Game not found.');
  if (!['hourly', 'session'].includes(kind)) throw httpError(400, 'Choose Hourly or Session.');
  if (kind === 'session' && !(durationMinutes > 0)) throw httpError(400, 'Enter a duration in minutes for a session price.');
  if (!(price >= 0)) throw httpError(400, 'Enter a valid price.');
  const row = await PricingPackage.create({
    gameId, kind, dayType: ['all', 'weekend', 'event'].includes(dayType) ? dayType : 'all',
    label: label || '', durationMinutes: kind === 'session' ? Math.round(durationMinutes) : null, price
  });
  res.status(201).json(row);
};

exports.update = async (req, res) => {
  const row = await PricingPackage.findById(req.params.id);
  if (!row) throw httpError(404, 'Price not found.');
  const { label, durationMinutes, price, active, dayType } = req.body || {};
  if (label !== undefined) row.label = label;
  if (durationMinutes !== undefined && row.kind === 'session') row.durationMinutes = Math.max(1, Math.round(durationMinutes));
  if (price !== undefined) { if (!(price >= 0)) throw httpError(400, 'Enter a valid price.'); row.price = price; }
  if (active !== undefined) row.active = !!active;
  if (dayType !== undefined && ['all', 'weekend', 'event'].includes(dayType)) row.dayType = dayType;
  await row.save();
  res.json(row);
};

exports.remove = async (req, res) => {
  await PricingPackage.findByIdAndDelete(req.params.id);
  res.status(204).end();
};
