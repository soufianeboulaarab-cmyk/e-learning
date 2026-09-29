require('dotenv').config();

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');

const User = require('./models/User');
const verifierAuth = require('./middleware/auth');
const adminUniquement = require('./middleware/adminOnly');

const app = express();
const PORT = process.env.PORT || 3002;

const DOMAINE_AUTORISE = '@uca.ac.ma';

//C'est cet objet qui va vérifier les tokens envoyés par le frontend
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

app.use(cors({ origin: true }));

app.use(express.json());

let dbConnected = false;
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/userdb')
  .then(() => { dbConnected = true; console.log('✅ Connecté à MongoDB (userdb)'); })
  .catch((err) => console.error('❌ Erreur MongoDB :', err.message));

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'UP',
    service: 'user-service',
    database: dbConnected ? 'CONNECTED' : 'DISCONNECTED',
    timestamp: new Date().toISOString()
  });
});

// LA ROUTE CENTRALE : authentification via Google
// Le frontend envoie ici le "idToken" reçu de Google après le clic sur "Se connecter"
app.post('/auth/google', async (req, res) => {
  const { idToken } = req.body;
  if (!idToken) {
    return res.status(400).json({ message: 'idToken manquant' });
  }
  try {
    // VÉRIFICATION CRYPTOGRAPHIQUE auprès de Google
    const ticket = await googleClient.verifyIdToken({
      idToken: idToken,
      audience: process.env.GOOGLE_CLIENT_ID
    });
    
    const payload = ticket.getPayload();
    const email = payload.email.toLowerCase();

    if (!email.endsWith(DOMAINE_AUTORISE)) {
      return res.status(403).json({
        message: `Accès refusé : seuls les emails ${DOMAINE_AUTORISE} sont autorisés.`
      });
    }
    // On vérifie aussi que Google a bien confirmé cet email (anti-spoofing supplémentaire)
    if (!payload.email_verified) {
      return res.status(403).json({ message: 'Email Google non vérifié' });
    }

    // On cherche si cet utilisateur existe déjà dans NOTRE base
    let utilisateur = await User.findOne({ email });
    if (!utilisateur) {
      utilisateur = await User.create({
        email,
        nom: payload.name,
        photoUrl: payload.picture
      });
      console.log(`Nouvel utilisateur créé : ${email}`);
    }
    // On génère NOTRE JWT (différent de celui de Google) signé avec JWT_SECRET
    //  Il contient l'id Mongo de l'utilisateur et son rôle actuel
    //  "expiresIn: '7d'" : le token expirera après 7 jours, l'étudiant devra se reconnecter
    const token = jwt.sign(
      { id: utilisateur._id, email: utilisateur.email, role: utilisateur.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // On renvoie notre token + les infos utiles au frontend pour afficher le profil
    res.status(200).json({
      token,
      utilisateur: {
        id: utilisateur._id,
        email: utilisateur.email,
        nom: utilisateur.nom,
        photoUrl: utilisateur.photoUrl,
        role: utilisateur.role
      }
    });

  } catch (err) {
    // Si le token est invalide, expiré, ou falsifié, verifyIdToken() lève une exception ici
    console.error('Erreur de vérification du token Google :', err.message);
    res.status(401).json({ message: 'Token Google invalide' });
  }
});

// Route protégée d'exemple : récupérer SON PROPRE profil (nécessite d'être connecté).
app.get('/me', verifierAuth, async (req, res) => {
  const utilisateur = await User.findById(req.utilisateur.id);
  res.status(200).json(utilisateur);
});

// Route protégée ADMIN d'exemple : lister tous les utilisateurs.
app.get('/users', verifierAuth, adminUniquement, async (req, res) => {
  const utilisateurs = await User.find().select('-__v');
  res.status(200).json(utilisateurs);
});

app.listen(PORT, () => {
  console.log(`✅ user-service démarré sur http://localhost:${PORT}`);
});