'use strict';
const mongoose = require('mongoose');
const { Schema } = mongoose;

/* Audit trail for every stock change, so "Stock In / Stock Out / Current
   Stock" is traceable rather than just a mutable counter. InventoryItem.stock
   is kept as a fast, denormalized running total; this collection is the log. */
const InventoryTransactionSchema = new Schema(
  {
    itemId: { type: Schema.Types.ObjectId, ref: 'InventoryItem', required: true },
    type: { type: String, enum: ['in', 'out'], required: true },
    qty: { type: Number, required: true, min: 1 },
    reason: { type: String, enum: ['restock', 'session-sale', 'adjustment', 'waste'], required: true },
    sessionId: { type: Schema.Types.ObjectId, ref: 'Session', default: null },
    at: { type: Date, required: true, default: Date.now }
  },
  { timestamps: true }
);
InventoryTransactionSchema.index({ itemId: 1, at: -1 });

module.exports = mongoose.model('InventoryTransaction', InventoryTransactionSchema);
