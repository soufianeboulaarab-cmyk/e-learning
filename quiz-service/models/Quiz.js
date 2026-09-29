const mongoose = require('mongoose');

// 1. Schéma d'UNE option de réponse (embarqué dans une question).
const optionSchema = new mongoose.Schema({
  texte: { type: String, required: true },
  // "correcte" n'est JAMAIS envoyé au frontend avant la soumission
  // (voir la route GET /quizzes/lecon/:leconId plus bas, qui filtre ce champ).
  correcte: { type: Boolean, required: true, default: false }
});

// 2. Schéma d'UNE question (embarquée dans un quiz).
const questionSchema = new mongoose.Schema({
  texte: { type: String, required: true },
  options: {
    type: [optionSchema],
    validate: {
      // Validation personnalisée : on exige au moins 2 options,
      // et EXACTEMENT une option marquée correcte (QCM simple, une seule bonne réponse).
      validator: function (options) {
        const nbCorrectes = options.filter(o => o.correcte).length;
        return options.length >= 2 && nbCorrectes === 1;
      },
      message: 'Chaque question doit avoir au moins 2 options et exactement 1 bonne réponse.'
    }
  }
});

// 3. Schéma du Quiz lui-même.
const quizSchema = new mongoose.Schema({
  // Référence "libre" (pas d'ObjectId + ref, juste une chaîne) vers la leçon
  // dans course-service, car c'est un AUTRE service, une AUTRE base de données.
  leconId: {
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
      message: 'Un quiz doit contenir au moins une question.'
    }
  },
  // Cohérent avec ta règle : seuil de réussite en pourcentage.
  scoreMinimum: {
    type: Number,
    default: 90
  }
}, { timestamps: true });

module.exports = mongoose.model('Quiz', quizSchema);