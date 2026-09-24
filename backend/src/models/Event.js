'use strict';
const mongoose = require('mongoose');
const { Schema } = mongoose;

const EventSchema = new Schema(
  {
    title: { type: String, required: true, maxlength: 80 },
    kind: { type: String, default: 'tournament', maxlength: 30 },
    description: { type: String, default: '', maxlength: 500 },
    t: { type: Date, required: true },
    fee: { type: Number, default: 0, min: 0 },
    maxParticipants: { type: Number, default: 0, min: 0 }, // 0 = unlimited
    starred: { type: Boolean, default: false }
  },
  { timestamps: true }
);
EventSchema.index({ t: 1 });

module.exports = mongoose.model('Event', EventSchema);
