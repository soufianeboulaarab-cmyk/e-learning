const mongoose = require('mongoose');

const coursSchema = new mongoose.Schema({
  titre: {
    type: String,
    required: true
  },
  description: {
    type: String
  },

  module: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Module',
    required: true
  },

  ordre: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

module.exports = mongoose.model('Cours', coursSchema);