import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import BarreNavigation from '../components/BarreNavigation';

function ListeModules() {
  // 1. Trois états distincts pour gérer proprement les 3 phases possibles
  //    du chargement : en cours, réussi (avec données), échoué (avec erreur).
  const [modules, setModules] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    async function chargerModules() {
      try {
        // 2. L'intercepteur défini dans api.js ajoute AUTOMATIQUEMENT le token
        //    dans le header Authorization — on n'a rien à faire de spécial ici.
        const reponse = await api.get('/api/courses/modules');
        setModules(reponse.data);
      } catch (err) {
        setErreur('Impossible de charger les modules.');
      } finally {
        // 3. "finally" s'exécute que ça réussisse ou échoue : dans les deux cas,
        //    le chargement est terminé, donc on arrête l'indicateur "en cours".
        setChargement(false);
      }
    }

    chargerModules();
  }, []); // tableau vide = exécuté une seule fois, à l'affichage de la page

  return (
    <div>
      <BarreNavigation />

      <div style={{ padding: '30px' }}>
        <h1>Modules disponibles</h1>

        {/* 4. RENDU CONDITIONNEL : on affiche l'un OU l'autre selon l'état actuel. */}
        {chargement && <p>Chargement des modules...</p>}

        {erreur && <p style={{ color: 'red' }}>{erreur}</p>}

        {!chargement && !erreur && modules.length === 0 && (
          <p>Aucun module disponible pour le moment.</p>
        )}

        {/* 5. .map() transforme chaque objet "module" du tableau en un élément visuel.
               "key" est OBLIGATOIRE sur chaque élément généré par .map() en React :
               ça permet à React de suivre quel élément est lequel, pour optimiser
               les mises à jour de l'affichage (ne redessiner que ce qui a changé). */}
        <div style={{ display: 'grid', gap: '15px', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))' }}>
          {modules.map((module) => (
            <div
              key={module._id}
              className="module-card"
              onClick={() => navigate(`/modules/${module._id}`)}
              style={{
                border: '1px solid #ddd',
                borderRadius: '8px',
                padding: '20px',
                cursor: 'pointer'
              }}
            >
              <span className="module-symbol" aria-hidden="true">&lt;/&gt;</span>
              <h3>{module.titre}</h3>
              <p>{module.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default ListeModules;