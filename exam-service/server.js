require('dotenv').config();

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const Examen = require('./models/Examen');
const ResultatExamen = require('./models/ResultatExamen');
const verifierAuth = require('./middleware/auth');
const adminUniquement = require('./middleware/adminOnly');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: true }));
app.use(express.json());

let dbConnected = false;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/examdb';
mongoose.connect(MONGO_URI)
  .then(() => { dbConnected = true; console.log('✅ Connecté à MongoDB (examdb)'); })
  .catch((err) => console.error('❌ Erreur MongoDB :', err.message));

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'UP',
    service: 'exam-service',
    database: dbConnected ? 'CONNECTED' : 'DISCONNECTED',
    timestamp: new Date().toISOString()
  });
});

// ============================================================
// GESTION DES EXAMENS (admin)
// ============================================================

app.post('/examens', verifierAuth, adminUniquement, async (req, res) => {
  try {
    const examen = await Examen.create({
      moduleId: req.body.moduleId,
      titre: req.body.titre,
      questions: req.body.questions,
      scoreMinimum: req.body.scoreMinimum
    });
    res.status(201).json(examen);
  } catch (err) {
    res.status(400).json({ message: 'Données invalides', error: err.message });
  }
});

// Récupérer l'examen COMPLET d'un module (avec les bonnes réponses), pour l'édition.
app.get('/examens/module/:moduleId/admin', verifierAuth, adminUniquement, async (req, res) => {
  try {
    const examen = await Examen.findOne({ moduleId: req.params.moduleId });
    if (!examen) return res.status(404).json({ message: 'Aucun examen pour ce module' });
    res.status(200).json(examen);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});

app.put('/examens/:id', verifierAuth, adminUniquement, async (req, res) => {
  try {
    const examen = await Examen.findByIdAndUpdate(
      req.params.id,
      { titre: req.body.titre, questions: req.body.questions, scoreMinimum: req.body.scoreMinimum },
      { returnDocument: 'after', runValidators: true }
    );
    if (!examen) return res.status(404).json({ message: 'Examen non trouvé' });
    res.status(200).json(examen);
  } catch (err) {
    res.status(400).json({ message: 'Données invalides', error: err.message });
  }
});

// Supprimer un examen ET ses résultats (sinon le module resterait "réussi"
// et le certificat téléchargeable alors que l'examen n'existe plus).
app.delete('/examens/:id', verifierAuth, adminUniquement, async (req, res) => {
  try {
    const examen = await Examen.findByIdAndDelete(req.params.id);
    if (!examen) return res.status(404).json({ message: 'Examen non trouvé' });
    await ResultatExamen.deleteMany({ examen: examen._id });
    res.status(200).json({ message: 'Examen supprimé' });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});

app.get('/examens', verifierAuth, async (req, res) => {
  try {
    // On liste sans les questions détaillées (juste les métadonnées),
    // pour éviter d'exposer par mégarde les bonnes réponses dans une liste globale.
    const examens = await Examen.find().select('titre moduleId scoreMinimum createdAt');
    res.status(200).json(examens);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});

// ============================================================
// PASSER UN EXAMEN (étudiant)
// ============================================================

// Récupérer l'examen d'un module, SANS révéler les bonnes réponses (même principe que quiz-service).
app.get('/examens/module/:moduleId', verifierAuth, async (req, res) => {
  try {
    const examen = await Examen.findOne({ moduleId: req.params.moduleId });
    if (!examen) return res.status(404).json({ message: 'Aucun examen pour ce module' });

    const examenSansReponses = examen.toObject();
    examenSansReponses.questions = examenSansReponses.questions.map(q => ({
      _id: q._id,
      texte: q.texte,
      options: q.options.map(o => ({ _id: o._id, texte: o.texte }))
    }));

    res.status(200).json(examenSansReponses);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});

// Soumission — calcul du score exclusivement côté serveur (identique à quiz-service).
app.post('/examens/:id/soumettre', verifierAuth, async (req, res) => {
  try {
    const examen = await Examen.findById(req.params.id);
    if (!examen) return res.status(404).json({ message: 'Examen non trouvé' });

    const reponsesEtudiant = req.body.reponses;

    if (!Array.isArray(reponsesEtudiant) || reponsesEtudiant.length !== examen.questions.length) {
      return res.status(400).json({ message: 'Nombre de réponses incorrect' });
    }

    let nombreCorrectes = 0;
    const detailReponses = [];

    examen.questions.forEach((question, index) => {
      const reponseEtudiant = reponsesEtudiant.find(r => r.questionIndex === index);
      const optionChoisieIndex = reponseEtudiant ? reponseEtudiant.optionChoisieIndex : -1;
      const indexBonneOption = question.options.findIndex(o => o.correcte);
      const estCorrecte = optionChoisieIndex === indexBonneOption;

      if (estCorrecte) nombreCorrectes++;

      detailReponses.push({ questionIndex: index, optionChoisieIndex, correcte: estCorrecte });
    });

    const score = Math.round((nombreCorrectes / examen.questions.length) * 10000) / 100;
    const reussi = score >= examen.scoreMinimum;

    const resultat = await ResultatExamen.create({
      utilisateurId: req.utilisateur.id,
      examen: examen._id,
      moduleId: examen.moduleId,
      score,
      reussi,
      reponses: detailReponses
    });

    res.status(201).json({
      score,
      reussi,
      scoreMinimum: examen.scoreMinimum,
      detailReponses,
      resultatId: resultat._id
    });

  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});

// ============================================================
// RÉSULTATS
// ============================================================

app.get('/resultats/moi', verifierAuth, async (req, res) => {
  try {
    const resultats = await ResultatExamen.find({ utilisateurId: req.utilisateur.id })
      .sort('-createdAt');
    res.status(200).json(resultats);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});

// Utile en Phase 11 (certificats) : savoir si l'étudiant connecté a réussi
// l'examen d'un module précis.
app.get('/resultats/module/:moduleId/statut', verifierAuth, async (req, res) => {
  try {
    const meilleurResultat = await ResultatExamen.findOne({
      utilisateurId: req.utilisateur.id,
      moduleId: req.params.moduleId,
      reussi: true
    });
    res.status(200).json({ reussi: !!meilleurResultat, resultat: meilleurResultat });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});

// ============================================================
// ADMIN : consulter / modifier / supprimer un examen
// ============================================================

app.get('/examens/module/:moduleId/admin', verifierAuth, adminUniquement, async (req, res) => {
  try {
    const examen = await Examen.findOne({ moduleId: req.params.moduleId });
    if (!examen) return res.status(404).json({ message: 'Aucun examen pour ce module' });
    res.status(200).json(examen);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});

app.put('/examens/:id', verifierAuth, adminUniquement, async (req, res) => {
  try {
    const examen = await Examen.findById(req.params.id);
    if (!examen) return res.status(404).json({ message: 'Examen non trouvé' });

    examen.titre = req.body.titre;
    examen.questions = req.body.questions;
    if (req.body.scoreMinimum !== undefined) examen.scoreMinimum = req.body.scoreMinimum;

    await examen.save();
    res.status(200).json(examen);
  } catch (err) {
    res.status(400).json({ message: 'Données invalides', error: err.message });
  }
});

// Les résultats (donc les droits aux certificats) sont conservés.
app.delete('/examens/:id', verifierAuth, adminUniquement, async (req, res) => {
  try {
    const examen = await Examen.findByIdAndDelete(req.params.id);
    if (!examen) return res.status(404).json({ message: 'Examen non trouvé' });
    res.status(200).json({ message: 'Examen supprimé' });
  } catch (err) {
    res.status(400).json({ message: 'Erreur de suppression', error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`✅ exam-service démarré sur http://localhost:${PORT}`);
});