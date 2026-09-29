const mongoose = require('mongoose');

const resultatSchema = new mongoose.Schema({
  // Référence "libre" vers l'utilisateur (dans user-service, autre base).
  // On récupère cet id depuis le token JWT décodé (req.utilisateur.id), jamais depuis le frontend.
  utilisateurId: {
    type: String,
    required: true
  },
  quiz: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Quiz',
    required: true
  },
  // On garde aussi leconId en copie directe : évite un aller-retour vers Quiz
  // juste pour savoir "à quelle leçon ça correspond" (petite optimisation de lecture).
  leconId: {
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
  // Détail des réponses données, utile pour la correction affichée à l'étudiant.
  reponses: [{
    questionIndex: Number,
    optionChoisieIndex: Number,
    correcte: Boolean
  }]
}, { timestamps: true });

module.exports = mongoose.model('Resultat', resultatSchema);