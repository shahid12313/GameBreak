'use strict';
const mongoose = require('mongoose');
const { Schema } = mongoose;

const InventoryItemSchema = new Schema(
  {
    name: { type: String, required: true, maxlength: 60 },
    icon: { type: String, default: '📦', maxlength: 8 },
    category: { type: String, default: 'Snacks', maxlength: 40 }, // Snacks/Drinks/Accessories/Equipment/...
    sellable: { type: Boolean, default: true },
    price: { type: Number, default: 0, min: 0 },   // ignored when sellable=false
    cost: { type: Number, required: true, min: 0 },
    stock: { type: Number, default: 0, min: 0 },
    lowStockThreshold: { type: Number, default: 5, min: 0 },
    unit: { type: String, default: 'piece', maxlength: 20 }
  },
  { timestamps: true }
);

module.exports = mongoose.model('InventoryItem', InventoryItemSchema);
