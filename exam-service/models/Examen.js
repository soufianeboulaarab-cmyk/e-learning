const mongoose = require('mongoose');

// Structure identique à celle de quiz-service (mêmes règles de validation).
const optionSchema = new mongoose.Schema({
  texte: { type: String, required: true },
  correcte: { type: Boolean, required: true, default: false }
});

const questionSchema = new mongoose.Schema({
  texte: { type: String, required: true },
  options: {
    type: [optionSchema],
    validate: {
      validator: function (options) {
        const nbCorrectes = options.filter(o => o.correcte).length;
        return options.length >= 2 && nbCorrectes === 1;
      },
      message: 'Chaque question doit avoir au moins 2 options et exactement 1 bonne réponse.'
    }
  }
});

const examenSchema = new mongoose.Schema({
  // Référence "libre" vers le Module (dans course-service, autre base).
  moduleId: {
    type: String,
    required: true
  },
  titre: {
    type: String,
    required: true
  },
  questions: {
    type: [questionSchema],
    validate: {
      validator: (q) => q.length > 0,
      message: 'Un examen doit contenir au moins une question.'
    }
  },
  scoreMinimum: {
    type: Number,
    default: 90
  }
}, { timestamps: true });

module.exports = mongoose.model('Examen', examenSchema);