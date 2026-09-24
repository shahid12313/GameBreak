'use strict';
const mongoose = require('mongoose');
const { Schema } = mongoose;

const DiscountCodeSchema = new Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true, maxlength: 20 },
    desc: { type: String, default: '', maxlength: 100 },
    type: { type: String, enum: ['percent', 'fixed'], required: true },
    value: { type: Number, required: true, min: 0 },
    from: { type: String, default: '' },      // 'YYYY-MM-DD' or ''
    to: { type: String, default: '' },
    timeFrom: { type: String, default: '' },  // 'HH:MM' or ''
    timeTo: { type: String, default: '' },
    games: { type: [Schema.Types.ObjectId], default: [] },     // empty = all games
    durations: { type: [Number], default: [] },                // empty = all durations
    maxUses: { type: Number, default: 0 },    // 0 = unlimited
    used: { type: Number, default: 0 },
    active: { type: Boolean, default: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model('DiscountCode', DiscountCodeSchema);
