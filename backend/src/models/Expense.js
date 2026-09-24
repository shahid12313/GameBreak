'use strict';
const mongoose = require('mongoose');
const { Schema } = mongoose;

const CATEGORIES = ['Electricity', 'Internet', 'Rent', 'Equipment', 'Maintenance', 'Staff', 'Supplies', 'Other'];

const ExpenseSchema = new Schema(
  {
    description: { type: String, required: true, maxlength: 120 },
    category: { type: String, enum: CATEGORIES, default: 'Other' },
    amount: { type: Number, required: true, min: 0 },
    date: { type: Date, required: true }
  },
  { timestamps: true }
);
ExpenseSchema.index({ date: -1 });

module.exports = mongoose.model('Expense', ExpenseSchema);
module.exports.CATEGORIES = CATEGORIES;
