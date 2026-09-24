'use strict';
const mongoose = require('mongoose');
const { Schema } = mongoose;

/* One collection serves two situations: a walk-in the counter staff added
   (no login — passwordHash is null) and a self-registered web account that
   can log in and see "My Bookings" (passwordHash set). A staff-created
   record can never log in until/unless it has a password. */
const CustomerSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 60 },
    email: { type: String, default: null, lowercase: true, trim: true, maxlength: 80 },
    phone: { type: String, default: '', trim: true, maxlength: 20 },
    passwordHash: { type: String, default: null },
    sessions: { type: Number, default: 0 },
    paid: { type: Number, default: 0 },
    due: { type: Number, default: 0 }
  },
  { timestamps: true }
);
CustomerSchema.index({ name: 1 });
CustomerSchema.index({ phone: 1 });
/* Sparse + unique: many walk-in customers have no email, but any email that
   IS set (i.e. a real account) must be unique. */
CustomerSchema.index({ email: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('Customer', CustomerSchema);
