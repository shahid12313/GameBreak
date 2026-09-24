'use strict';
const mongoose = require('mongoose');
const { Schema } = mongoose;

const EventRegistrationSchema = new Schema(
  {
    eventId: { type: Schema.Types.ObjectId, ref: 'Event', required: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', default: null },
    name: { type: String, required: true, maxlength: 60 },
    phone: { type: String, required: true, maxlength: 20 },
    email: { type: String, default: '', maxlength: 80 },
    paid: { type: Boolean, default: false }
  },
  { timestamps: true }
);
EventRegistrationSchema.index({ eventId: 1 });

module.exports = mongoose.model('EventRegistration', EventRegistrationSchema);
