import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// 1. Ce composant enveloppe une page qui doit être protégée.
//    "children" représente le composant/page qu'on veut afficher SI l'utilisateur est connecté.
function RouteProtegee({ children }) {
  const { utilisateur } = useAuth();

  // 2. Si aucun utilisateur n'est dans le Context (donc pas de token valide sauvegardé),
  //    on redirige immédiatement vers /login, sans jamais afficher la page demandée.
  if (!utilisateur) {
    return <Navigate to="/login" />;
  }

  // 3. Sinon, on affiche normalement la page demandée.
  return children;
}

export default RouteProtegee;