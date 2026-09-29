require('dotenv').config();

const express = require('express');
const cors = require('cors');
const axios = require('axios');
const PDFDocument = require('pdfkit');

const verifierAuth = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3005;

app.use(cors({ origin: true }));
app.use(express.json());

// 1. URLs des autres microservices, configurables par variable d'environnement.
//    Dans Docker Compose, ces noms d'hôtes seront les noms des SERVICES
//    (ex: "http://exam-service:3001"), résolus automatiquement sur le réseau pfa-network.
const EXAM_SERVICE_URL = process.env.EXAM_SERVICE_URL || 'http://localhost:3001';
const COURSE_SERVICE_URL = process.env.COURSE_SERVICE_URL || 'http://localhost:3003';
const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://localhost:3002';

app.get('/health', (req, res) => {
  // Pas de base de données ici, donc pas de champ "database" — ce service est stateless.
  res.status(200).json({
    status: 'UP',
    service: 'progress-service',
    timestamp: new Date().toISOString()
  });
});

// ============================================================
// PROGRESSION D'UN MODULE (agrégation course-service + exam-service)
// ============================================================

app.get('/progression/module/:moduleId', verifierAuth, async (req, res) => {
  const { moduleId } = req.params;

  // 2. On prépare les headers à RELAYER vers les autres services :
  //    le même token que celui reçu du frontend.
  const headersRelais = { Authorization: `Bearer ${req.tokenBrut}` };

  try {
    // 3. Appels en PARALLÈLE (Promise.all) plutôt qu'en série, pour aller plus vite :
    //    on n'a pas besoin d'attendre la réponse de l'un pour lancer l'autre.
    const [reponseCours, reponseStatutExamen] = await Promise.all([
      axios.get(`${COURSE_SERVICE_URL}/modules/${moduleId}/cours`, { headers: headersRelais }),
      axios.get(`${EXAM_SERVICE_URL}/resultats/module/${moduleId}/statut`, { headers: headersRelais })
    ]);

    res.status(200).json({
      moduleId,
      cours: reponseCours.data,
      examenReussi: reponseStatutExamen.data.reussi
    });

  } catch (err) {
    // 4. Si UN des services appelés est indisponible ou renvoie une erreur,
    //    on le signale clairement plutôt que de planter silencieusement.
    //    LOGS DE DEBUG détaillés : on affiche l'URL exacte qui a échoué,
    //    le status code renvoyé, et le corps de la réponse d'erreur.
    console.error('--- Erreur agrégation progression ---');
    console.error('URL appelée en échec :', err.config ? err.config.url : 'inconnue');
    console.error('Status code reçu :', err.response ? err.response.status : 'aucune réponse');
    console.error('Corps de la réponse :', err.response ? JSON.stringify(err.response.data) : 'aucun');
    console.error('Message brut :', err.message);
    res.status(502).json({
      message: 'Erreur lors de la récupération de la progression',
      error: err.message
    });
  }
});

// ============================================================
// CERTIFICAT (généré à la volée, en PDF)
// ============================================================

app.get('/certificat/module/:moduleId', verifierAuth, async (req, res) => {
  const { moduleId } = req.params;
  const headersRelais = { Authorization: `Bearer ${req.tokenBrut}` };

  try {
    // 5. ÉTAPE 1 : vérifier que l'étudiant a VRAIMENT réussi l'examen.
    //    On ne fait JAMAIS confiance à un paramètre du frontend pour ça —
    //    on revérifie toujours auprès de exam-service, la source de vérité.
    const { data: statutExamen } = await axios.get(
      `${EXAM_SERVICE_URL}/resultats/module/${moduleId}/statut`,
      { headers: headersRelais }
    );

    if (!statutExamen.reussi) {
      return res.status(403).json({
        message: "Vous n'avez pas encore réussi l'examen de ce module."
      });
    }

    // 6. ÉTAPE 2 : récupérer les infos nécessaires à l'affichage du certificat,
    //    en parallèle (nom de l'étudiant + titre du module).
    const [reponseUtilisateur, reponseModule] = await Promise.all([
      axios.get(`${USER_SERVICE_URL}/me`, { headers: headersRelais }),
      axios.get(`${COURSE_SERVICE_URL}/modules/${moduleId}`, { headers: headersRelais })
    ]);

    const nomEtudiant = reponseUtilisateur.data.nom;
    const titreModule = reponseModule.data.titre;
    const dateReussite = new Date(statutExamen.resultat.createdAt).toLocaleDateString('fr-FR');

    // 7. ÉTAPE 3 : générer le PDF EN MÉMOIRE, sans jamais l'écrire sur disque.
    //    On configure d'abord les headers de réponse HTTP pour dire au navigateur
    //    "ceci est un PDF à afficher/télécharger", puis on connecte le flux PDF
    //    directement à la réponse HTTP (res) avec .pipe().
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="certificat-${moduleId}.pdf"`);

    const doc = new PDFDocument({ layout: 'landscape', size: 'A4' });
    doc.pipe(res); // tout ce qu'on ajoute au document part directement vers le navigateur

    // 8. Contenu visuel du certificat (simple, à styliser plus tard si besoin).
    doc.fontSize(28).text('Certificat de Réussite', { align: 'center' });
    doc.moveDown(2);
    doc.fontSize(16).text('Ce certificat est décerné à', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(24).text(nomEtudiant, { align: 'center', underline: true });
    doc.moveDown(1.5);
    doc.fontSize(16).text(`pour avoir réussi avec succès l'examen du module :`, { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(20).text(titreModule, { align: 'center' });
    doc.moveDown(2);
    doc.fontSize(12).text(`Score obtenu : ${statutExamen.resultat.score}%`, { align: 'center' });
    doc.text(`Date de réussite : ${dateReussite}`, { align: 'center' });
    doc.moveDown(3);
    doc.fontSize(10).fillColor('gray').text(
      'Plateforme E-learning UCA — Certificat généré automatiquement',
      { align: 'center' }
    );

    // 9. .end() termine le document PDF — c'est ce qui déclenche l'envoi final
    //    du flux vers le navigateur.
    doc.end();

  } catch (err) {
    console.error('Erreur génération certificat :', err.message);
    if (!res.headersSent) {
      res.status(502).json({ message: 'Erreur lors de la génération du certificat', error: err.message });
    }
  }
});

app.listen(PORT, () => {
  console.log(`✅ progress-service démarré sur http://localhost:${PORT}`);
});