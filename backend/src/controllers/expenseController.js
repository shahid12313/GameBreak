'use strict';
const { Expense } = require('../models');
const { httpError } = require('../middleware/errorHandler');
const { CATEGORIES } = require('../models/Expense');

exports.list = async (req, res) => {
  const { month } = req.query; // 'YYYY-MM'
  const q = {};
  if (month) {
    const [y, m] = month.split('-').map(Number);
    q.date = { $gte: new Date(y, m - 1, 1), $lt: new Date(y, m, 1) };
  }
  res.json(await Expense.find(q).sort({ date: -1 }));
};

exports.create = async (req, res) => {
  const { description, category, amount, date } = req.body || {};
  if (!description) throw httpError(400, 'Enter a description.');
  if (!(amount > 0)) throw httpError(400, 'Enter an amount above 0.');
  const when = date ? new Date(date) : new Date();
  if (isNaN(when.getTime())) throw httpError(400, 'Enter a valid date.');
  res.status(201).json(await Expense.create({ description, category: CATEGORIES.includes(category) ? category : 'Other', amount, date: when }));
};

exports.remove = async (req, res) => { await Expense.findByIdAndDelete(req.params.id); res.status(204).end(); };
