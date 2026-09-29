import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import BarreNavigation from '../../components/BarreNavigation';

const questionVide = () => ({
  texte: '',
  options: [{ texte: '', correcte: true }, { texte: '', correcte: false }]
});

function AdminExamens() {
  const [modules, setModules] = useState([]);
  const [moduleSelectionne, setModuleSelectionne] = useState('');

  const [examenExistant, setExamenExistant] = useState(null);
  const [titreExamen, setTitreExamen] = useState('');
  const [questions, setQuestions] = useState([questionVide()]);
  const [erreur, setErreur] = useState(null);
  const [succes, setSucces] = useState(null);

  useEffect(() => { api.get('/api/courses/modules').then((r) => setModules(r.data)); }, []);

  // Au choix d'un module, on charge son examen existant (route admin, avec les
  // bonnes réponses). 404 = pas d'examen : mode création, formulaire vide.
  useEffect(() => {
    setErreur(null);
    setSucces(null);
    if (!moduleSelectionne) {
      setExamenExistant(null);
      return;
    }
    api.get(`/api/exam/examens/module/${moduleSelectionne}/admin`)
      .then((r) => {
        setExamenExistant(r.data);
        setTitreExamen(r.data.titre);
        setQuestions(r.data.questions);
      })
      .catch(() => {
        setExamenExistant(null);
        setTitreExamen('');
        setQuestions([questionVide()]);
      });
  }, [moduleSelectionne]);

  function ajouterQuestion() { setQuestions([...questions, questionVide()]); }

  function supprimerQuestion(index) {
    setQuestions(questions.filter((_, i) => i !== index));
  }

  function modifierTexteQuestion(index, valeur) {
    const copie = [...questions];
    copie[index] = { ...copie[index], texte: valeur };
    setQuestions(copie);
  }

  function modifierOption(qIndex, oIndex, valeur) {
    const copie = [...questions];
    copie[qIndex] = {
      ...copie[qIndex],
      options: copie[qIndex].options.map((o, i) => (i === oIndex ? { ...o, texte: valeur } : o))
    };
    setQuestions(copie);
  }

  function choisirBonneReponse(qIndex, oIndex) {
    const copie = [...questions];
    copie[qIndex] = {
      ...copie[qIndex],
      options: copie[qIndex].options.map((o, i) => ({ ...o, correcte: i === oIndex }))
    };
    setQuestions(copie);
  }

  function ajouterOption(qIndex) {
    const copie = [...questions];
    copie[qIndex] = {
      ...copie[qIndex],
      options: [...copie[qIndex].options, { texte: '', correcte: false }]
    };
    setQuestions(copie);
  }

  async function soumettre(e) {
    e.preventDefault();
    setErreur(null);
    setSucces(null);
    try {
      if (examenExistant) {
        const r = await api.put(`/api/exam/examens/${examenExistant._id}`, { titre: titreExamen, questions });
        setExamenExistant(r.data);
        setSucces('Examen modifié avec succès !');
      } else {
        const r = await api.post('/api/exam/examens', { moduleId: moduleSelectionne, titre: titreExamen, questions });
        setExamenExistant(r.data);
        setSucces('Examen créé avec succès !');
      }
    } catch (err) {
      setErreur(err.response?.data?.message || 'Erreur');
    }
  }

  async function supprimerExamen() {
    if (!window.confirm('Supprimer cet examen et tous les résultats associés ? Les certificats ne seront plus disponibles.')) return;
    try {
      await api.delete(`/api/exam/examens/${examenExistant._id}`);
      setExamenExistant(null);
      setTitreExamen('');
      setQuestions([questionVide()]);
      setSucces('Examen supprimé.');
    } catch (err) {
      setErreur(err.response?.data?.message || 'Erreur lors de la suppression');
    }
  }

  return (
    <div>
      <BarreNavigation />
      <div style={{ padding: '30px', maxWidth: '700px' }}>
        <Link to="/admin">← Retour à l'administration</Link>
        <h1>Gestion des Examens</h1>

        <label>Module :</label>
        <select value={moduleSelectionne} onChange={(e) => setModuleSelectionne(e.target.value)}>
          <option value="">-- Choisir --</option>
          {modules.map((m) => <option key={m._id} value={m._id}>{m.titre}</option>)}
        </select>

        {moduleSelectionne && (
          <form onSubmit={soumettre} style={{ margin: '20px 0' }}>
            <h3>{examenExistant ? "Modifier l'examen de ce module" : 'Créer un examen pour ce module'}</h3>

            <input
              placeholder="Titre de l'examen"
              value={titreExamen}
              onChange={(e) => setTitreExamen(e.target.value)}
              required
              style={{ display: 'block', width: '100%', margin: '10px 0' }}
            />

            {questions.map((q, qIndex) => (
              <div key={qIndex} style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '15px', margin: '10px 0' }}>
                <input
                  placeholder={`Question ${qIndex + 1}`}
                  value={q.texte}
                  onChange={(e) => modifierTexteQuestion(qIndex, e.target.value)}
                  required
                  style={{ display: 'block', width: '100%', marginBottom: '10px' }}
                />
                {q.options.map((opt, oIndex) => (
                  <div key={oIndex} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px' }}>
                    <input
                      type="radio"
                      name={`bonne-reponse-${qIndex}`}
                      checked={opt.correcte}
                      onChange={() => choisirBonneReponse(qIndex, oIndex)}
                    />
                    <input
                      placeholder={`Option ${oIndex + 1}`}
                      value={opt.texte}
                      onChange={(e) => modifierOption(qIndex, oIndex, e.target.value)}
                      required
                      style={{ flex: 1 }}
                    />
                  </div>
                ))}
                <button type="button" onClick={() => ajouterOption(qIndex)}>+ Ajouter une option</button>
                {questions.length > 1 && (
                  <button type="button" onClick={() => supprimerQuestion(qIndex)} style={{ marginLeft: '10px', color: 'red' }}>
                    Supprimer cette question
                  </button>
                )}
              </div>
            ))}

            <button type="button" onClick={ajouterQuestion}>+ Ajouter une question</button>
            <br /><br />
            {erreur && <p style={{ color: 'red' }}>{erreur}</p>}
            {succes && <p style={{ color: 'green' }}>{succes}</p>}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="submit">{examenExistant ? 'Enregistrer les modifications' : "Créer l'examen"}</button>
              {examenExistant && (
                <button type="button" onClick={supprimerExamen} style={{ color: 'red' }}>Supprimer l'examen</button>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default AdminExamens;