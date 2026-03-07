# 👥 GUÍA PARA TU COMPAÑERO DE EQUIPO

Hola 👋, si tu compañero acaba de descargar el proyecto actualizado, aquí hay instrucciones sobre qué ha cambiado y cómo usarlo.

---

## 📥 PRIMEROS PASOS DESPUÉS DEL PULL

### 1. Instalar dependencias (si es necesario)
```bash
npm install
```

### 2. Limpiar caché (si hay problemas)
```bash
rm -rf node_modules package-lock.json
npm install
npm start
```

### 3. Verificar que todo funciona
```bash
npm start
# Debería estar disponible en http://localhost:4200
```

---

## 🆕 QUÉ HAY NUEVO

Se han añadido **6 características principales** de seguridad y compliance ISO 25010:

### 1. **Tests Unitarios** 🧪
- Archivo: `src/app/core/services/auth.service.spec.ts`
- 15+ casos de prueba para AuthService
- Ejecutar: `npm test`

### 2. **Protección CSRF + Validación** 🔐
- Archivo: `src/app/core/services/security.service.ts`
- Sanitización de inputs (XSS prevention)
- Validación de email, contraseña, JWT
- Headers de seguridad automáticos

### 3. **Rate Limiting** 🔒
- Archivo: `src/app/core/services/rate-limit.service.ts`
- Máximo 5 intentos en 15 minutos
- Bloqueo automático de 30 minutos
- Mensajes visibles al usuario

### 4. **Gestión de Permisos por Rol** 🎭
- Archivo: `src/app/core/guards/role-guard.service.ts`
- Guards automáticos en rutas
- Redirección según rol (STOREKEEPER → /inventory, otros → /dashboard)
- Verificación de permisos en componentes

### 5. **Internacionalización (i18n)** 🌍
- Archivo: `src/app/core/services/i18n.service.ts`
- Soporta: Español, English, Português
- 150+ traducciones predefinidas
- Carga automática del idioma del navegador

### 6. **Manejo de Errores Granular** ⚠️
- Archivo: `src/app/core/services/error-handling.service.ts`
- Categorización de 9 tipos de error
- 4 niveles de severidad
- Página de acceso denegado

---

## 🔄 CAMBIOS EN COMPONENTES EXISTENTES

### Login Component
```
✅ Ahora usa SecurityService para validar inputs
✅ Integrado con RateLimitService
✅ Mensajes de error traducidos
✅ Alertas de éxito, error y warning
✅ Botones deshabilitados cuando está bloqueado
```

### Routes
```
✅ Nueva ruta: /access-denied
✅ Protección mejorada en /dashboard e /inventory
```

---

## 🚀 CÓMO USAR LOS NUEVOS SERVICIOS

### SecurityService (Validación)
```typescript
import { SecurityService } from './core/services/security.service';

constructor(private security: SecurityService) {}

// Validar email
if (this.security.validateEmail(email)) { }

// Validar contraseña
const validation = this.security.validatePassword(password);

// Sanitizar input (XSS prevention)
const clean = this.security.sanitizeInput(userInput);
```

### RateLimitService (Bloqueo tras intentos)
```typescript
import { RateLimitService } from './core/services/rate-limit.service';

constructor(private rateLimit: RateLimitService) {}

ngOnInit() {
  this.rateLimit.isLockedOut$().subscribe(isLocked => {
    this.isBlocked = isLocked;
  });
}

// Registrar intento fallido
this.rateLimit.recordFailedAttempt('/api/auth/login');

// Limpiar tras éxito
this.rateLimit.clearFailedAttempts();
```

### I18nService (Traducciones)
```typescript
import { I18nService } from './core/services/i18n.service';

constructor(public i18n: I18nService) {}

// En templates
<h1>{{ i18n.translate('auth.login.title') }}</h1>

// En componentes
const title = this.i18n.translate('auth.login.title');

// Con parámetros
const msg = this.i18n.translate('rateLimit.message', { remaining: 30 });

// Cambiar idioma
this.i18n.setLanguage('en');
```

### ErrorHandlingService (Errores granular)
```typescript
import { ErrorHandlingService } from './core/services/error-handling.service';

constructor(private errorHandler: ErrorHandlingService) {}

// Manejar error HTTP
const error = this.errorHandler.handleHttpError(401, body);
console.log(error.userMessage); // Mensaje traducido

// Obtener errores
const errors = this.errorHandler.getErrors();
const lastError = this.errorHandler.getLastError();
```

---

## 📊 CONFIGURACIÓN CENTRALIZADA

Todos los parámetros de seguridad están en:
```
src/app/core/config/app.config.ts
```

Puedes modificar:
- Max intentos de rate limit
- Duración del bloqueo
- Roles y permisos
- URLs de API
- Idiomas soportados

---

## 🧪 EJECUTAR TESTS

```bash
# Todos los tests
npm test

# Tests específicos
npm test -- auth.service.spec.ts
npm test -- rate-limit.service.spec.ts
```

---

## 📚 DOCUMENTACIÓN

Hay 3 archivos de documentación:

1. **IMPLEMENTATION_SUMMARY.md** - Resumen de todo lo implementado
2. **ISO_25010_IMPLEMENTATION.md** - Documentación técnica completa
3. **QUICK_START_GUIDE.md** - Guía de referencia rápida

Lee al menos el QUICK_START_GUIDE para entender cómo usarlo.

---

## ❓ PREGUNTAS FRECUENTES

### ¿Qué pasa si cargo la app y no se ve nada?
```bash
# Limpia caché
npm start -- --poll 2000
# Si sigue igual, intenta:
rm -rf .angular/cache
npm start
```

### ¿Por qué después de 5 intentos fallidos no puedo hacer login?
Es el rate limiting. Espera 30 minutos o abre la consola y ejecuta:
```javascript
// En la consola del navegador
sessionStorage.clear();
location.reload();
```

### ¿Cómo cambiar el idioma?
```typescript
// En cualquier componente
constructor(private i18n: I18nService) {}

// Cambiar a inglés
this.i18n.setLanguage('en');

// Cambiar a portugués
this.i18n.setLanguage('pt');
```

### ¿Cómo añadir un nuevo rol?
1. Edita `src/app/core/config/app.config.ts`
2. Añade el rol en `ROLE_CONFIG.roles`
3. Añade permisos en `ROLE_CONFIG.permissions`
4. Añade redirección en `ROLE_CONFIG.redirectAfterLogin`
5. Crea el guard si es necesario

### ¿Cómo traducir a otro idioma?
1. Edita `src/app/core/services/i18n.service.ts`
2. Busca el objeto `translations`
3. Añade un nuevo idioma (ej: 'fr' para francés)
4. Copia todas las claves del español y traduce los valores

---

## 🔐 ASPECTOS DE SEGURIDAD

**Protegido contra:**
- ✅ XSS (sanitización de inputs)
- ✅ CSRF (tokens de seguridad)
- ✅ Fuerza bruta (rate limiting)
- ✅ Acceso no autorizado (guards de rol)
- ✅ Tokens expirados (validación local)

**NO protegido contra (requiere backend):**
- ❌ SQL Injection (responsabilidad del backend)
- ❌ Man-in-the-Middle (requiere HTTPS)
- ❌ DDoS (requiere servidor)

---

## 💡 TIPS Y TRUCOS

### Debugging de errores
```typescript
// En cualquier componente
constructor(private errorHandler: ErrorHandlingService) {}

ngOnInit() {
  this.errorHandler.getErrors$().subscribe(errors => {
    console.log('Errores activos:', errors);
  });
}
```

### Ver estado de rate limit
```typescript
// En la consola del navegador
sessionStorage.getItem('rate_limit_attempts')
```

### Ver idioma actual
```typescript
// En la consola
localStorage.getItem('app_language')
```

### Ver usuario actual
```typescript
// En cualquier componente
constructor(private auth: AuthService) {}

ngOnInit() {
  console.log(this.auth.getCurrentUser());
}
```

---

## 🐛 TROUBLESHOOTING

| Problema | Solución |
|---|---|
| "Cannot find module" | `npm install` |
| TypeScript errors | `npx tsc --noEmit` |
| App en blanco | Abrir DevTools, limpiar caché |
| Botones deshabilitados | Esperar 30 minutos (rate limit) o limpiar sessionStorage |
| Idioma no cambia | Recargar página (F5) |

---

## 📞 CONTACTO

Si tienes dudas sobre:
- **Tests**: Ver `auth.service.spec.ts`
- **Seguridad**: Ver `security.service.ts`
- **Rate Limit**: Ver `rate-limit.service.ts`
- **Errores**: Ver `error-handling.service.ts`
- **Traducciones**: Ver `i18n.service.ts`
- **Configuración**: Ver `app.config.ts`

O revisa la documentación:
- `QUICK_START_GUIDE.md` - Referencia rápida
- `ISO_25010_IMPLEMENTATION.md` - Documentación técnica
- `IMPLEMENTATION_SUMMARY.md` - Resumen general

---

## ✅ CHECKLIST PARA TU COMPAÑERO

- [ ] Git pull exitoso
- [ ] `npm install` ejecutado
- [ ] `npm start` funciona
- [ ] App abre en localhost:4200
- [ ] Puede hacer login (o ver pantalla de login)
- [ ] Lee QUICK_START_GUIDE.md
- [ ] Entiende los 6 nuevos servicios
- [ ] Ejecutó `npm test` (opcional)

---

## 🎉 ¡LISTO!

Ahora tu proyecto es más seguro, accesible y profesional.

**¡Happy coding! 🚀**

---

*Actualizado: 7 de marzo de 2026*

