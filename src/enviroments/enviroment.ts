/**
 * Configuración del entorno de desarrollo
 * URL del API y claves públicas
 */
export const environment = {
  production: false,

  // API Configuration
  apiUrl: 'http://localhost:8081',
  apiVersion: 'v1',

  // Authentication
  auth: {
    endpoints: {
      login: '/api/auth/login',
      refresh: '/api/auth/refresh',
      logout: '/api/auth/logout'
    },
    tokenKey: 'auth_token',
    refreshTokenKey: 'refresh_token',
    userKey: 'current_user',
    tokenExpiry: 24 * 60 * 60 * 1000, // 24 horas en ms
    refreshExpiry: 7 * 24 * 60 * 60 * 1000 // 7 días en ms
  },

  // reCAPTCHA
  recaptcha: {
    siteKey: '6LcTHIEsAAAAAJuGnqtBdfztpJS1_nFvbzDkmYmm', // Tu clave v2
    enabled: true,
    version: 'v2' // v2 con checkbox
  },

  // Google OAuth
  google: {
    clientId: '619549576770-oj20nuhmqcqu6c09qim0v6fj952jm93a.apps.googleusercontent.com', // Reemplaza con tu CLIENT_ID
    discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
    scopes: 'profile email'
  },

  // Application
  app: {
    name: 'Servly',
    version: '1.0.0',
    description: 'Sistema de gestión para restaurantes'
  }
};
