'use strict';
const mongoose = require('mongoose');
const { Schema } = mongoose;

/* A Game is a category/type (PS5, Driving Simulator, ...). The physical,
   individually-bookable units live in the separate Station model so a
   station can carry its own status (Available/Running/Reserved/Maintenance)
   independently of the others. Pricing also lives separately, in
   PricingPackage, so weekday/weekend/event variants don't bloat this doc. */
const GameSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 60, unique: true },
    icon: { type: String, default: '🎮', maxlength: 8 },
    description: { type: String, default: '', maxlength: 300 },
    active: { type: Boolean, default: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Game', GameSchema);
