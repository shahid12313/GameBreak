'use strict';
const mongoose = require('mongoose');
const { Schema } = mongoose;

const BusinessSettingsSchema = new Schema(
  {
    _id: { type: String, default: 'main' },
    name: { type: String, default: 'GameBreak', maxlength: 60 },
    address: { type: String, default: '', maxlength: 160 },
    phone: { type: String, default: '', maxlength: 30 },
    email: { type: String, default: '', maxlength: 80 },
    logoUrl: { type: String, default: '', maxlength: 300 },
    currency: { type: String, default: 'PKR', maxlength: 8 },
    taxPercent: { type: Number, default: 0, min: 0, max: 100 },
    open: { type: Number, default: 10, min: 0, max: 23 },   // opening hour, 0-23
    close: { type: Number, default: 26, min: 1, max: 30 },  // closing hour, 24=midnight, up to 30 = 6am next day
    bookingLeadMinutes: { type: Number, default: 15, min: 0, max: 1440 } // how far ahead a booking must be made
  },
  { _id: false, timestamps: true }
);

module.exports = mongoose.model('BusinessSettings', BusinessSettingsSchema);
