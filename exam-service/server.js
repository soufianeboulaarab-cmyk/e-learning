const express = require('express');
const mongoose = require('mongoose');
const Examen = require('./models/Examen');

const app = express();
const PORT = process.env.PORT || 3001;

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/examdb';

app.use(express.json());

let dbConnected = false;

mongoose.connect(MONGO_URI)
  .then(() => {
    dbConnected = true;
    console.log('✅ Connecté à MongoDB avec succès :', MONGO_URI);
  })
  .catch((err) => {
    console.error('❌ Erreur de connexion à MongoDB :', err.message);
  });

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'UP',
    service: 'exam-service',
    database: dbConnected ? 'CONNECTED' : 'DISCONNECTED',
    timestamp: new Date().toISOString()
  });
});

app.get('/examens', async (req, res) => {
  try {
    const examens = await Examen.find();
    res.status(200).json(examens);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});

app.get('/examens/:id', async (req, res) => {
  try {
    const examen = await Examen.findById(req.params.id);
    if (!examen) {
      return res.status(404).json({ message: 'Examen non trouvé' });
    }
    res.status(200).json(examen);
  } catch (err) {
    // Si l'id fourni n'a pas un format MongoDB valide, Mongoose lève une erreur
    res.status(400).json({ message: 'ID invalide', error: err.message });
  }
});

app.post('/examens', async (req, res) => {
  try {
    const nouvelExamen = new Examen({
      titre: req.body.titre,
      scoreMinimum: req.body.scoreMinimum
    });
    const examenSauvegarde = await nouvelExamen.save();
    res.status(201).json(examenSauvegarde);
  } catch (err) {
    res.status(400).json({ message: 'Données invalides', error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`exam-service démarré sur http://localhost:${PORT}`);
});