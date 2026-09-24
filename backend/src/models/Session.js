'use strict';
const mongoose = require('mongoose');
const { Schema } = mongoose;

/* One collection for both a station that's currently running (status:'active',
   end:null) and the historical record once it's billed (status:'completed').
   snap is the pricing frozen at start time — see utils/billing.js for why:
   editing Pricing later must never change a session already in progress or
   already billed. */
const SessionSchema = new Schema(
  {
    stationId: { type: Schema.Types.ObjectId, ref: 'Station', required: true },
    gameId: { type: Schema.Types.ObjectId, ref: 'Game', required: true },
    gameName: String,
    stationName: String,
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', default: null },
    customerName: { type: String, default: '', maxlength: 60 },
    bookingId: { type: Schema.Types.ObjectId, ref: 'Booking', default: null },
    status: { type: String, enum: ['active', 'completed'], default: 'active', required: true },
    start: { type: Date, required: true },
    end: { type: Date, default: null },
    pkIndex: { type: Number, default: null },
    snap: {
      method: { type: String, enum: ['minute', 'session'] },
      rate: Number, min: Number, grace: Number, round: String,
      pkg: { l: String, m: Number, p: Number }
    },
    minutes: { type: Number, default: 0 },
    gameAmount: { type: Number, default: 0 },   // after game % discount + code discount
    gameDiscount: { type: Number, default: 0 },
    codeDiscount: { type: Number, default: 0 },
    discountCode: { type: String, default: '' },
    extras: [{ itemId: { type: Schema.Types.ObjectId, ref: 'InventoryItem' }, name: String, qty: Number, price: Number }],
    extrasAmount: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    paymentMethod: { type: String, enum: ['cash', 'card', 'tab'], default: null }
  },
  { timestamps: true }
);
/* Only one ACTIVE session per station at a time — enforced at the DB level,
   not just in application code, using a partial unique index. */
SessionSchema.index({ stationId: 1 }, { unique: true, partialFilterExpression: { status: 'active' } });
SessionSchema.index({ status: 1, start: -1 });
SessionSchema.index({ gameId: 1, start: -1 });

module.exports = mongoose.model('Session', SessionSchema);
