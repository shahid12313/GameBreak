'use strict';
const mongoose = require('mongoose');
const { Schema } = mongoose;

const WaitingListSchema = new Schema(
  {
    name: { type: String, required: true, maxlength: 60 },
    phone: { type: String, default: '', maxlength: 20 },
    gameId: { type: Schema.Types.ObjectId, ref: 'Game', required: true },
    notes: { type: String, default: '', maxlength: 200 },
    status: { type: String, enum: ['waiting', 'notified', 'converted', 'cancelled'], default: 'waiting' },
    notifiedAt: { type: Date, default: null },
    bookingId: { type: Schema.Types.ObjectId, ref: 'Booking', default: null }
  },
  { timestamps: true }
);
WaitingListSchema.index({ status: 1, createdAt: 1 });

module.exports = mongoose.model('WaitingList', WaitingListSchema);
