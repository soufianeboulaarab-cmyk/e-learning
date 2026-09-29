import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import BarreNavigation from '../../components/BarreNavigation';

const questionVide = () => ({
  texte: '',
  options: [{ texte: '', correcte: true }, { texte: '', correcte: false }]
});

function AdminQuiz() {
  const [modules, setModules] = useState([]);
  const [moduleSelectionne, setModuleSelectionne] = useState('');
  const [coursListe, setCoursListe] = useState([]);
  const [coursSelectionne, setCoursSelectionne] = useState('');
  const [lecons, setLecons] = useState([]);
  const [leconSelectionnee, setLeconSelectionnee] = useState('');

  // 1. quizExistant : null = mode création ; sinon contient le quiz chargé
  //    depuis la base (mode édition).
  const [quizExistant, setQuizExistant] = useState(null);
  const [titreQuiz, setTitreQuiz] = useState('');
  const [questions, setQuestions] = useState([questionVide()]);
  const [erreur, setErreur] = useState(null);
  const [succes, setSucces] = useState(null);

  useEffect(() => { api.get('/api/courses/modules').then((r) => setModules(r.data)); }, []);

  useEffect(() => {
    if (moduleSelectionne) api.get(`/api/courses/modules/${moduleSelectionne}/cours`).then((r) => setCoursListe(r.data));
    else setCoursListe([]);
    setCoursSelectionne('');
  }, [moduleSelectionne]);

  useEffect(() => {
    if (coursSelectionne) api.get(`/api/courses/cours/${coursSelectionne}/lecons`).then((r) => setLecons(r.data));
    else setLecons([]);
    setLeconSelectionnee('');
  }, [coursSelectionne]);

  // 2. Dès qu'on choisit une leçon, on tente de charger son quiz existant
  //    via la route admin (qui inclut les bonnes réponses).
  //    404 = pas de quiz : on reste en mode création, formulaire vide.
  useEffect(() => {
    setErreur(null);
    setSucces(null);
    if (!leconSelectionnee) {
      setQuizExistant(null);
      return;
    }
    api.get(`/api/quiz/quizzes/lecon/${leconSelectionnee}/admin`)
      .then((r) => {
        setQuizExistant(r.data);
        setTitreQuiz(r.data.titre);
        setQuestions(r.data.questions);
      })
      .catch(() => {
        setQuizExistant(null);
        setTitreQuiz('');
        setQuestions([questionVide()]);
      });
  }, [leconSelectionnee]);

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
      if (quizExistant) {
        const r = await api.put(`/api/quiz/quizzes/${quizExistant._id}`, { titre: titreQuiz, questions });
        setQuizExistant(r.data);
        setSucces('Quiz modifié avec succès !');
      } else {
        const r = await api.post('/api/quiz/quizzes', { leconId: leconSelectionnee, titre: titreQuiz, questions });
        setQuizExistant(r.data);
        setSucces('Quiz créé avec succès !');
      }
    } catch (err) {
      setErreur(err.response?.data?.message || 'Erreur');
    }
  }

  async function supprimerQuiz() {
    if (!window.confirm('Supprimer ce quiz et tous les résultats associés ? Cette action est irréversible.')) return;
    try {
      await api.delete(`/api/quiz/quizzes/${quizExistant._id}`);
      setQuizExistant(null);
      setTitreQuiz('');
      setQuestions([questionVide()]);
      setSucces('Quiz supprimé.');
    } catch (err) {
      setErreur(err.response?.data?.message || 'Erreur lors de la suppression');
    }
  }

  return (
    <div>
      <BarreNavigation />
      <div style={{ padding: '30px', maxWidth: '700px' }}>
        <Link to="/admin">← Retour à l'administration</Link>
        <h1>Gestion des Quiz</h1>

        <label>Module :</label>
        <select value={moduleSelectionne} onChange={(e) => setModuleSelectionne(e.target.value)}>
          <option value="">-- Choisir --</option>
          {modules.map((m) => <option key={m._id} value={m._id}>{m.titre}</option>)}
        </select>

        {moduleSelectionne && (
          <>
            <br /><br /><label>Cours :</label>
            <select value={coursSelectionne} onChange={(e) => setCoursSelectionne(e.target.value)}>
              <option value="">-- Choisir --</option>
              {coursListe.map((c) => <option key={c._id} value={c._id}>{c.titre}</option>)}
            </select>
          </>
        )}

        {coursSelectionne && (
          <>
            <br /><br /><label>Leçon :</label>
            <select value={leconSelectionnee} onChange={(e) => setLeconSelectionnee(e.target.value)}>
              <option value="">-- Choisir --</option>
              {lecons.map((l) => <option key={l._id} value={l._id}>{l.titre}</option>)}
            </select>
          </>
        )}

        {leconSelectionnee && (
          <form onSubmit={soumettre} style={{ margin: '20px 0' }}>
            <h3>{quizExistant ? 'Modifier le quiz de cette leçon' : 'Créer un quiz pour cette leçon'}</h3>

            <input
              placeholder="Titre du quiz"
              value={titreQuiz}
              onChange={(e) => setTitreQuiz(e.target.value)}
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
              <button type="submit">{quizExistant ? 'Enregistrer les modifications' : 'Créer le quiz'}</button>
              {quizExistant && (
                <button type="button" onClick={supprimerQuiz} style={{ color: 'red' }}>Supprimer le quiz</button>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default AdminQuiz;