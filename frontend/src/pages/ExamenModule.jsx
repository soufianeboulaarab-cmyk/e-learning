import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import BarreNavigation from '../components/BarreNavigation';

function ExamenModule() {
  const { id } = useParams(); // ici, id = moduleId
  const navigate = useNavigate();

  const [examen, setExamen] = useState(null);
  const [reponsesChoisies, setReponsesChoisies] = useState({});
  const [resultat, setResultat] = useState(null);
  const [chargement, setChargement] = useState(true);
  const [soumission, setSoumission] = useState(false);
  const [erreur, setErreur] = useState(null);

  useEffect(() => {
    async function chargerExamen() {
      try {
        const reponse = await api.get(`/api/exam/examens/module/${id}`);
        setExamen(reponse.data);
      } catch (err) {
        setErreur("Aucun examen disponible pour ce module pour le moment.");
      } finally {
        setChargement(false);
      }
    }
    chargerExamen();
  }, [id]);

  function choisirReponse(questionIndex, optionIndex) {
    setReponsesChoisies((precedent) => ({
      ...precedent,
      [questionIndex]: optionIndex
    }));
  }

  async function soumettreExamen() {
    setSoumission(true);
    setErreur(null);

    try {
      const reponses = Object.entries(reponsesChoisies).map(([questionIndex, optionIndex]) => ({
        questionIndex: parseInt(questionIndex),
        optionChoisieIndex: optionIndex
      }));

      const reponse = await api.post(`/api/exam/examens/${examen._id}/soumettre`, { reponses });
      setResultat(reponse.data);

    } catch (err) {
      setErreur(err.response?.data?.message || 'Erreur lors de la soumission.');
    } finally {
      setSoumission(false);
    }
  }

  if (chargement) return <p style={{ padding: '30px' }}>Chargement...</p>;
  if (erreur && !examen) {
    return (
      <div>
        <BarreNavigation />
        <div style={{ padding: '30px' }}>
          <button onClick={() => navigate(-1)}>← Retour</button>
          <p style={{ color: 'red' }}>{erreur}</p>
        </div>
      </div>
    );
  }

  const examenComplet = examen && Object.keys(reponsesChoisies).length === examen.questions.length;

  return (
    <div>
      <BarreNavigation />

      <div style={{ padding: '30px', maxWidth: '800px', margin: '0 auto' }}>
        <button onClick={() => navigate(-1)}>← Retour</button>

        <h1>Examen : {examen.titre}</h1>

        {!resultat && (
          <div>
            <p>Score minimum pour réussir : {examen.scoreMinimum}%</p>

            {examen.questions.map((question, qIndex) => (
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

            <button onClick={soumettreExamen} disabled={!examenComplet || soumission}>
              {soumission ? 'Envoi...' : "Valider l'examen"}
            </button>
          </div>
        )}

        {resultat && (
          <div style={{
            background: resultat.reussi ? '#d4edda' : '#f8d7da',
            padding: '20px',
            borderRadius: '8px'
          }}>
            <h2>{resultat.reussi ? '🎉 Examen réussi ! Félicitations !' : '❌ Examen non réussi'}</h2>
            <p>Score obtenu : {resultat.score}% (minimum requis : {resultat.scoreMinimum}%)</p>

            {resultat.reussi ? (
              <button onClick={() => navigate(`/modules/${id}`)}>
                Retour au module (télécharger le certificat)
              </button>
            ) : (
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

export default ExamenModule;