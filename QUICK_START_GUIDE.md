# 🔒 Guía de Uso - ISO 25010 Implementation

## 📋 Tabla de Contenidos
1. [Tests Unitarios](#tests-unitarios)
2. [Seguridad CSRF](#seguridad-csrf)
3. [Rate Limiting](#rate-limiting)
4. [Permisos por Rol](#permisos-por-rol)
5. [Internacionalización](#internacionalización)
6. [Manejo de Errores](#manejo-de-errores)
7. [Ejemplos Prácticos](#ejemplos-prácticos)

---

## Tests Unitarios

### Ejecutar tests
```bash
npm test
```

### Archivos
- `src/app/core/services/auth.service.spec.ts` - 15+ casos de prueba

### Cobertura
- Login exitoso/fallido
- Almacenamiento de tokens
- Logout y limpieza
- Validación de roles
- Refresh de tokens
- Manejo de errores HTTP

---

## Seguridad CSRF

### Servicio
```typescript
// src/app/core/services/security.service.ts

constructor(private securityService: SecurityService) {}

// Sanitizar input (XSS prevention)
const clean = this.securityService.sanitizeInput(userInput);

// Validar email
const isValid = this.securityService.validateEmail(email);

// Validar contraseña
const validation = this.securityService.validatePassword(password);
if (!validation.isValid) {
  console.log(validation.errors); // ['Mínimo 6 caracteres']
}

// Validar JWT localmente
const jwtCheck = this.securityService.validateJwt(token);
if (jwtCheck.expired) {
  // Token expirado, solicitar refresh
}

// Headers con CSRF token
const headers = this.securityService.getSecurityHeaders();
```

### Configuración
```typescript
// src/app/core/config/app.config.ts
SECURITY_CONFIG = {
  csrf: {
    headerName: 'X-CSRF-TOKEN',
    enabled: true
  },
  jwt: {
    expiryWarningMinutes: 5
  }
}
```

---

## Rate Limiting

### Uso en componentes
```typescript
constructor(private rateLimitService: RateLimitService) {}

ngOnInit() {
  // Escuchar estado de bloqueo
  this.rateLimitService.isLockedOut$().subscribe(isLocked => {
    this.isBlocked = isLocked;
  });

  // Escuchar tiempo restante
  this.rateLimitService.getRemainingTime$().subscribe(seconds => {
    this.remainingSeconds = seconds;
  });
}

onLoginAttempt() {
  // Verificar si está bloqueado
  if (this.rateLimitService.isLocked()) {
    alert('Demasiados intentos. Intenta más tarde.');
    return;
  }

  // Realizar login...
  this.authService.login(email, password, token).subscribe({
    next: () => {
      // Éxito - limpiar intentos
      this.rateLimitService.clearFailedAttempts();
    },
    error: () => {
      // Registrar intento fallido
      this.rateLimitService.recordFailedAttempt('/api/auth/login');
    }
  });
}

// Obtener información detallada
const status = this.rateLimitService.getStatus();
console.log(status.remainingAttempts);     // 3
console.log(status.maxAttempts);           // 5
console.log(status.lockoutTimeRemaining);  // 1240 (segundos)
```

### Configuración
```typescript
// src/app/core/config/app.config.ts
RATE_LIMIT_CONFIG = {
  login: {
    maxAttempts: 5,
    timeWindowMinutes: 15,
    lockoutDurationMinutes: 30
  }
}
```

---

## Permisos por Rol

### En rutas
```typescript
// src/app/app.routes.ts
{
  path: 'admin',
  component: AdminComponent,
  canActivate: [adminGuard]
},
{
  path: 'inventory',
  component: InventoryComponent,
  canActivate: [storekeeperGuard]
},
{
  path: 'reports',
  component: ReportsComponent,
  canActivate: [roleGuard(['ADMIN', 'MANAGER'])]
}
```

### En componentes
```typescript
constructor(private authService: AuthService) {}

canEdit(): boolean {
  return this.authService.hasRole('ADMIN');
}

canAccessReports(): boolean {
  return this.authService.hasAnyRole('ADMIN', 'MANAGER');
}

getRoles(): string[] {
  return this.authService.getCurrentUserRoles();
}
```

### En templates
```html
<!-- Solo si tiene rol ADMIN -->
<button *ngIf="authService.hasRole('ADMIN')">
  Administrar usuarios
</button>

<!-- Solo si tiene ADMIN o MANAGER -->
<div *ngIf="authService.hasAnyRole('ADMIN', 'MANAGER')">
  Ver reportes
</div>
```

### Configuración de permisos
```typescript
// src/app/core/config/app.config.ts
ROLE_CONFIG = {
  permissions: {
    ADMIN: ['read:all', 'write:all', 'delete:all', 'manage:users'],
    STOREKEEPER: ['read:inventory', 'write:inventory'],
    CASHIER: ['read:transactions', 'write:transactions']
  },
  redirectAfterLogin: {
    ADMIN: '/dashboard',
    STOREKEEPER: '/inventory',
    CASHIER: '/transactions'
  }
}
```

---

## Internacionalización

### Usar traducciones
```typescript
constructor(public i18n: I18nService) {}

// En el componente
getTitle(): string {
  return this.i18n.translate('auth.login.title');
  // Resultado: "Iniciar Sesión - Servly"
}

// Con parámetros
getMessage(): string {
  return this.i18n.translate('rateLimit.message', {
    remaining: 30
  });
  // Resultado: "Demasiados intentos. Intenta en 30 segundos"
}

// Cambiar idioma
setLanguage(lang: 'es' | 'en' | 'pt') {
  this.i18n.setLanguage(lang);
}

// Obtener idioma actual
const current = this.i18n.getCurrentLanguage(); // 'es'

// Escuchar cambios
this.i18n.getCurrentLanguage$().subscribe(lang => {
  console.log('Nuevo idioma:', lang);
});

// Obtener idiomas disponibles
const languages = this.i18n.getSupportedLanguages();
// [{code: 'es', name: 'Español'}, {code: 'en', name: 'English'}, ...]
```

### En templates
```html
<h1>{{ i18n.translate('auth.login.title') }}</h1>

<button>{{ i18n.translate('common.save') }}</button>

<label>{{ i18n.translate('validation.email.required') }}</label>
```

### Añadir nuevas traducciones
```typescript
this.i18n.addTranslations('es', {
  'custom.greeting': 'Hola {{name}}',
  'custom.farewell': 'Hasta luego'
});

const greeting = this.i18n.translate('custom.greeting', { name: 'Juan' });
// Resultado: "Hola Juan"
```

### Idiomas soportados
- `es` - Español (defecto)
- `en` - English
- `pt` - Português

---

## Manejo de Errores

### Tipos de error
```typescript
enum ErrorType {
  NETWORK = 'NETWORK',           // Error de conexión
  AUTHENTICATION = 'AUTHENTICATION', // 401 credenciales inválidas
  AUTHORIZATION = 'AUTHORIZATION',   // 403 acceso denegado
  VALIDATION = 'VALIDATION',         // 400/422 validación
  RATE_LIMIT = 'RATE_LIMIT',        // 429 demasiados intentos
  SERVER = 'SERVER',                // 500+ errores servidor
  CSRF = 'CSRF',                     // Token de seguridad
  TIMEOUT = 'TIMEOUT',               // Timeout de solicitud
  UNKNOWN = 'UNKNOWN'                // Desconocido
}
```

### Severidad
```typescript
enum ErrorSeverity {
  INFO = 'info',           // Información
  WARNING = 'warning',     // Advertencia
  ERROR = 'error',         // Error
  CRITICAL = 'critical'    // Error crítico (se envía a logger remoto)
}
```

### Uso en servicios
```typescript
constructor(private errorHandlingService: ErrorHandlingService) {}

// Manejar error HTTP
handleLoginError(error: any) {
  const appError = this.errorHandlingService.handleHttpError(
    error.status,        // 401
    error.error,         // {message: "Invalid credentials"}
    '/api/auth/login',   // URL
    'login'              // Contexto
  );

  console.log(appError.userMessage);      // "Email o contraseña incorrectos"
  console.log(appError.type);             // "AUTHENTICATION"
  console.log(appError.severity);         // "WARNING"
}

// Manejar error de red
const networkError = this.errorHandlingService.handleNetworkError(
  error,
  '/api/auth/login'
);

// Manejar timeout
const timeoutError = this.errorHandlingService.handleTimeoutError(
  '/api/auth/login'
);

// Obtener errores activos
const allErrors = this.errorHandlingService.getErrors();
const lastError = this.errorHandlingService.getLastError();

// Escuchar cambios
this.errorHandlingService.getErrors$().subscribe(errors => {
  console.log(`Hay ${errors.length} errores activos`);
});

// Limpiar
this.errorHandlingService.clearErrors();
this.errorHandlingService.clearError(errorId);

// Filtrar
const validationErrors = this.errorHandlingService.getErrorsByType('VALIDATION');
const criticalErrors = this.errorHandlingService.getErrorsBySeverity('CRITICAL');

// Estadísticas
const stats = this.errorHandlingService.getErrorStats();
console.log(stats.total);      // 3
console.log(stats.byType);     // {VALIDATION: 2, NETWORK: 1}
console.log(stats.bySeverity); // {WARNING: 2, ERROR: 1}
```

### Estructura de error
```typescript
interface AppError {
  id: string;                  // ID único: 'err_1234567890_abc123'
  type: ErrorType;             // Tipo de error
  severity: ErrorSeverity;     // Severidad
  message: string;             // Mensaje técnico
  translationKey?: string;     // 'error.401'
  httpStatus?: number;         // 401
  userMessage: string;         // Mensaje para usuario (traducido)
  details?: any;               // Detalles técnicos
  timestamp: Date;             // Cuándo ocurrió
  context?: string;            // 'login', 'api', etc
  action?: {
    label: string;             // 'Reintentar'
    callback: () => void;
  };
}
```

---

## Ejemplos Prácticos

### Ejemplo 1: Login Completo
```typescript
import { Component } from '@angular/core';
import { AuthService } from './services/auth.service';
import { SecurityService } from './services/security.service';
import { RateLimitService } from './services/rate-limit.service';
import { ErrorHandlingService } from './services/error-handling.service';
import { I18nService } from './services/i18n.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.html'
})
export class LoginComponent {
  email = '';
  password = '';
  isLoading = false;
  errorMessage = '';
  isRateLimited = false;

  constructor(
    private auth: AuthService,
    private security: SecurityService,
    private rateLimit: RateLimitService,
    private errorHandler: ErrorHandlingService,
    private i18n: I18nService
  ) {}

  onSubmit() {
    // 1. Verificar rate limit
    if (this.rateLimit.isLocked()) {
      const remaining = this.rateLimit.getLockoutTimeRemaining();
      this.errorMessage = this.i18n.translate('rateLimit.message', {
        remaining
      });
      return;
    }

    // 2. Validar con SecurityService
    if (!this.security.validateEmail(this.email)) {
      this.errorMessage = this.i18n.translate('validation.email.invalid');
      return;
    }

    const pwdValidation = this.security.validatePassword(this.password);
    if (!pwdValidation.isValid) {
      this.errorMessage = pwdValidation.errors[0];
      return;
    }

    // 3. Realizar login
    this.isLoading = true;
    this.auth.login(this.email, this.password, this.recaptchaToken)
      .subscribe({
        next: (response) => {
          this.isLoading = false;
          this.rateLimit.clearFailedAttempts();
          // Redirigir
          this.router.navigate(['/dashboard']);
        },
        error: (error) => {
          this.isLoading = false;

          // 4. Registrar intento fallido
          this.rateLimit.recordFailedAttempt('/api/auth/login');

          // 5. Manejar error
          const appError = this.errorHandler.handleHttpError(
            error.status,
            error.error,
            '/api/auth/login',
            'login'
          );

          this.errorMessage = appError.userMessage;
          this.isRateLimited = this.rateLimit.isLocked();
        }
      });
  }
}
```

### Ejemplo 2: Componente Protegido por Rol
```typescript
@Component({
  selector: 'app-admin-panel',
  template: `
    <div *ngIf="canAccess; else denied">
      <h1>Panel Administrativo</h1>
      <button *ngIf="auth.hasRole('ADMIN')" (click)="deleteUser()">
        Eliminar Usuario
      </button>
    </div>
    <ng-template #denied>
      <p>{{ i18n.translate('access.denied.message') }}</p>
    </ng-template>
  `
})
export class AdminPanelComponent implements OnInit {
  canAccess = false;

  constructor(
    public auth: AuthService,
    public i18n: I18nService
  ) {}

  ngOnInit() {
    // Verificar acceso
    this.canAccess = this.auth.hasRole('ADMIN');
  }

  deleteUser() {
    if (!this.auth.hasRole('ADMIN')) {
      const error = this.errorHandler.handleHttpError(403);
      console.log(error.userMessage);
      return;
    }
    // Proceder...
  }
}
```

### Ejemplo 3: Selector de Idioma
```typescript
@Component({
  selector: 'app-language-selector',
  template: `
    <select [value]="currentLang" (change)="changeLanguage($any($event).target.value)">
      <option *ngFor="let lang of languages" [value]="lang.code">
        {{ lang.name }}
      </option>
    </select>
  `
})
export class LanguageSelectorComponent implements OnInit {
  languages: any[] = [];
  currentLang = '';

  constructor(public i18n: I18nService) {}

  ngOnInit() {
    this.languages = this.i18n.getSupportedLanguages();
    this.currentLang = this.i18n.getCurrentLanguage();

    // Escuchar cambios
    this.i18n.getCurrentLanguage$().subscribe(lang => {
      this.currentLang = lang;
    });
  }

  changeLanguage(lang: string) {
    this.i18n.setLanguage(lang as any);
  }
}
```

---

## 📊 Checklist de Implementación

- [x] Tests unitarios para AuthService
- [x] CSRF token validation
- [x] Input sanitization (XSS prevention)
- [x] JWT validation localmente
- [x] Rate limiting con bloqueo automático
- [x] Guards de rol en rutas
- [x] Verificación de roles en componentes
- [x] Internacionalización (es, en, pt)
- [x] Manejo granular de errores HTTP
- [x] Categorización de errores
- [x] Página de acceso denegado
- [x] Logging de intentos fallidos
- [x] Redirección según rol

---

## 🚀 Próximos Pasos Recomendados

1. **Añadir más idiomas:** Editar `i18n.service.ts` y agregar traducciones
2. **Integrar logger remoto:** Implementar envío de errores CRITICAL a backend
3. **Tests E2E:** Crear pruebas con Cypress o Playwright
4. **Auditoría:** Agregar logging de acciones del usuario
5. **Recuperación:** Sistema automático de refresh de tokens

---

## 📞 Soporte y Documentación

- Configuración: `src/app/core/config/app.config.ts`
- Servicios: `src/app/core/services/`
- Tests: `src/app/core/services/auth.service.spec.ts`
- Guía completa: `ISO_25010_IMPLEMENTATION.md`

---

**¡Tu proyecto ahora cumple con ISO 25010! 🎉**

