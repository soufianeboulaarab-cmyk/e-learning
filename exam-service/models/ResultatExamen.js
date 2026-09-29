const mongoose = require('mongoose');

const resultatExamenSchema = new mongoose.Schema({
  utilisateurId: {
    type: String,
    required: true
  },
  examen: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Examen',
    required: true
  },
  moduleId: {
    type: String,
    required: true
  },
  score: {
    type: Number,
    required: true
  },
  reussi: {
    type: Boolean,
    required: true
  },
  reponses: [{
    questionIndex: Number,
    optionChoisieIndex: Number,
    correcte: Boolean
  }]
}, { timestamps: true });

module.exports = mongoose.model('ResultatExamen', resultatExamenSchema);