'use strict';
const mongoose = require('mongoose');
/* Backs atomic, human-readable sequence numbers (booking references, etc.).
   One doc per counter key, e.g. _id: "booking:2026". */
const CounterSchema = new mongoose.Schema({ _id: String, seq: { type: Number, default: 0 } });
module.exports = mongoose.model('Counter', CounterSchema);
