const mongoose = require('mongoose');

const examenSchema = new mongoose.Schema({
  titre: {
    type: String,       
    required: true     
  },
  scoreMinimum: {
    type: Number,
    required: true,
    default: 90         
  }
}, {
  // "timestamps: true" ajoute automatiquement deux champs :
  //    createdAt (date de création) et updatedAt (date de dernière modification).
  timestamps: true
});

// On transforme le schéma en MODÈLE, un objet utilisable dans le code
//    pour manipuler la collection MongoDB correspondante.
//    "Examen" -> Mongoose créera automatiquement une collection nommée "examens".
const Examen = mongoose.model('Examen', examenSchema);

module.exports = Examen;