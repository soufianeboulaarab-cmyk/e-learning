import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

// 1. Le Client ID Google — le MÊME que celui utilisé dans test-login.html
const GOOGLE_CLIENT_ID = '772705364192-9upe6omq4huvtlqqj08n8ag6fojcvnjg.apps.googleusercontent.com';

function Login() {
  const divBoutonGoogle = useRef(null); // référence vers l'élément DOM où Google affichera son bouton
  const [erreur, setErreur] = useState(null);
  const [chargement, setChargement] = useState(false);
  const { connexion } = useAuth();
  const navigate = useNavigate();

  // 2. Fonction appelée par Google après une connexion réussie
  //    (exactement le même principe que handleCredentialResponse dans test-login.html).
  async function gererReponseGoogle(response) {
    setChargement(true);
    setErreur(null);

    try {
      // 3. On appelle notre API Gateway (pas directement user-service !),
      //    qui route vers /api/users/ → user-service.
      const resultat = await api.post('/api/users/auth/google', {
        idToken: response.credential
      });

      // 4. Connexion réussie : on sauvegarde le token + les infos utilisateur
      //    dans le Context (et donc dans localStorage aussi, voir AuthContext.jsx).
      connexion(resultat.data.token, resultat.data.utilisateur);

      // 5. Redirection vers la page principale après connexion.
      navigate('/modules');

    } catch (err) {
      // 6. Affiche le message d'erreur renvoyé par le backend
      //    (ex: "seuls les emails @uca.ac.ma sont autorisés").
      const message = err.response?.data?.message || 'Erreur de connexion';
      setErreur(message);
    } finally {
      setChargement(false);
    }
  }

  // 7. useEffect s'exécute une fois que le composant est monté à l'écran.
  //    C'est ici qu'on initialise le bouton Google (la bibliothèque a besoin
  //    que l'élément HTML existe déjà dans le DOM avant de s'y attacher).
  useEffect(() => {
    // window.google est fourni par le <script> chargé dans index.html.
    if (window.google && divBoutonGoogle.current) {
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: gererReponseGoogle
      });

      window.google.accounts.id.renderButton(divBoutonGoogle.current, {
        theme: 'outline',
        size: 'large'
      });
    }
  }, []); // 8. Le tableau vide [] signifie : exécute ce code UNE SEULE FOIS,
          //    au premier affichage du composant (pas à chaque re-render).

  return (
    <main className="login-page">
      <div className="login-content">
        <div className="login-brand">CODE 212</div>
        <p>Plateforme e-learning · Université Cadi Ayyad</p>
        <section className="login-panel">
          <h2>Connexion</h2>
          <p>Utilisez votre compte @uca.ac.ma</p>
          <div className="login-google" ref={divBoutonGoogle}></div>
          {chargement && <p>Connexion en cours...</p>}
          {erreur && <p className="login-error">{erreur}</p>}
        </section>
      </div>
    </main>
  );
}

export default Login;