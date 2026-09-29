import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import BarreNavigation from '../components/BarreNavigation';

function DetailModule() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [module, setModule] = useState(null);
  const [cours, setCours] = useState([]);
  const [examenReussi, setExamenReussi] = useState(false);
  // 1. Nouveau : tous les cours sont-ils entièrement validés (toutes leurs
  //    leçons réussies) ? Détermine si le bouton examen est débloqué.
  const [moduleComplet, setModuleComplet] = useState(false);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState(null);

  useEffect(() => {
    async function chargerDonnees() {
      try {
        const [reponseModule, reponseCours, reponseStatut] = await Promise.all([
          api.get(`/api/courses/modules/${id}`),
          api.get(`/api/courses/modules/${id}/cours`),
          api.get(`/api/exam/resultats/module/${id}/statut`)
        ]);

        setModule(reponseModule.data);
        const listeCours = reponseCours.data;
        setCours(listeCours);
        setExamenReussi(reponseStatut.data.reussi);

        // 2. Pour CHAQUE cours, on récupère ses leçons — un appel par cours,
        //    tous en parallèle grâce à Promise.all + .map().
        const appelsLecons = listeCours.map((c) =>
          api.get(`/api/courses/cours/${c._id}/lecons`)
        );
        const reponsesLecons = await Promise.all(appelsLecons);

        // 3. On aplatit (.flat()) le tableau de tableaux [[lecon1,lecon2],[lecon3]]
        //    en un seul tableau [lecon1, lecon2, lecon3] — plus simple à traiter ensuite.
        const toutesLesLecons = reponsesLecons.map((r) => r.data).flat();

        if (toutesLesLecons.length === 0) {
          // 4. Aucune leçon dans tout le module : on considère qu'il n'y a
          //    rien à valider, donc l'examen est débloqué par défaut.
          setModuleComplet(true);
        } else {
          // 5. Pour CHAQUE leçon de TOUT le module, on vérifie son statut de quiz.
          const appelsStatuts = toutesLesLecons.map((lecon) =>
            api.get(`/api/quiz/resultats/lecon/${lecon._id}/statut`)
              // 6. .catch() ici : si une leçon n'a pas de quiz du tout, l'appel
              //    échouerait — on intercepte CET appel précis (pas tout le
              //    Promise.all) et on renvoie un statut "réussi" par défaut,
              //    conformément à la règle qu'on a fixée (pas de quiz = validé).
              .catch(() => ({ data: { reussi: true } }))
          );
          const reponsesStatuts = await Promise.all(appelsStatuts);

          // 7. Le module est complet SEULEMENT si TOUTES les leçons sont réussies.
          //    .every() renvoie true seulement si la condition est vraie pour CHAQUE élément.
          const toutesValidees = reponsesStatuts.every((r) => r.data.reussi === true);
          setModuleComplet(toutesValidees);
        }

      } catch (err) {
        setErreur('Impossible de charger les informations du module.');
      } finally {
        setChargement(false);
      }
    }

    chargerDonnees();
  }, [id]);

  async function telechargerCertificat() {
    try {
      const reponse = await api.get(`/api/progress/certificat/module/${id}`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([reponse.data]));
      const lien = document.createElement('a');
      lien.href = url;
      lien.setAttribute('download', `certificat-${id}.pdf`);
      document.body.appendChild(lien);
      lien.click();
      lien.remove();
    } catch (err) {
      alert("Impossible de télécharger le certificat.");
    }
  }

  if (chargement) return <p style={{ padding: '30px' }}>Chargement...</p>;
  if (erreur) return <p style={{ padding: '30px', color: 'red' }}>{erreur}</p>;

  return (
    <div>
      <BarreNavigation />

      <div style={{ padding: '30px' }}>
        <button onClick={() => navigate('/modules')}>← Retour aux modules</button>

        <h1>{module.titre}</h1>
        <p>{module.description}</p>

        {examenReussi ? (
          <div className="status-panel status-success" style={{ background: '#d4edda', padding: '15px', borderRadius: '8px', margin: '20px 0' }}>
            ✅ Examen réussi !
            <button onClick={telechargerCertificat} style={{ marginLeft: '15px' }}>
              Télécharger le certificat
            </button>
          </div>
        ) : moduleComplet ? (
          // 8. Tous les cours sont validés, mais l'examen pas encore réussi :
          //    on affiche le bouton pour LE PASSER.
          <div className="status-panel" style={{ background: '#cce5ff', padding: '15px', borderRadius: '8px', margin: '20px 0' }}>
            🎓 Tous les cours sont validés !
            <button onClick={() => navigate(`/examens/${id}`)} style={{ marginLeft: '15px' }}>
              Passer l'examen final
            </button>
          </div>
        ) : (
          // 9. Cas par défaut : il reste des leçons non validées, examen verrouillé.
          <div className="status-panel status-warning" style={{ background: '#fff3cd', padding: '15px', borderRadius: '8px', margin: '20px 0' }}>
            🔒 Terminez tous les cours pour débloquer l'examen final
          </div>
        )}

        <h2>Cours de ce module</h2>
        {cours.length === 0 && <p>Aucun cours disponible pour le moment.</p>}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {cours.map((c) => (
            <div
              key={c._id}
              className="course-row"
              onClick={() => navigate(`/cours/${c._id}`)}
              style={{
                border: '1px solid #ddd',
                borderRadius: '8px',
                padding: '15px',
                cursor: 'pointer'
              }}
            >
              <h3 style={{ margin: 0 }}>{c.titre}</h3>
              <p style={{ margin: '5px 0 0 0' }}>{c.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default DetailModule;    