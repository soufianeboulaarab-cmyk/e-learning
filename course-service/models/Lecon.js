const mongoose = require('mongoose');

const leconSchema = new mongoose.Schema({
  titre: {
    type: String,
    required: true
  },
  // 1. Contenu HTML interactif de la leçon
  contenuHtml: {
    type: String,
    required: true
  },
  // 2. Référence vers le Cours parent
  cours: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Cours',
    required: true
  },
  ordre: {
    type: Number,
    default: 0
  },

  scoreMinimumQuiz: {
    type: Number,
    default: 90
  }
}, { timestamps: true });

module.exports = mongoose.model('Lecon', leconSchema);