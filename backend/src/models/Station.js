'use strict';
const mongoose = require('mongoose');
const { Schema } = mongoose;

const STATUSES = ['available', 'running', 'reserved', 'maintenance'];

const StationSchema = new Schema(
  {
    gameId: { type: Schema.Types.ObjectId, ref: 'Game', required: true },
    name: { type: String, required: true, trim: true, maxlength: 40 },
    status: { type: String, enum: STATUSES, default: 'available' }
  },
  { timestamps: true }
);
StationSchema.index({ gameId: 1 });

module.exports = mongoose.model('Station', StationSchema);
module.exports.STATUSES = STATUSES;
