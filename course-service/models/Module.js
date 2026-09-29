const mongoose = require('mongoose');

const moduleSchema = new mongoose.Schema({
  titre: {
    type: String,
    required: true
  },
  description: {
    type: String
  },
  scoreMinimumExamen: {
    type: Number,
    default: 90
  }
}, { timestamps: true });

module.exports = mongoose.model('Module', moduleSchema);