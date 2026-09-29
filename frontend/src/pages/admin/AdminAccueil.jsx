import { Link } from 'react-router-dom';
import BarreNavigation from '../../components/BarreNavigation';

function AdminAccueil() {
  const lienStyle = {
    display: 'block',
    padding: '20px',
    border: '1px solid #ddd',
    borderRadius: '8px',
    marginBottom: '10px',
    textDecoration: 'none',
    color: 'inherit'
  };

  return (
    <div>
      <BarreNavigation />
      <div style={{ padding: '30px', maxWidth: '600px' }}>
        <h1>Espace Administration</h1>
        <Link to="/admin/modules" style={lienStyle}>📚 Gérer les Modules</Link>
        <Link to="/admin/cours" style={lienStyle}>📖 Gérer les Cours</Link>
        <Link to="/admin/lecons" style={lienStyle}>📝 Gérer les Leçons</Link>
        <Link to="/admin/quiz" style={lienStyle}>❓ Gérer les Quiz</Link>
        <Link to="/admin/examens" style={lienStyle}>🎓 Gérer les Examens</Link>
      </div>
    </div>
  );
}

export default AdminAccueil;