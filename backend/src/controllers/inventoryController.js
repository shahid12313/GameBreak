'use strict';
const { InventoryItem, InventoryTransaction, Expense } = require('../models');
const { httpError } = require('../middleware/errorHandler');

exports.list = async (req, res) => res.json(await InventoryItem.find().sort({ name: 1 }));

exports.create = async (req, res) => {
  const { name, icon, category, sellable, price, cost, stock, unit } = req.body || {};
  if (!name) throw httpError(400, 'Enter an item name.');
  if (!(cost >= 0)) throw httpError(400, 'Enter a valid cost.');
  res.status(201).json(await InventoryItem.create({
    name, icon: icon || '📦', category: category || 'Snacks', sellable: sellable !== false,
    price: sellable !== false ? Math.max(0, Number(price) || 0) : 0, cost, stock: Math.max(0, Number(stock) || 0), unit: unit || 'piece'
  }));
};

exports.update = async (req, res) => {
  const item = await InventoryItem.findById(req.params.id);
  if (!item) throw httpError(404, 'Item not found.');
  ['name', 'icon', 'category', 'sellable', 'price', 'cost', 'unit', 'lowStockThreshold'].forEach(k => { if (req.body[k] !== undefined) item[k] = req.body[k]; });
  await item.save();
  res.json(item);
};

exports.remove = async (req, res) => { await InventoryItem.findByIdAndDelete(req.params.id); res.status(204).end(); };

/* Adding stock is also logged as an expense automatically, at cost price ×
   quantity — matches "restock" behaviour customers of the earlier version relied on. */
exports.restock = async (req, res) => {
  const item = await InventoryItem.findById(req.params.id);
  if (!item) throw httpError(404, 'Item not found.');
  const qty = Math.round(Number(req.body.qty));
  if (!(qty > 0)) throw httpError(400, 'Enter a quantity above 0.');
  item.stock += qty;
  await item.save();
  await InventoryTransaction.create({ itemId: item._id, type: 'in', qty, reason: 'restock' });
  await Expense.create({ description: `Restock: ${item.name} × ${qty}`, category: 'Supplies', amount: qty * item.cost, date: new Date() });
  res.json(item);
};

exports.transactions = async (req, res) => res.json(await InventoryTransaction.find({ itemId: req.params.id }).sort({ at: -1 }).limit(200));
