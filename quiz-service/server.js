require('dotenv').config();

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const Quiz = require('./models/Quiz');
const Resultat = require('./models/Resultat');
const verifierAuth = require('./middleware/auth');
const adminUniquement = require('./middleware/adminOnly');

const app = express();
const PORT = process.env.PORT || 3004;

app.use(cors({ origin: true }));
app.use(express.json());

let dbConnected = false;
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/quizdb')
  .then(() => { dbConnected = true; console.log('✅ Connecté à MongoDB (quizdb)'); })
  .catch((err) => console.error('❌ Erreur MongoDB :', err.message));

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'UP',
    service: 'quiz-service',
    database: dbConnected ? 'CONNECTED' : 'DISCONNECTED',
    timestamp: new Date().toISOString()
  });
});

// ============================================================
// GESTION DES QUIZ (admin)
// ============================================================

// Créer un quiz pour une leçon donnée. Réservé aux admins.
app.post('/quizzes', verifierAuth, adminUniquement, async (req, res) => {
  try {
    const quiz = await Quiz.create({
      leconId: req.body.leconId,
      titre: req.body.titre,
      questions: req.body.questions,
      scoreMinimum: req.body.scoreMinimum
    });
    res.status(201).json(quiz);
  } catch (err) {
    res.status(400).json({ message: 'Données invalides', error: err.message });
  }
});

// Récupérer le quiz COMPLET d'une leçon (avec les bonnes réponses), pour l'édition.
// Réservé aux admins : c'est la seule route qui expose le champ "correcte".
app.get('/quizzes/lecon/:leconId/admin', verifierAuth, adminUniquement, async (req, res) => {
  try {
    const quiz = await Quiz.findOne({ leconId: req.params.leconId });
    if (!quiz) return res.status(404).json({ message: 'Aucun quiz pour cette leçon' });
    res.status(200).json(quiz);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});

// Modifier un quiz. "runValidators: true" force Mongoose à réappliquer nos
// règles de validation (1 bonne réponse par question, etc.) sur une mise à jour,
// ce qu'il ne fait PAS par défaut avec findByIdAndUpdate.
app.put('/quizzes/:id', verifierAuth, adminUniquement, async (req, res) => {
  try {
    const quiz = await Quiz.findByIdAndUpdate(
      req.params.id,
      { titre: req.body.titre, questions: req.body.questions, scoreMinimum: req.body.scoreMinimum },
      { returnDocument: 'after', runValidators: true }
    );
    if (!quiz) return res.status(404).json({ message: 'Quiz non trouvé' });
    res.status(200).json(quiz);
  } catch (err) {
    res.status(400).json({ message: 'Données invalides', error: err.message });
  }
});

// Supprimer un quiz ET ses résultats associés.
app.delete('/quizzes/:id', verifierAuth, adminUniquement, async (req, res) => {
  try {
    const quiz = await Quiz.findByIdAndDelete(req.params.id);
    if (!quiz) return res.status(404).json({ message: 'Quiz non trouvé' });
    await Resultat.deleteMany({ quiz: quiz._id });
    res.status(200).json({ message: 'Quiz supprimé' });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});

// ============================================================
// PASSER UN QUIZ (étudiant)
// ============================================================

// 1. Récupérer le quiz d'une leçon, SANS révéler les bonnes réponses.
app.get('/quizzes/lecon/:leconId', verifierAuth, async (req, res) => {
  try {
    const quiz = await Quiz.findOne({ leconId: req.params.leconId });
    if (!quiz) return res.status(404).json({ message: 'Aucun quiz pour cette leçon' });

    // 2. On transforme le document Mongoose en objet JS classique (.toObject())
    //    pour pouvoir le modifier librement avant de l'envoyer.
    const quizSansReponses = quiz.toObject();

    // 3. On retire le champ "correcte" de chaque option, pour CHAQUE question.
    //    C'est LA ligne la plus importante de sécurité de cette route :
    //    sans ça, un étudiant pourrait voir les bonnes réponses dans l'onglet
    //    Réseau de son navigateur avant même de répondre.
    quizSansReponses.questions = quizSansReponses.questions.map(q => ({
      _id: q._id,
      texte: q.texte,
      options: q.options.map(o => ({ _id: o._id, texte: o.texte })) // pas de "correcte" ici
    }));

    res.status(200).json(quizSansReponses);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});

// 4. SOUMETTRE ses réponses — LE CŒUR DE LA LOGIQUE MÉTIER.
//    Le frontend envoie uniquement : [{ questionIndex: 0, optionChoisieIndex: 2 }, ...]
//    Jamais un score — c'est nous qui le calculons ici, côté serveur.
app.post('/quizzes/:id/soumettre', verifierAuth, async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) return res.status(404).json({ message: 'Quiz non trouvé' });

    const reponsesEtudiant = req.body.reponses; // tableau envoyé par le frontend

    if (!Array.isArray(reponsesEtudiant) || reponsesEtudiant.length !== quiz.questions.length) {
      return res.status(400).json({ message: 'Nombre de réponses incorrect' });
    }

    let nombreCorrectes = 0;
    const detailReponses = [];

    // 5. On PARCOURT CHAQUE QUESTION DU QUIZ EN BASE (jamais celles envoyées
    //    par le client) et on compare à ce que l'étudiant a choisi.
    quiz.questions.forEach((question, index) => {
      const reponseEtudiant = reponsesEtudiant.find(r => r.questionIndex === index);
      const optionChoisieIndex = reponseEtudiant ? reponseEtudiant.optionChoisieIndex : -1;

      // On retrouve, dans les options DE LA BASE, laquelle est marquée correcte.
      const indexBonneOption = question.options.findIndex(o => o.correcte);
      const estCorrecte = optionChoisieIndex === indexBonneOption;

      if (estCorrecte) nombreCorrectes++;

      detailReponses.push({
        questionIndex: index,
        optionChoisieIndex,
        correcte: estCorrecte
      });
    });

    // 6. Calcul du score en pourcentage, arrondi à 2 décimales.
    const score = Math.round((nombreCorrectes / quiz.questions.length) * 10000) / 100;

    // 7. Application de TA règle métier : réussite si score >= seuil du quiz (90% par défaut).
    const reussi = score >= quiz.scoreMinimum;

    // 8. On enregistre le résultat, en utilisant l'id utilisateur EXTRAIT DU TOKEN
    //    (req.utilisateur.id), jamais un id envoyé par le frontend — sinon un étudiant
    //    pourrait soumettre un résultat "pour" un autre étudiant.
    const resultat = await Resultat.create({
      utilisateurId: req.utilisateur.id,
      quiz: quiz._id,
      leconId: quiz.leconId,
      score,
      reussi,
      reponses: detailReponses
    });

    res.status(201).json({
      score,
      reussi,
      scoreMinimum: quiz.scoreMinimum,
      detailReponses,
      resultatId: resultat._id
    });

  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});

// ============================================================
// CONSULTER SES RÉSULTATS (étudiant : les siens / admin : tous)
// ============================================================

// L'étudiant connecté consulte SES propres résultats (pour "voir son évolution").
app.get('/resultats/moi', verifierAuth, async (req, res) => {
  try {
    const resultats = await Resultat.find({ utilisateurId: req.utilisateur.id })
      .sort('-createdAt');
    res.status(200).json(resultats);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});

// Vérifier si l'étudiant connecté a déjà réussi le quiz d'une leçon précise
// (utile pour afficher un badge "✅ validé" sur la leçon dans le frontend).
app.get('/resultats/lecon/:leconId/statut', verifierAuth, async (req, res) => {
  try {
    const meilleurResultat = await Resultat.findOne({
      utilisateurId: req.utilisateur.id,
      leconId: req.params.leconId,
      reussi: true
    });
    res.status(200).json({ reussi: !!meilleurResultat });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});

// ============================================================
// ADMIN : consulter / modifier / supprimer un quiz
// ============================================================

// Version COMPLÈTE du quiz (avec "correcte"), réservée aux admins.
// C'est la contrepartie de la route étudiant qui, elle, cache les bonnes réponses.
app.get('/quizzes/lecon/:leconId/admin', verifierAuth, adminUniquement, async (req, res) => {
  try {
    const quiz = await Quiz.findOne({ leconId: req.params.leconId });
    if (!quiz) return res.status(404).json({ message: 'Aucun quiz pour cette leçon' });
    res.status(200).json(quiz);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});

// Modification : on charge le document puis on appelle save(), car save()
// déclenche les validations du schéma (au moins 2 options, exactement 1 bonne
// réponse), contrairement à findByIdAndUpdate.
app.put('/quizzes/:id', verifierAuth, adminUniquement, async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) return res.status(404).json({ message: 'Quiz non trouvé' });

    quiz.titre = req.body.titre;
    quiz.questions = req.body.questions;
    if (req.body.scoreMinimum !== undefined) quiz.scoreMinimum = req.body.scoreMinimum;

    await quiz.save();
    res.status(200).json(quiz);
  } catch (err) {
    res.status(400).json({ message: 'Données invalides', error: err.message });
  }
});

// Suppression du quiz uniquement : les résultats des étudiants sont conservés (historique).
app.delete('/quizzes/:id', verifierAuth, adminUniquement, async (req, res) => {
  try {
    const quiz = await Quiz.findByIdAndDelete(req.params.id);
    if (!quiz) return res.status(404).json({ message: 'Quiz non trouvé' });
    res.status(200).json({ message: 'Quiz supprimé' });
  } catch (err) {
    res.status(400).json({ message: 'Erreur de suppression', error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`✅ quiz-service démarré sur http://localhost:${PORT}`);
});