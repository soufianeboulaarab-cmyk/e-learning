import { createContext, useState, useContext } from 'react';

// 1. Le Context est un "conteneur" de données partagé. On le crée une fois ici.
const AuthContext = createContext(null);

// 2. Le "Provider" est un composant qui ENVELOPPE toute l'application (on le
//    verra dans main.jsx) et qui rend la donnée disponible à tous les
//    composants enfants, peu importe leur profondeur dans l'arbre.
export function AuthProvider({ children }) {
  // 3. On initialise l'état utilisateur en lisant le localStorage :
  //    si l'utilisateur avait déjà un token sauvegardé (connexion précédente,
  //    page rechargée), on le récupère directement, pas besoin de se reconnecter.
  const [utilisateur, setUtilisateur] = useState(() => {
    const utilisateurSauvegarde = localStorage.getItem('utilisateur');
    return utilisateurSauvegarde ? JSON.parse(utilisateurSauvegarde) : null;
  });

  // 4. Fonction appelée après une connexion Google réussie : sauvegarde
  //    le token ET les infos utilisateur, à la fois dans le state React
  //    (pour re-render immédiat) et dans localStorage (pour persister
  //    après un rechargement de page).
  function connexion(token, infosUtilisateur) {
    localStorage.setItem('token', token);
    localStorage.setItem('utilisateur', JSON.stringify(infosUtilisateur));
    setUtilisateur(infosUtilisateur);
  }

  // 5. Fonction de déconnexion : on vide tout.
  function deconnexion() {
    localStorage.removeItem('token');
    localStorage.removeItem('utilisateur');
    setUtilisateur(null);
  }

  return (
    <AuthContext.Provider value={{ utilisateur, connexion, deconnexion }}>
      {children}
    </AuthContext.Provider>
  );
}

// 6. Hook personnalisé pour accéder facilement au context depuis N'IMPORTE
//    QUEL composant, sans avoir à réimporter useContext + AuthContext partout.
//    Usage dans un composant : const { utilisateur, connexion } = useAuth();
export function useAuth() {
  return useContext(AuthContext);
}