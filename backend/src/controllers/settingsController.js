'use strict';
const { BusinessSettings } = require('../models');
const { httpError } = require('../middleware/errorHandler');

exports.get = async (req, res) => {
  const s = await BusinessSettings.findById('main');
  // A plain default object rather than `new BusinessSettings()` — this only
  // matters the very first time settings are read before `npm run seed` (or
  // any prior save) has created the real document, so it's worth being
  // explicit here rather than relying on the model's own default-document
  // construction behaving a particular way.
  res.json(s || { _id: 'main', name: 'GameBreak', address: '', phone: '', email: '', logoUrl: '', currency: 'PKR', taxPercent: 0, open: 10, close: 26, bookingLeadMinutes: 15 });
};

exports.update = async (req, res) => {
  const { name, address, phone, email, logoUrl, currency, taxPercent, open, close, bookingLeadMinutes } = req.body || {};
  if (name !== undefined && !String(name).trim()) throw httpError(400, 'Enter a business name.');
  if (open !== undefined && close !== undefined && !(Number(close) > Number(open))) throw httpError(400, 'Closing hour must be later than opening hour.');
  const s = await BusinessSettings.findByIdAndUpdate('main',
    { $set: pick({ name, address, phone, email, logoUrl, currency, taxPercent, open, close, bookingLeadMinutes }) },
    { new: true, upsert: true }
  );
  res.json(s);
};
function pick(obj) { const out = {}; for (const k in obj) if (obj[k] !== undefined) out[k] = obj[k]; return out; }
