'use strict';
const mongoose = require('mongoose');
const { Schema } = mongoose;

const STATUSES = ['pending', 'confirmed', 'completed', 'cancelled', 'no-show'];

const BookingSchema = new Schema(
  {
    ref: { type: String, required: true, unique: true }, // e.g. GB-2026-00125
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', default: null },
    name: { type: String, required: true, maxlength: 60 },
    phone: { type: String, required: true, maxlength: 20 },
    email: { type: String, default: '', maxlength: 80 },
    gameId: { type: Schema.Types.ObjectId, ref: 'Game', required: true },
    gameName: String,
    stationId: { type: Schema.Types.ObjectId, ref: 'Station', default: null }, // assigned at check-in, not booking time
    t: { type: Date, required: true },
    durationMinutes: { type: Number, required: true },
    price: { type: Number, required: true },        // after any discount code
    discountCode: { type: String, default: '' },
    pay: { type: String, enum: ['Unpaid', 'Partial', 'Paid'], default: 'Unpaid' },
    status: { type: String, enum: STATUSES, default: 'pending' },
    source: { type: String, enum: ['web', 'staff'], default: 'staff' }
  },
  { timestamps: true }
);
BookingSchema.index({ status: 1, t: -1 });
BookingSchema.index({ gameId: 1, t: 1 });
BookingSchema.index({ customerId: 1, t: -1 });

module.exports = mongoose.model('Booking', BookingSchema);
module.exports.STATUSES = STATUSES;
