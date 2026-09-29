import axios from 'axios';

// 1. Une seule URL de base pour TOUT le frontend : l'API Gateway (Nginx),
//    jamais directement un microservice. C'est exactement le bénéfice de
//    la Gateway qu'on a mise en place en Phase 12 : le frontend n'a besoin
//    de connaître qu'UNE seule adresse.
//    "https://localhost" car on a configuré Nginx pour rediriger tout HTTP vers HTTPS.
const API_BASE_URL = 'https://localhost';

// 2. On crée une instance Axios préconfigurée, réutilisée partout dans l'app,
//    plutôt que de retaper l'URL de base à chaque appel.
const api = axios.create({
  baseURL: API_BASE_URL
});

// 3. INTERCEPTEUR : ce code s'exécute automatiquement AVANT chaque requête
//    envoyée avec "api". Il ajoute le token JWT (s'il existe) dans le header
//    Authorization, sans qu'on ait à le faire manuellement à chaque appel.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;