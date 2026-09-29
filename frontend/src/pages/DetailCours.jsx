import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import BarreNavigation from '../components/BarreNavigation';

function DetailCours() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [cours, setCours] = useState(null);
  const [lecons, setLecons] = useState([]);
  // 1. On stocke les statuts dans un OBJET plutôt qu'un tableau : { leconId: true/false, ... }
  //    C'est plus pratique pour retrouver rapidement le statut d'UNE leçon précise
  //    lors de l'affichage (voir plus bas : statutsLecons[lecon._id]).
  const [statutsLecons, setStatutsLecons] = useState({});
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState(null);

  useEffect(() => {
    async function chargerDonnees() {
      try {
        // 2. D'abord, on récupère le cours et ses leçons (2 appels, nombre fixe et connu).
        const [reponseCours, reponseLecons] = await Promise.all([
          api.get(`/api/courses/cours/${id}`),
          api.get(`/api/courses/cours/${id}/lecons`)
        ]);

        setCours(reponseCours.data);
        const listeLecons = reponseLecons.data;
        setLecons(listeLecons);

        // 3. Ensuite SEULEMENT (une fois qu'on connaît les leçons), on peut
        //    construire dynamiquement un appel de statut PAR leçon.
        //    .map() transforme chaque leçon en une PROMESSE d'appel API
        //    (l'appel n'est pas encore exécuté à ce stade, juste "préparé").
        const appelsStatuts = listeLecons.map((lecon) =>
          api.get(`/api/quiz/resultats/lecon/${lecon._id}/statut`)
        );

        // 4. Promise.all() sur ce tableau DYNAMIQUE : exécute tous ces appels
        //    en parallèle, quel que soit leur nombre (0, 3, 15 leçons...).
        const reponsesStatuts = await Promise.all(appelsStatuts);

        // 5. On reconstruit un objet { leconId: true/false } à partir des réponses,
        //    en les associant dans le MÊME ORDRE que listeLecons (garanti par Promise.all,
        //    qui préserve toujours l'ordre du tableau d'entrée, même si les appels
        //    reviennent dans le désordre côté réseau).
        const nouveauxStatuts = {};
        listeLecons.forEach((lecon, index) => {
          nouveauxStatuts[lecon._id] = reponsesStatuts[index].data.reussi;
        });
        setStatutsLecons(nouveauxStatuts);

      } catch (err) {
        setErreur('Impossible de charger les informations du cours.');
      } finally {
        setChargement(false);
      }
    }

    chargerDonnees();
  }, [id]);

  if (chargement) return <p style={{ padding: '30px' }}>Chargement...</p>;
  if (erreur) return <p style={{ padding: '30px', color: 'red' }}>{erreur}</p>;

  return (
    <div>
      <BarreNavigation />

      <div style={{ padding: '30px' }}>
        <button onClick={() => navigate(-1)}>← Retour</button>
        {/* 6. navigate(-1) revient à la page précédente dans l'historique,
               plus pratique ici qu'un chemin fixe car on peut arriver sur
               cette page depuis différents modules. */}

        <h1>{cours.titre}</h1>
        <p>{cours.description}</p>

        <h2>Leçons</h2>
        {lecons.length === 0 && <p>Aucune leçon disponible pour le moment.</p>}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {lecons.map((lecon) => {
            const reussie = statutsLecons[lecon._id];

            return (
              <div
                key={lecon._id}
                className={`lesson-row ${reussie ? 'is-complete' : 'is-pending'}`}
                onClick={() => navigate(`/lecons/${lecon._id}`)}
                style={{
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  padding: '15px',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <h3 style={{ margin: 0 }}>{lecon.titre}</h3>
                <span>{reussie ? '✅ Validée' : '⏳ À faire'}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default DetailCours;