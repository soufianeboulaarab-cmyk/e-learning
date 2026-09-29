import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import './index.css';
import './App.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {/* AuthProvider enveloppe TOUTE l'application : n'importe quel composant,
        à n'importe quelle profondeur, pourra utiliser useAuth() pour accéder
        à l'utilisateur connecté. */}
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
);