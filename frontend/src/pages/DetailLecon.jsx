import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import BarreNavigation from '../components/BarreNavigation';

function DetailLecon() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [lecon, setLecon] = useState(null);
  const [quiz, setQuiz] = useState(null);
  // 1. reponsesChoisies : { 0: 2, 1: 0, ... } → à la question d'index 0,
  //    l'étudiant a choisi l'option d'index 2, etc.
  const [reponsesChoisies, setReponsesChoisies] = useState({});
  const [resultat, setResultat] = useState(null); // rempli après soumission
  const [chargement, setChargement] = useState(true);
  const [soumission, setSoumission] = useState(false);
  const [erreur, setErreur] = useState(null);

  useEffect(() => {
    async function chargerDonnees() {
      try {
        const reponseLecon = await api.get(`/api/courses/lecons/${id}`);
        setLecon(reponseLecon.data);

        // 2. Le quiz peut NE PAS EXISTER pour cette leçon (404) — c'est un cas
        //    normal, pas une vraie erreur, donc on le gère séparément avec son
        //    propre try/catch plutôt que de faire échouer tout le chargement.
        try {
          const reponseQuiz = await api.get(`/api/quiz/quizzes/lecon/${id}`);
          setQuiz(reponseQuiz.data);
        } catch {
          setQuiz(null); // pas de quiz pour cette leçon, on l'affichera simplement sans
        }

      } catch (err) {
        setErreur('Impossible de charger la leçon.');
      } finally {
        setChargement(false);
      }
    }

    chargerDonnees();
  }, [id]);

  // 3. Appelée au clic sur une option de réponse.
  function choisirReponse(questionIndex, optionIndex) {
    setReponsesChoisies((precedent) => ({
      ...precedent, // on garde les réponses déjà données aux AUTRES questions
      [questionIndex]: optionIndex // on met à jour/ajoute celle-ci
    }));
  }

  async function soumettreQuiz() {
    setSoumission(true);
    setErreur(null);

    try {
      // 4. On transforme l'objet { 0: 2, 1: 0 } en tableau attendu par le backend :
      //    [{ questionIndex: 0, optionChoisieIndex: 2 }, { questionIndex: 1, optionChoisieIndex: 0 }]
      const reponses = Object.entries(reponsesChoisies).map(([questionIndex, optionIndex]) => ({
        questionIndex: parseInt(questionIndex),
        optionChoisieIndex: optionIndex
      }));

      const reponse = await api.post(`/api/quiz/quizzes/${quiz._id}/soumettre`, { reponses });
      setResultat(reponse.data);

    } catch (err) {
      setErreur(err.response?.data?.message || 'Erreur lors de la soumission du quiz.');
    } finally {
      setSoumission(false);
    }
  }

  if (chargement) return <p style={{ padding: '30px' }}>Chargement...</p>;
  if (erreur && !lecon) return <p style={{ padding: '30px', color: 'red' }}>{erreur}</p>;

  // 5. Un quiz "complet" nécessite qu'une réponse ait été donnée à CHAQUE question,
  //    sinon le bouton de soumission reste désactivé (évite une erreur backend
  //    "Nombre de réponses incorrect" qu'on avait codée en Phase 9).
  const quizComplet = quiz && Object.keys(reponsesChoisies).length === quiz.questions.length;

  return (
    <div>
      <BarreNavigation />

      <div style={{ padding: '30px', maxWidth: '800px', margin: '0 auto' }}>
        <button onClick={() => navigate(-1)}>← Retour</button>

        <h1>{lecon.titre}</h1>

        {/* 6. Affichage du contenu HTML de la leçon, tel que stocké en base. */}
        <div dangerouslySetInnerHTML={{ __html: lecon.contenuHtml }} />

        <hr style={{ margin: '30px 0' }} />

        {!quiz && <p>Aucun quiz pour cette leçon.</p>}

        {quiz && !resultat && (
          <div>
            <h2>Quiz : {quiz.titre}</h2>
            <p>Score minimum pour valider : {quiz.scoreMinimum}%</p>

            {quiz.questions.map((question, qIndex) => (
              <div key={question._id} className="quiz-question" style={{ margin: '20px 0' }}>
                <p><strong>{qIndex + 1}. {question.texte}</strong></p>

                {question.options.map((option, oIndex) => (
                  <label key={option._id} style={{ display: 'block', margin: '5px 0', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name={`question-${qIndex}`}
                      checked={reponsesChoisies[qIndex] === oIndex}
                      onChange={() => choisirReponse(qIndex, oIndex)}
                    />
                    {' '}{option.texte}
                  </label>
                ))}
              </div>
            ))}

            {erreur && <p style={{ color: 'red' }}>{erreur}</p>}

            <button onClick={soumettreQuiz} disabled={!quizComplet || soumission}>
              {soumission ? 'Envoi...' : 'Valider le quiz'}
            </button>
          </div>
        )}

        {/* 7. Affichage du résultat après soumission réussie. */}
        {resultat && (
          <div style={{
            background: resultat.reussi ? '#d4edda' : '#f8d7da',
            padding: '20px',
            borderRadius: '8px'
          }}>
            <h2>{resultat.reussi ? '✅ Quiz réussi !' : '❌ Quiz non réussi'}</h2>
            <p>Score obtenu : {resultat.score}% (minimum requis : {resultat.scoreMinimum}%)</p>
            {!resultat.reussi && (
              <button onClick={() => { setResultat(null); setReponsesChoisies({}); }}>
                Réessayer
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default DetailLecon;