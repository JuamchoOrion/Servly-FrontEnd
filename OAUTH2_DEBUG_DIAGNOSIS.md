# Diagnóstico: Problema de Tokens con Rol KITCHEN

## Problema Reportado

- ✅ Usuario ADMIN: Los tokens se guardan correctamente en sessionStorage
- ❌ Usuario KITCHEN: Los tokens NO se guardan en sessionStorage

## Análisis del Código

### 1. OAuth2CallbackComponent.handleCallback()

El código actual:
```typescript
private handleCallback(): void {
  this.route.queryParams.subscribe(params => {
    const result = this.authService.processGoogleCallback(params);
    
    if (result.success) {
      this.router.navigate(['/dashboard'], { replaceUrl: true });
    }
  });
}
```

**Estado:** ✅ CORRECTO - No hay lógica condicional por rol

### 2. AuthService.processGoogleCallback()

El código actual:
```typescript
processGoogleCallback(params: { [key: string]: any }) {
  // 1. Extraer parámetros
  const accessToken = params['accessToken'];
  const refreshToken = params['refreshToken'];
  // ...
  
  // 2. Validar
  if (!accessToken || !refreshToken) {
    return { success: false, error: 'missing_tokens' };
  }
  
  // 3. Guardar tokens (SIN CONDICIÓN DE ROL)
  this.setTokens(accessToken, refreshToken);
  
  // 4. Guardar usuario (SIN CONDICIÓN DE ROL)
  this.setCurrentUser({ email, name, roles: [role], ... });
  
  return { success: true, user };
}
```

**Estado:** ✅ CORRECTO - Guarda tokens sin importar el rol

### 3. AuthService.setTokens()

El código actual:
```typescript
setTokens(accessToken: string, refreshToken: string): void {
  sessionStorage.setItem(this.TOKEN_KEY, accessToken);
  sessionStorage.setItem(this.REFRESH_TOKEN_KEY, refreshToken);
}
```

**Estado:** ✅ CORRECTO - Guarda tokens sin importar el rol

## Posibles Causas del Problema

### CAUSA 1: Backend redirige antes de tiempo (MÁS PROBABLE)

El backend podría estar:
1. Redirigiendo a una URL diferente para usuarios KITCHEN
2. Esa redirección ocurre ANTES de que Angular procese los query params
3. La nueva URL no tiene el componente OAuth2Callback montado

**Síntomas:**
- El backend recibe el callback de Google
- Para ADMIN: redirige a `/oauth2/callback?tokens=...`
- Para KITCHEN: redirige a `/dashboard` directamente (sin tokens en URL)

**Cómo verificar:**
1. Abrir DevTools → Network tab
2. Iniciar login con Google para usuario KITCHEN
3. Verificar la secuencia de redirecciones
4. ¿La URL final tiene query params con tokens?

### CAUSA 2: sessionStorage no disponible

El sessionStorage podría no estar disponible si:
1. El navegador está en modo incógnito con restricciones
2. Hay una extensión bloqueando storage
3. El contexto de ejecución no es seguro

**Cómo verificar:**
```javascript
// En consola del navegador
console.log(typeof sessionStorage); // Debe ser 'object'
console.log(sessionStorage); // Ver si está accesible
```

### CAUSA 3: Múltiples pestañas/ventanas

Si el usuario abre el login en múltiples pestañas:
1. El token se guarda en una pestaña
2. Otra pestaña sobrescribe sessionStorage
3. Los tokens se pierden

**Cómo verificar:**
- ¿El usuario tiene múltiples pestañas abiertas?
- ¿Hay otros procesos de login simultáneos?

### CAUSA 4: El backend no envía los tokens para rol KITCHEN

El backend podría no incluir los tokens en la respuesta para ciertos roles.

**Cómo verificar:**
1. Abrir DevTools → Network tab
2. Iniciar login con Google para usuario KITCHEN
3. Verificar la URL de redirección del backend
4. ¿La URL contiene `accessToken=` y `refreshToken=`?

## Solución Implementada

### 1. Logging Detallado en OAuth2CallbackComponent

```typescript
console.log('🔵 [OAuth2Callback] accessToken detectado:', accessToken ? '✅ SÍ' : '❌ NO');
console.log('🔵 [OAuth2Callback] refreshToken detectado:', refreshToken ? '✅ SÍ' : '❌ NO');
```

### 2. Verificación Post-Guardado

```typescript
const savedToken = this.authService.getAccessToken();
const savedRefreshToken = this.authService.getRefreshToken();

console.log('🔵 [OAuth2Callback] VERIFICACIÓN POST-GUARDADO:');
console.log('  - accessToken en sessionStorage:', savedToken ? '✅ SÍ' : '❌ NO');
console.log('  - refreshToken en sessionStorage:', savedRefreshToken ? '✅ SÍ' : '❌ NO');

if (!savedToken || !savedRefreshToken) {
  console.error('❌ [OAuth2Callback] ERROR CRÍTICO: Los tokens NO se guardaron!');
  this.handleMissingTokens();
  return;
}
```

### 3. Verificación en setTokens()

```typescript
sessionStorage.setItem(this.TOKEN_KEY, accessToken);
const verifyAccessToken = sessionStorage.getItem(this.TOKEN_KEY);

console.log('🔵 [TokenStorage] accessToken verificado:', verifyAccessToken ? '✅ SÍ' : '❌ NO');

if (!verifyAccessToken) {
  console.error('❌ [TokenStorage] ERROR: accessToken NO se guardó!');
}
```

### 4. Redirección Explícita por Rol

```typescript
private getDestinationRouteByRole(role: string | null): string {
  const roleRoutes: Record<string, string> = {
    'ADMIN': '/dashboard',
    'STOREKEEPER': '/inventory',
    'KITCHEN': '/dashboard',
    'WAITER': '/dashboard',
    'CASHIER': '/dashboard'
  };
  return roleRoutes[role] || '/dashboard';
}
```

## Pasos para Debuggear

### Paso 1: Verificar Backend

1. Iniciar sesión con usuario KITCHEN
2. Abrir DevTools → Network tab
3. Filtrar por "oauth2" o "callback"
4. Verificar la URL de redirección
5. **Pregunta clave:** ¿La URL contiene `accessToken=` y `refreshToken=`?

### Paso 2: Verificar Frontend

1. Abrir DevTools → Console
2. Buscar logs que empiecen con `[OAuth2Callback]`
3. Verificar secuencia:
   ```
   🔵 [OAuth2Callback] handleCallback() iniciado
   🔵 [OAuth2Callback] Query params recibidos: {...}
   🔵 [OAuth2Callback] accessToken detectado: ✅ SÍ
   🔵 [OAuth2Callback] refreshToken detectado: ✅ SÍ
   🔵 [TokenStorage] setTokens() llamado
   🔵 [TokenStorage] accessToken verificado: ✅ SÍ
   🔵 [TokenStorage] refreshToken verificado: ✅ SÍ
   ✅ [OAuth2Callback] Tokens guardados correctamente
   ```

### Paso 3: Verificar sessionStorage

1. Abrir DevTools → Application tab
2. Navegar a Session Storage → http://localhost:4200
3. Verificar keys:
   - `auth_token`
   - `refresh_token`
   - `current_user`

## Posible Solución si el Problema es del Backend

Si el backend NO envía los tokens para usuarios KITCHEN, el frontend no puede hacer nada. En ese caso:

1. **Contactar al equipo de backend**
2. **Verificar lógica de OAuth2 en el backend**
3. **Asegurar que todos los roles reciban tokens**

## Conclusión

El código del frontend es **CORRECTO** y no tiene lógica condicional por rol que pueda causar este problema. 

El problema más probable está en el **backend**, que podría:
1. No generar tokens para usuarios KITCHEN
2. Redirigir a una URL diferente sin tokens
3. Tener una configuración OAuth2 diferente por rol

Los logs agregados permitirán identificar exactamente en qué punto del flujo se pierde el token.
