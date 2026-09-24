'use strict';
const mongoose = require('mongoose');
const { Schema } = mongoose;

/* One row per money-in event, so "revenue by payment method" is a simple
   aggregate instead of something inferred after the fact. Created
   automatically when a session is billed or a customer tab is settled. */
const PaymentSchema = new Schema(
  {
    amount: { type: Number, required: true, min: 0 },
    method: { type: String, enum: ['cash', 'card', 'tab-settled'], required: true },
    sessionId: { type: Schema.Types.ObjectId, ref: 'Session', default: null },
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', default: null },
    note: { type: String, default: '', maxlength: 120 },
    at: { type: Date, required: true, default: Date.now }
  },
  { timestamps: true }
);
PaymentSchema.index({ at: -1 });

module.exports = mongoose.model('Payment', PaymentSchema);
