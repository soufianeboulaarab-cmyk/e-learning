import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import BarreNavigation from '../../components/BarreNavigation';

function AdminModules() {
  const [modules, setModules] = useState([]);
  const [titre, setTitre] = useState('');
  const [description, setDescription] = useState('');
  const [erreur, setErreur] = useState(null);

  // 1. "moduleEnEdition" : null si on est en mode "création", sinon contient
  //    l'_id du module actuellement modifié — permet de réutiliser le même
  //    formulaire pour créer ET modifier, plutôt que d'en dupliquer un second.
  const [moduleEnEdition, setModuleEnEdition] = useState(null);

  async function chargerModules() {
    const reponse = await api.get('/api/courses/modules');
    setModules(reponse.data);
  }

  useEffect(() => { chargerModules(); }, []);

  // 2. Prépare le formulaire en mode édition : pré-remplit les champs
  //    avec les valeurs actuelles du module cliqué.
  function commencerEdition(module) {
    setModuleEnEdition(module._id);
    setTitre(module.titre);
    setDescription(module.description || '');
  }

  function annulerEdition() {
    setModuleEnEdition(null);
    setTitre('');
    setDescription('');
  }

  async function soumettreFormulaire(e) {
    e.preventDefault();
    setErreur(null);
    try {
      if (moduleEnEdition) {
        // 3. Mode édition : PUT vers /modules/:id (route déjà créée en Phase 8).
        await api.put(`/api/courses/modules/${moduleEnEdition}`, { titre, description });
      } else {
        // 4. Mode création : identique à avant.
        await api.post('/api/courses/modules', { titre, description });
      }
      annulerEdition();
      chargerModules();
    } catch (err) {
      setErreur(err.response?.data?.message || 'Erreur');
    }
  }

  async function supprimerModule(id) {
    // 5. window.confirm() bloque l'exécution jusqu'à ce que l'utilisateur
    //    clique "OK" ou "Annuler" — protection simple contre un clic accidentel.
    if (!window.confirm('Supprimer ce module ? Cette action est irréversible.')) return;

    try {
      await api.delete(`/api/courses/modules/${id}`);
      chargerModules();
    } catch (err) {
      alert('Erreur lors de la suppression : ' + (err.response?.data?.message || err.message));
    }
  }

  return (
    <div>
      <BarreNavigation />
      <div style={{ padding: '30px', maxWidth: '700px' }}>
        <Link to="/admin">← Retour à l'administration</Link>
        <h1>Gestion des Modules</h1>

        <form onSubmit={soumettreFormulaire} style={{ margin: '20px 0', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <h3>{moduleEnEdition ? 'Modifier le module' : 'Créer un nouveau module'}</h3>
          <input
            placeholder="Titre du module"
            value={titre}
            onChange={(e) => setTitre(e.target.value)}
            required
          />
          <textarea
            placeholder="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          {erreur && <p style={{ color: 'red' }}>{erreur}</p>}
          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="submit">{moduleEnEdition ? 'Enregistrer les modifications' : 'Créer le module'}</button>
            {moduleEnEdition && <button type="button" onClick={annulerEdition}>Annuler</button>}
          </div>
        </form>

        <h2>Modules existants</h2>
        {modules.map((m) => (
          <div key={m._id} style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '10px', marginBottom: '8px' }}>
            <strong>{m.titre}</strong>
            <p style={{ margin: '4px 0', fontSize: '0.85em', color: '#666' }}>ID : {m._id}</p>
            <p>{m.description}</p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => commencerEdition(m)}>Modifier</button>
              <button onClick={() => supprimerModule(m._id)} style={{ color: 'red' }}>Supprimer</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default AdminModules;