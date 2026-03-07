/**
 * CONFIGURACIÓN DE SEGURIDAD Y COMPLIANCE ISO 25010
 *
 * Este archivo centraliza la configuración de todos los servicios
 * de seguridad, rate limiting e internacionalización
 */

// =======================================
// 🔐 CONFIGURACIÓN DE SEGURIDAD
// =======================================

export const SECURITY_CONFIG = {
  // CSRF
  csrf: {
    headerName: 'X-CSRF-TOKEN',
    enabled: true,
    fetchUrl: '/api/security/csrf-token'
  },

  // JWT
  jwt: {
    storageKey: 'access_token',
    refreshKey: 'refresh_token',
    expiryWarningMinutes: 5, // Advertencia 5 min antes de expirar
    validateLocally: true     // Validar JWT en frontend sin verificar firma
  },

  // Validación de entrada
  validation: {
    emailRegex: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    passwordMinLength: 6,
    passwordMaxLength: 128,
    sanitizeInputs: true
  }
};

// =======================================
// 🔒 CONFIGURACIÓN DE RATE LIMITING
// =======================================

export const RATE_LIMIT_CONFIG = {
  login: {
    maxAttempts: 5,
    timeWindowMinutes: 15,
    lockoutDurationMinutes: 30,
    storageKey: 'rate_limit_login'
  },

  api: {
    maxRequests: 100,
    timeWindowMinutes: 1,
    storageKey: 'rate_limit_api'
  }
};

// =======================================
// 🌍 CONFIGURACIÓN DE INTERNACIONALIZACIÓN
// =======================================

export const I18N_CONFIG = {
  defaultLanguage: 'es' as const,
  supportedLanguages: ['es', 'en', 'pt'] as const,
  fallbackLanguage: 'es',
  storageKey: 'app_language',

  // Recursos (pueden expandirse)
  namespaces: [
    'auth',
    'validation',
    'error',
    'success',
    'rateLimit',
    'access',
    'common'
  ]
};

// =======================================
// 📊 CONFIGURACIÓN DE ERRORES
// =======================================

export const ERROR_CONFIG = {
  // Límite de errores almacenados en memoria
  maxErrorsInMemory: 10,

  // Umbral para enviar a logger remoto
  remoteLoggerThreshold: 'CRITICAL' as const,
  remoteLoggerUrl: '/api/logs/errors',

  // Mapeo de errores HTTP a tipos
  httpErrorMapping: {
    400: 'VALIDATION',
    401: 'AUTHENTICATION',
    403: 'AUTHORIZATION',
    404: 'NOT_FOUND',
    422: 'VALIDATION',
    429: 'RATE_LIMIT',
    500: 'SERVER',
    502: 'SERVER',
    503: 'SERVER',
    504: 'SERVER',
    0: 'NETWORK',
    408: 'TIMEOUT'
  } as const,

  // Timeout para solicitudes (ms)
  requestTimeout: 30000
};

// =======================================
// 🎭 CONFIGURACIÓN DE ROLES Y PERMISOS
// =======================================

export const ROLE_CONFIG = {
  roles: [
    'ADMIN',
    'MANAGER',
    'STOREKEEPER',
    'CASHIER',
    'STAFF'
  ],

  // Permisos por rol (extensible)
  permissions: {
    ADMIN: ['read:all', 'write:all', 'delete:all', 'manage:users'],
    MANAGER: ['read:all', 'write:inventory', 'read:reports'],
    STOREKEEPER: ['read:inventory', 'write:inventory', 'read:stock'],
    CASHIER: ['read:transactions', 'write:transactions'],
    STAFF: ['read:shifts', 'read:tasks']
  },

  // Redireccionamiento por rol después del login
  redirectAfterLogin: {
    ADMIN: '/dashboard',
    MANAGER: '/dashboard',
    STOREKEEPER: '/inventory',
    CASHIER: '/transactions',
    STAFF: '/staff'
  }
};

// =======================================
// 🔌 CONFIGURACIÓN DE API
// =======================================

export const API_CONFIG = {
  baseUrl: 'http://localhost:8081', // Configurar desde enviroment.ts

  endpoints: {
    auth: {
      login: '/api/auth/login',
      logout: '/api/auth/logout',
      refresh: '/api/auth/refresh',
      google: '/api/auth/google'
    },
    security: {
      csrfToken: '/api/security/csrf-token'
    },
    logs: {
      errors: '/api/logs/errors',
      audit: '/api/logs/audit'
    }
  },

  // Configuración de cookies
  cookies: {
    httpOnly: true,        // Seguro contra XSS
    secure: true,          // HTTPS only
    sameSite: 'Strict',    // Seguro contra CSRF
    maxAge: 86400 * 7      // 7 días
  }
};

// =======================================
// 📱 CONFIGURACIÓN DE RESPONSIVE
// =======================================

export const RESPONSIVE_CONFIG = {
  breakpoints: {
    mobile: 480,
    tablet: 768,
    desktop: 1024,
    wide: 1440
  },

  // Ajustes de rate limit para móvil
  mobile: {
    maxAttempts: 3,       // Más restrictivo en móvil
    lockoutDurationMinutes: 60
  }
};

// =======================================
// 🧪 CONFIGURACIÓN DE TESTING
// =======================================

export const TESTING_CONFIG = {
  mockDelay: 100,           // Retraso simulado en requests
  enableMockApi: false,     // Usar mock API si true
  enableLogging: true,      // Habilitar logs en tests
  resetStorageBeforeTest: true
};

// =======================================
// 🚀 EXPORTS PARA USO EN SERVICIOS
// =======================================

export const FEATURE_FLAGS = {
  // Features que se pueden habilitar/deshabilitar
  enableRateLimit: true,
  enableCsrfValidation: true,
  enableInputSanitization: true,
  enableErrorTracking: true,
  enableAuditLogging: true,
  enableInternationalization: true
};

