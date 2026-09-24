'use strict';
const { Game, Station, Session, PricingPackage } = require('../models');
const { httpError } = require('../middleware/errorHandler');
const { resolveGamePricing } = require('../utils/pricing');

exports.list = async (req, res) => {
  const games = await Game.find().sort({ name: 1 }).lean();
  const stations = await Station.find().lean();
  const byGame = {};
  stations.forEach(s => { (byGame[s.gameId] ||= []).push(s); });
  res.json(games.map(g => ({ ...g, stations: byGame[g._id] || [] })));
};

exports.create = async (req, res) => {
  const { name, icon, description } = req.body || {};
  if (!name || !String(name).trim()) throw httpError(400, 'Enter a game name.');
  const game = await Game.create({ name: String(name).trim(), icon: icon || '🎮', description: description || '' });
  await Station.create({ gameId: game._id, name: `${game.name} 1` });
  res.status(201).json(game);
};

exports.update = async (req, res) => {
  const { name, icon, description, active } = req.body || {};
  const game = await Game.findById(req.params.id);
  if (!game) throw httpError(404, 'Game not found.');
  if (name !== undefined) game.name = String(name).trim();
  if (icon !== undefined) game.icon = icon;
  if (description !== undefined) game.description = description;
  if (active !== undefined) game.active = !!active;
  await game.save();
  res.json(game);
};

exports.remove = async (req, res) => {
  const busy = await Session.exists({ gameId: req.params.id, status: 'active' });
  if (busy) throw httpError(409, 'Stop all running sessions for this game first.');
  await Station.deleteMany({ gameId: req.params.id });
  await PricingPackage.deleteMany({ gameId: req.params.id });
  await Game.findByIdAndDelete(req.params.id);
  res.status(204).end();
};

exports.addStation = async (req, res) => {
  const game = await Game.findById(req.params.id);
  if (!game) throw httpError(404, 'Game not found.');
  const count = await Station.countDocuments({ gameId: game._id });
  const station = await Station.create({ gameId: game._id, name: `${game.name} ${count + 1}` });
  res.status(201).json(station);
};

exports.removeStation = async (req, res) => {
  const running = await Session.exists({ stationId: req.params.stationId, status: 'active' });
  if (running) throw httpError(409, 'Stop the running session on that station first.');
  const count = await Station.countDocuments({ gameId: req.params.id });
  if (count <= 1) throw httpError(400, 'A game needs at least one station.');
  await Station.findOneAndDelete({ _id: req.params.stationId, gameId: req.params.id });
  res.status(204).end();
};

exports.setStationStatus = async (req, res) => {
  const { status } = req.body || {};
  const { STATUSES } = require('../models/Station');
  if (!STATUSES.includes(status)) throw httpError(400, 'Invalid station status.');
  if (status !== 'available') {
    const running = await Session.exists({ stationId: req.params.stationId, status: 'active' });
    if (running) throw httpError(409, 'This station has a session running.');
  }
  const station = await Station.findByIdAndUpdate(req.params.stationId, { status }, { new: true });
  if (!station) throw httpError(404, 'Station not found.');
  res.json(station);
};

exports.currentPricing = async (req, res) => {
  const game = await Game.findById(req.params.id);
  if (!game) throw httpError(404, 'Game not found.');
  res.json({ weekday: await resolveGamePricing(game._id, new Date(2026, 0, 5)), weekend: await resolveGamePricing(game._id, new Date(2026, 0, 3)) });
};
