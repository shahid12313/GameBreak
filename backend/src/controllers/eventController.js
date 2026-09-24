'use strict';
const { Event, EventRegistration } = require('../models');
const { httpError } = require('../middleware/errorHandler');

exports.list = async (req, res) => res.json(await Event.find().sort({ t: -1 }));

exports.create = async (req, res) => {
  const { title, kind, description, t, fee, maxParticipants } = req.body || {};
  if (!title) throw httpError(400, 'Enter a title.');
  const when = new Date(t);
  if (isNaN(when.getTime())) throw httpError(400, 'Choose a valid date and time.');
  res.status(201).json(await Event.create({ title, kind: kind || 'tournament', description: description || '', t: when, fee: Math.max(0, Number(fee) || 0), maxParticipants: Math.max(0, Number(maxParticipants) || 0) }));
};

exports.update = async (req, res) => {
  const ev = await Event.findById(req.params.id);
  if (!ev) throw httpError(404, 'Event not found.');
  ['title', 'kind', 'description', 'fee', 'maxParticipants', 'starred'].forEach(k => { if (req.body[k] !== undefined) ev[k] = req.body[k]; });
  if (req.body.t) ev.t = new Date(req.body.t);
  await ev.save();
  res.json(ev);
};

exports.remove = async (req, res) => { await Event.findByIdAndDelete(req.params.id); await EventRegistration.deleteMany({ eventId: req.params.id }); res.status(204).end(); };

exports.registrations = async (req, res) => res.json(await EventRegistration.find({ eventId: req.params.id }).sort({ createdAt: 1 }));
