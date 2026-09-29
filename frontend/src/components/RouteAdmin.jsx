import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function RouteAdmin({ children }) {
  const { utilisateur } = useAuth();

  // D'abord vérifier la connexion (comme RouteProtegee), PUIS le rôle.
  if (!utilisateur) return <Navigate to="/login" />;
  if (utilisateur.role !== 'admin') return <Navigate to="/modules" />;

  return children;
}

export default RouteAdmin;