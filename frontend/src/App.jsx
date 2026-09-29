import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import ListeModules from './pages/ListeModules';
import DetailModule from './pages/DetailModule';
import DetailCours from './pages/DetailCours';
import DetailLecon from './pages/DetailLecon';
import ExamenModule from './pages/ExamenModule';
import AdminAccueil from './pages/admin/AdminAccueil';
import AdminModules from './pages/admin/AdminModules';
import AdminCours from './pages/admin/AdminCours';
import AdminLecons from './pages/admin/AdminLecons';
import AdminQuiz from './pages/admin/AdminQuiz';
import AdminExamens from './pages/admin/AdminExamens';
import RouteProtegee from './components/RouteProtegee';
import RouteAdmin from './components/RouteAdmin';
//verif worflow
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route path="/modules" element={<RouteProtegee><ListeModules /></RouteProtegee>} />
        <Route path="/modules/:id" element={<RouteProtegee><DetailModule /></RouteProtegee>} />
        <Route path="/cours/:id" element={<RouteProtegee><DetailCours /></RouteProtegee>} />
        <Route path="/lecons/:id" element={<RouteProtegee><DetailLecon /></RouteProtegee>} />
        <Route path="/examens/:id" element={<RouteProtegee><ExamenModule /></RouteProtegee>} />

        {/* Routes admin : protégées par RouteAdmin (connexion + rôle admin) */}
        <Route path="/admin" element={<RouteAdmin><AdminAccueil /></RouteAdmin>} />
        <Route path="/admin/modules" element={<RouteAdmin><AdminModules /></RouteAdmin>} />
        <Route path="/admin/cours" element={<RouteAdmin><AdminCours /></RouteAdmin>} />
        <Route path="/admin/lecons" element={<RouteAdmin><AdminLecons /></RouteAdmin>} />
        <Route path="/admin/quiz" element={<RouteAdmin><AdminQuiz /></RouteAdmin>} />
        <Route path="/admin/examens" element={<RouteAdmin><AdminExamens /></RouteAdmin>} />

        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;