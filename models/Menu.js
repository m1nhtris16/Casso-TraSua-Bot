const mongoose = require('mongoose');

const menuSchema = new mongoose.Schema({
  category: { type: String, required: true },
  item_id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  description: { type: String },
  price_m: { type: Number, required: true },
  price_l: { type: Number, required: true },
  available: { type: Boolean, default: true }
});

module.exports = mongoose.model('Menu', menuSchema);