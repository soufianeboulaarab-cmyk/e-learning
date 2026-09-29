import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function BarreNavigation() {
  const { utilisateur, deconnexion } = useAuth();
  const navigate = useNavigate();

  function gererDeconnexion() {
    deconnexion();
    navigate('/login');
  }

  return (
    <nav className="site-nav" style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '15px 30px',
      borderBottom: '1px solid #ddd'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        <Link to="/modules" style={{ textDecoration: 'none', color: 'inherit' }}>
          <h2 style={{ margin: 0 }}>CODE 212</h2>
        </Link>
        {/* 1. Lien admin affiché UNIQUEMENT si le rôle est admin — simple
               confort d'affichage ; la vraie protection reste RouteAdmin,
               qui bloquerait l'accès même si ce lien était visible à tort. */}
        {utilisateur?.role === 'admin' && <Link to="/admin">Administration</Link>}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
        {utilisateur?.photoUrl && (
          <img
            src={utilisateur.photoUrl}
            alt="Photo de profil"
            style={{ width: '32px', height: '32px', borderRadius: '50%' }}
          />
        )}
        <span>{utilisateur?.nom} · {utilisateur?.role === 'admin' ? 'administrateur' : 'étudiant'}</span>
        <button onClick={gererDeconnexion}>Déconnexion</button>
      </div>
    </nav>
  );
}

export default BarreNavigation;