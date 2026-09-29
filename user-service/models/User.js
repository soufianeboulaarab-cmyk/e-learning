const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,      
    lowercase: true     
  },

  // Infos récupérées depuis le profil Google
  nom: {
    type: String,
    required: true
  },
  photoUrl: {
    type: String
  },

  role: {
    type: String,
    enum: ['etudiant', 'admin'],
    default: 'etudiant'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('User', userSchema);