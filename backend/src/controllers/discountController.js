'use strict';
const { DiscountCode } = require('../models');
const { httpError } = require('../middleware/errorHandler');

exports.list = async (req, res) => res.json(await DiscountCode.find().sort({ createdAt: -1 }));

exports.create = async (req, res) => {
  const { code, desc, type, value, from, to, timeFrom, timeTo, games, durations, maxUses } = req.body || {};
  if (!code || !String(code).trim()) throw httpError(400, 'Enter a code.');
  if (!['percent', 'fixed'].includes(type)) throw httpError(400, 'Choose Percent or Fixed.');
  if (!(value > 0)) throw httpError(400, 'Enter a value above 0.');
  const row = await DiscountCode.create({
    code: String(code).toUpperCase().trim(), desc: desc || '', type, value,
    from: from || '', to: to || '', timeFrom: timeFrom || '', timeTo: timeTo || '',
    games: Array.isArray(games) ? games : [], durations: Array.isArray(durations) ? durations.map(Number) : [],
    maxUses: Math.max(0, Number(maxUses) || 0)
  });
  res.status(201).json(row);
};

exports.update = async (req, res) => {
  const row = await DiscountCode.findById(req.params.id);
  if (!row) throw httpError(404, 'Code not found.');
  const { active, desc, value } = req.body || {};
  if (active !== undefined) row.active = !!active;
  if (desc !== undefined) row.desc = desc;
  if (value !== undefined) row.value = Math.max(0, Number(value) || 0);
  await row.save();
  res.json(row);
};

exports.remove = async (req, res) => { await DiscountCode.findByIdAndDelete(req.params.id); res.status(204).end(); };
