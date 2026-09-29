import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import BarreNavigation from '../../components/BarreNavigation';

function AdminCours() {
  const [modules, setModules] = useState([]);
  const [moduleSelectionne, setModuleSelectionne] = useState('');
  const [cours, setCours] = useState([]);
  const [titre, setTitre] = useState('');
  const [description, setDescription] = useState('');
  const [ordre, setOrdre] = useState(1);
  const [erreur, setErreur] = useState(null);
  const [coursEnEdition, setCoursEnEdition] = useState(null);

  useEffect(() => {
    api.get('/api/courses/modules').then((r) => setModules(r.data));
  }, []);

  useEffect(() => {
    if (moduleSelectionne) {
      api.get(`/api/courses/modules/${moduleSelectionne}/cours`).then((r) => setCours(r.data));
    } else {
      setCours([]);
    }
  }, [moduleSelectionne]);

  function commencerEdition(c) {
    setCoursEnEdition(c._id);
    setTitre(c.titre);
    setDescription(c.description || '');
    setOrdre(c.ordre || 1);
  }

  function annulerEdition() {
    setCoursEnEdition(null);
    setTitre('');
    setDescription('');
    setOrdre(1);
  }

  async function soumettreFormulaire(e) {
    e.preventDefault();
    setErreur(null);
    try {
      if (coursEnEdition) {
        await api.put(`/api/courses/cours/${coursEnEdition}`, { titre, description, ordre: parseInt(ordre) });
      } else {
        await api.post('/api/courses/cours', { titre, description, module: moduleSelectionne, ordre: parseInt(ordre) });
      }
      annulerEdition();
      const r = await api.get(`/api/courses/modules/${moduleSelectionne}/cours`);
      setCours(r.data);
    } catch (err) {
      setErreur(err.response?.data?.message || 'Erreur');
    }
  }

  async function supprimerCours(id) {
    if (!window.confirm('Supprimer ce cours ? Cette action est irréversible.')) return;
    try {
      await api.delete(`/api/courses/cours/${id}`);
      const r = await api.get(`/api/courses/modules/${moduleSelectionne}/cours`);
      setCours(r.data);
    } catch (err) {
      alert('Erreur lors de la suppression : ' + (err.response?.data?.message || err.message));
    }
  }

  return (
    <div>
      <BarreNavigation />
      <div style={{ padding: '30px', maxWidth: '700px' }}>
        <Link to="/admin">← Retour à l'administration</Link>
        <h1>Gestion des Cours</h1>

        <label>Module :</label>
        <select value={moduleSelectionne} onChange={(e) => setModuleSelectionne(e.target.value)}>
          <option value="">-- Choisir un module --</option>
          {modules.map((m) => (
            <option key={m._id} value={m._id}>{m.titre}</option>
          ))}
        </select>

        {moduleSelectionne && (
          <>
            <form onSubmit={soumettreFormulaire} style={{ margin: '20px 0', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <h3>{coursEnEdition ? 'Modifier le cours' : 'Créer un nouveau cours'}</h3>
              <input placeholder="Titre du cours" value={titre} onChange={(e) => setTitre(e.target.value)} required />
              <textarea placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
              <input type="number" placeholder="Ordre" value={ordre} onChange={(e) => setOrdre(e.target.value)} />
              {erreur && <p style={{ color: 'red' }}>{erreur}</p>}
              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="submit">{coursEnEdition ? 'Enregistrer les modifications' : 'Créer le cours'}</button>
                {coursEnEdition && <button type="button" onClick={annulerEdition}>Annuler</button>}
              </div>
            </form>

            <h2>Cours de ce module</h2>
            {cours.map((c) => (
              <div key={c._id} style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '10px', marginBottom: '8px' }}>
                <strong>{c.titre}</strong>
                <p style={{ margin: '4px 0', fontSize: '0.85em', color: '#666' }}>ID : {c._id}</p>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={() => commencerEdition(c)}>Modifier</button>
                  <button onClick={() => supprimerCours(c._id)} style={{ color: 'red' }}>Supprimer</button>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

export default AdminCours;