function adminUniquement(req, res, next) {
  if (req.utilisateur.role !== 'admin') {
    return res.status(403).json({ message: 'Accès réservé aux administrateurs' });
  }
  next();
}

module.exports = adminUniquement;