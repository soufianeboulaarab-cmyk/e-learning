
// Usage : node scripts/setAdmin.js email@uca.ac.ma

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const emailCible = process.argv[2];

if (!emailCible) {
  console.error(' Usage : node scripts/setAdmin.js email@uca.ac.ma');
  process.exit(1);
}

async function promouvoirAdmin() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/userdb');

  const utilisateur = await User.findOneAndUpdate(
    { email: emailCible.toLowerCase() },
    { role: 'admin' },
    { new: true }
  );

  if (!utilisateur) {
    console.error(` Aucun utilisateur trouvé avec l'email ${emailCible}.`);
    console.error('   → Il doit se connecter au moins une fois via Google avant.');
  } else {
    console.log(` ${utilisateur.email} est maintenant ADMIN.`);
  }

  await mongoose.disconnect();
}

promouvoirAdmin();