import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import BarreNavigation from '../../components/BarreNavigation';

function AdminLecons() {
  const [modules, setModules] = useState([]);
  const [moduleSelectionne, setModuleSelectionne] = useState('');
  const [coursListe, setCoursListe] = useState([]);
  const [coursSelectionne, setCoursSelectionne] = useState('');
  const [lecons, setLecons] = useState([]);

  const [titre, setTitre] = useState('');
  const [contenuHtml, setContenuHtml] = useState('');
  const [ordre, setOrdre] = useState(1);
  const [erreur, setErreur] = useState(null);
  const [leconEnEdition, setLeconEnEdition] = useState(null);

  useEffect(() => {
    api.get('/api/courses/modules').then((r) => setModules(r.data));
  }, []);

  useEffect(() => {
    if (moduleSelectionne) {
      api.get(`/api/courses/modules/${moduleSelectionne}/cours`).then((r) => setCoursListe(r.data));
    } else {
      setCoursListe([]);
    }
    setCoursSelectionne('');
  }, [moduleSelectionne]);

  useEffect(() => {
    if (coursSelectionne) {
      api.get(`/api/courses/cours/${coursSelectionne}/lecons`).then((r) => setLecons(r.data));
    } else {
      setLecons([]);
    }
  }, [coursSelectionne]);

  function commencerEdition(l) {
    setLeconEnEdition(l._id);
    setTitre(l.titre);
    setContenuHtml(l.contenuHtml);
    setOrdre(l.ordre || 1);
  }

  function annulerEdition() {
    setLeconEnEdition(null);
    setTitre('');
    setContenuHtml('');
    setOrdre(1);
  }

  async function soumettreFormulaire(e) {
    e.preventDefault();
    setErreur(null);
    try {
      if (leconEnEdition) {
        await api.put(`/api/courses/lecons/${leconEnEdition}`, { titre, contenuHtml, ordre: parseInt(ordre) });
      } else {
        await api.post('/api/courses/lecons', { titre, contenuHtml, cours: coursSelectionne, ordre: parseInt(ordre) });
      }
      annulerEdition();
      const r = await api.get(`/api/courses/cours/${coursSelectionne}/lecons`);
      setLecons(r.data);
    } catch (err) {
      setErreur(err.response?.data?.message || 'Erreur');
    }
  }

  async function supprimerLecon(id) {
    if (!window.confirm('Supprimer cette leçon ? Cette action est irréversible.')) return;
    try {
      await api.delete(`/api/courses/lecons/${id}`);
      const r = await api.get(`/api/courses/cours/${coursSelectionne}/lecons`);
      setLecons(r.data);
    } catch (err) {
      alert('Erreur lors de la suppression : ' + (err.response?.data?.message || err.message));
    }
  }

  return (
    <div>
      <BarreNavigation />
      <div style={{ padding: '30px', maxWidth: '700px' }}>
        <Link to="/admin">← Retour à l'administration</Link>
        <h1>Gestion des Leçons</h1>

        <label>Module :</label>
        <select value={moduleSelectionne} onChange={(e) => setModuleSelectionne(e.target.value)}>
          <option value="">-- Choisir un module --</option>
          {modules.map((m) => <option key={m._id} value={m._id}>{m.titre}</option>)}
        </select>

        {moduleSelectionne && (
          <>
            <br /><br />
            <label>Cours :</label>
            <select value={coursSelectionne} onChange={(e) => setCoursSelectionne(e.target.value)}>
              <option value="">-- Choisir un cours --</option>
              {coursListe.map((c) => <option key={c._id} value={c._id}>{c.titre}</option>)}
            </select>
          </>
        )}

        {coursSelectionne && (
          <>
            <form onSubmit={soumettreFormulaire} style={{ margin: '20px 0', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <h3>{leconEnEdition ? 'Modifier la leçon' : 'Créer une nouvelle leçon'}</h3>
              <input placeholder="Titre de la leçon" value={titre} onChange={(e) => setTitre(e.target.value)} required />
              <textarea
                placeholder="Contenu HTML (ex: <h1>Titre</h1><p>Texte</p>)"
                value={contenuHtml}
                onChange={(e) => setContenuHtml(e.target.value)}
                rows={6}
                required
              />
              <input type="number" placeholder="Ordre" value={ordre} onChange={(e) => setOrdre(e.target.value)} />
              {erreur && <p style={{ color: 'red' }}>{erreur}</p>}
              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="submit">{leconEnEdition ? 'Enregistrer les modifications' : 'Créer la leçon'}</button>
                {leconEnEdition && <button type="button" onClick={annulerEdition}>Annuler</button>}
              </div>
            </form>

            <h2>Leçons de ce cours</h2>
            {lecons.map((l) => (
              <div key={l._id} style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '10px', marginBottom: '8px' }}>
                <strong>{l.titre}</strong>
                <p style={{ margin: '4px 0', fontSize: '0.85em', color: '#666' }}>ID : {l._id}</p>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={() => commencerEdition(l)}>Modifier</button>
                  <button onClick={() => supprimerLecon(l._id)} style={{ color: 'red' }}>Supprimer</button>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

export default AdminLecons;