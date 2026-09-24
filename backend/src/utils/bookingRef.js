'use strict';
const { Counter } = require('../models');

/** Atomically issues the next booking reference for the current year,
 *  e.g. GB-2026-00001, GB-2026-00002, ... Safe under concurrent requests
 *  because the increment happens in a single findOneAndUpdate. */
async function nextBookingRef(prefix = 'GB') {
  const year = new Date().getFullYear();
  const key = `booking:${year}`;
  const doc = await Counter.findOneAndUpdate({ _id: key }, { $inc: { seq: 1 } }, { upsert: true, new: true });
  return `${prefix}-${year}-${String(doc.seq).padStart(5, '0')}`;
}

module.exports = { nextBookingRef };
