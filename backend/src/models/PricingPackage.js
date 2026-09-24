'use strict';
const mongoose = require('mongoose');
const { Schema } = mongoose;

/* A game is billed one of two ways, chosen per pricing record:
   - "hourly": continuous per-minute billing at price/60 per minute
     (durationMinutes is unused/null for this kind).
   - "session": a fixed-length package (30 min, 1 hour, ...), billed
     proportionally to time actually used — see utils/billing.js.
   dayType lets the same game have different weekend prices: when resolving
   a price, "weekend" records win on Saturday/Sunday if any exist, else
   "all" records apply every day. "event" is for special-event pricing an
   admin can flip on for a specific window (rarely used, kept simple: an
   event-kind record is only picked up when explicitly requested by id,
   e.g. from an Event's linked pricing, rather than by date matching). */
const PricingPackageSchema = new Schema(
  {
    gameId: { type: Schema.Types.ObjectId, ref: 'Game', required: true },
    kind: { type: String, enum: ['hourly', 'session'], required: true },
    dayType: { type: String, enum: ['all', 'weekend', 'event'], default: 'all' },
    label: { type: String, default: '', maxlength: 40 },
    durationMinutes: { type: Number, default: null, min: 1, max: 1440 },
    price: { type: Number, required: true, min: 0 },
    active: { type: Boolean, default: true }
  },
  { timestamps: true }
);
PricingPackageSchema.index({ gameId: 1, dayType: 1, active: 1 });

module.exports = mongoose.model('PricingPackage', PricingPackageSchema);
