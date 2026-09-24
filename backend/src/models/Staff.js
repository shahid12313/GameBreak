'use strict';
const mongoose = require('mongoose');
const { Schema } = mongoose;

/* Four-tier role system, per the spec:
   Owner > Admin > Manager > Staff. Higher levels can do everything a
   lower level can. Level numbers are what route middleware checks against. */
const ROLE_LEVEL = { Owner: 4, Admin: 3, Manager: 2, Staff: 1 };

const StaffSchema = new Schema(
  {
    name: { type: String, default: '', trim: true, maxlength: 60 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 80 },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: Object.keys(ROLE_LEVEL), default: 'Staff' },
    active: { type: Boolean, default: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Staff', StaffSchema);
module.exports.ROLE_LEVEL = ROLE_LEVEL;
