require('dotenv').config();

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const Module = require('./models/Module');
const Cours = require('./models/Cours');
const Lecon = require('./models/Lecon');
const verifierAuth = require('./middleware/auth');
const adminUniquement = require('./middleware/adminOnly');

const app = express();
const PORT = process.env.PORT || 3003;

app.use(cors({ origin: true }));
app.use(express.json());

let dbConnected = false;
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/coursedb')
  .then(() => { dbConnected = true; console.log('✅ Connecté à MongoDB (coursedb)'); })
  .catch((err) => console.error('❌ Erreur MongoDB :', err.message));

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'UP',
    service: 'course-service',
    database: dbConnected ? 'CONNECTED' : 'DISCONNECTED',
    timestamp: new Date().toISOString()
  });
});

// ============================================================
// MODULES
// ============================================================

// Lecture : accessible à tout utilisateur connecté (etudiant OU admin)
app.get('/modules', verifierAuth, async (req, res) => {
  try {
    const modules = await Module.find();
    res.status(200).json(modules);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});

app.get('/modules/:id', verifierAuth, async (req, res) => {
  try {
    const module = await Module.findById(req.params.id);
    if (!module) return res.status(404).json({ message: 'Module non trouvé' });
    res.status(200).json(module);
  } catch (err) {
    res.status(400).json({ message: 'ID invalide', error: err.message });
  }
});

// Ecriture : réservée aux admins
app.post('/modules', verifierAuth, adminUniquement, async (req, res) => {
  try {
    const nouveauModule = await Module.create({
      titre: req.body.titre,
      description: req.body.description,
      scoreMinimumExamen: req.body.scoreMinimumExamen
    });
    res.status(201).json(nouveauModule);
  } catch (err) {
    res.status(400).json({ message: 'Données invalides', error: err.message });
  }
});

app.put('/modules/:id', verifierAuth, adminUniquement, async (req, res) => {
  try {
    // { new: true } renvoie le document APRÈS modification, pas avant.
    const module = await Module.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!module) return res.status(404).json({ message: 'Module non trouvé' });
    res.status(200).json(module);
  } catch (err) {
    res.status(400).json({ message: 'Erreur de mise à jour', error: err.message });
  }
});

app.delete('/modules/:id', verifierAuth, adminUniquement, async (req, res) => {
  try {
    const module = await Module.findByIdAndDelete(req.params.id);
    if (!module) return res.status(404).json({ message: 'Module non trouvé' });
    res.status(200).json({ message: 'Module supprimé' });
  } catch (err) {
    res.status(400).json({ message: 'Erreur de suppression', error: err.message });
  }
});

// ============================================================
// COURS
// ============================================================

// Lister les cours d'un module précis : /modules/:moduleId/cours
app.get('/modules/:moduleId/cours', verifierAuth, async (req, res) => {
  try {
    const cours = await Cours.find({ module: req.params.moduleId }).sort('ordre');
    res.status(200).json(cours);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});

app.get('/cours/:id', verifierAuth, async (req, res) => {
  try {
    // .populate('module') remplace l'_id du module par ses infos complètes
    // (titre, description...) dans la réponse JSON.
    const cours = await Cours.findById(req.params.id).populate('module');
    if (!cours) return res.status(404).json({ message: 'Cours non trouvé' });
    res.status(200).json(cours);
  } catch (err) {
    res.status(400).json({ message: 'ID invalide', error: err.message });
  }
});

app.post('/cours', verifierAuth, adminUniquement, async (req, res) => {
  try {
    const nouveauCours = await Cours.create({
      titre: req.body.titre,
      description: req.body.description,
      module: req.body.module, // _id du module parent, envoyé par le frontend
      ordre: req.body.ordre
    });
    res.status(201).json(nouveauCours);
  } catch (err) {
    res.status(400).json({ message: 'Données invalides', error: err.message });
  }
});

app.put('/cours/:id', verifierAuth, adminUniquement, async (req, res) => {
  try {
    const cours = await Cours.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!cours) return res.status(404).json({ message: 'Cours non trouvé' });
    res.status(200).json(cours);
  } catch (err) {
    res.status(400).json({ message: 'Erreur de mise à jour', error: err.message });
  }
});

app.delete('/cours/:id', verifierAuth, adminUniquement, async (req, res) => {
  try {
    const cours = await Cours.findByIdAndDelete(req.params.id);
    if (!cours) return res.status(404).json({ message: 'Cours non trouvé' });
    res.status(200).json({ message: 'Cours supprimé' });
  } catch (err) {
    res.status(400).json({ message: 'Erreur de suppression', error: err.message });
  }
});

// ============================================================
// LEÇONS
// ============================================================

app.get('/cours/:coursId/lecons', verifierAuth, async (req, res) => {
  try {
    const lecons = await Lecon.find({ cours: req.params.coursId }).sort('ordre');
    res.status(200).json(lecons);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});

app.get('/lecons/:id', verifierAuth, async (req, res) => {
  try {
    const lecon = await Lecon.findById(req.params.id).populate('cours');
    if (!lecon) return res.status(404).json({ message: 'Leçon non trouvée' });
    res.status(200).json(lecon);
  } catch (err) {
    res.status(400).json({ message: 'ID invalide', error: err.message });
  }
});

app.post('/lecons', verifierAuth, adminUniquement, async (req, res) => {
  try {
    const nouvelleLecon = await Lecon.create({
      titre: req.body.titre,
      contenuHtml: req.body.contenuHtml,
      cours: req.body.cours, // _id du cours parent
      ordre: req.body.ordre,
      scoreMinimumQuiz: req.body.scoreMinimumQuiz
    });
    res.status(201).json(nouvelleLecon);
  } catch (err) {
    res.status(400).json({ message: 'Données invalides', error: err.message });
  }
});

app.put('/lecons/:id', verifierAuth, adminUniquement, async (req, res) => {
  try {
    const lecon = await Lecon.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!lecon) return res.status(404).json({ message: 'Leçon non trouvée' });
    res.status(200).json(lecon);
  } catch (err) {
    res.status(400).json({ message: 'Erreur de mise à jour', error: err.message });
  }
});

app.delete('/lecons/:id', verifierAuth, adminUniquement, async (req, res) => {
  try {
    const lecon = await Lecon.findByIdAndDelete(req.params.id);
    if (!lecon) return res.status(404).json({ message: 'Leçon non trouvée' });
    res.status(200).json({ message: 'Leçon supprimée' });
  } catch (err) {
    res.status(400).json({ message: 'Erreur de suppression', error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`✅ course-service démarré sur http://localhost:${PORT}`);
});