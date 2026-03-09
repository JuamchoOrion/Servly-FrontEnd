# Implementación: Redirección Automática Basada en Roles

## Resumen

Se ha implementado un sistema de redirección automática basada en roles después del login, tanto para **login tradicional (email/contraseña)** como para **login con Google OAuth2**.

## Archivos Modificados

### 1. `src/app/core/services/auth.service.ts`

**Nuevos métodos agregados:**

#### `decodeJwtToken(token: string): any`
- Decodifica un token JWT y extrae el payload
- Busca el rol en múltiples campos posibles:
  - `role`
  - `roles` (array)
  - `authorities` (array)
  - Claims de Azure AD

#### `extractRoleFromToken(token: string): string | null`
- Extrae el rol del token JWT
- Retorna el rol en mayúsculas o null si no se encuentra
- Incluye logging detallado

#### `getRouteByRole(role: string): string`
- Determina la ruta de destino según el rol
- Mapeo de roles:
  - `ADMIN` → `/dashboard`
  - `STOREKEEPER` → `/inventory`
  - `KITCHEN` → `/dashboard`
  - `WAITER` → `/dashboard`
  - `CASHIER` → `/dashboard`
  - `DEFAULT` → `/welcome`

#### `redirectUserByRole(role?: string): void`
- Ejecuta la redirección basada en el rol
- Si no se proporciona el rol, lo obtiene del usuario actual
- Usa `Router.navigate()` para la redirección

**Métodos existentes modificados:**

#### `setCurrentUser(user: CurrentUser): void`
- Agregado logging para debugging

#### `processGoogleCallback(params: { [key: string]: any })`
- Ahora intenta extraer el rol del token JWT si no viene en los query params
- Logging mejorado

#### Constructor
- Agregada inyección de `Router`

### 2. `src/app/features/auth/pages/login/login.ts`

**Modificaciones:**

#### `onSubmit()` - Caso de éxito
- Reemplazada lógica de redirección condicional hardcodeada
- Ahora usa `authService.redirectUserByRole(userRole)`
- Agregado logging detallado

**Antes:**
```typescript
const userRole = response.role?.toUpperCase();
if (userRole === 'STOREKEEPER') {
  this.router.navigate(['/inventory']);
} else {
  this.router.navigate(['/dashboard']);
}
```

**Ahora:**
```typescript
const userRole = response.role?.toUpperCase();
this.authService.redirectUserByRole(userRole);
```

### 3. `src/app/features/auth/pages/login/oauth2-callback/oauth2-callback.component.ts`

**Modificaciones:**

#### `handleCallback()` - Caso de éxito
- Reemplazada llamada a `getDestinationRouteByRole()` local
- Ahora usa `authService.redirectUserByRole(role)` centralizado
- Eliminado método local `getDestinationRouteByRole()` (código duplicado)

**Antes:**
```typescript
const destinationRoute = this.getDestinationRouteByRole(role);
this.router.navigate([destinationRoute], { replaceUrl: true });
```

**Ahora:**
```typescript
this.authService.redirectUserByRole(role);
```

### 4. `src/app/app.routes.ts`

**Nueva ruta agregada:**
```typescript
{
  path: 'welcome',
  loadComponent: () =>
    import('./features/welcome/welcome.component').then(m => m.WelcomeComponent)
}
```

### 5. Nuevos Archivos Creados

#### `src/app/features/welcome/welcome.component.ts`
- Componente para usuarios sin rol específico
- Muestra información del usuario
- Opciones para ir al dashboard o cerrar sesión

#### `src/app/features/welcome/welcome.component.html`
- Template con información del usuario
- Botones de acción

#### `src/app/features/welcome/welcome.component.scss`
- Estilos modernos con gradientes

## Flujo de Funcionamiento

### Login Tradicional

```
1. Usuario ingresa email/contraseña
   ↓
2. AuthService.login() → Backend devuelve JWT
   ↓
3. AuthService guarda tokens en sessionStorage
   ↓
4. LoginComponent recibe response con role
   ↓
5. LoginComponent llama a authService.redirectUserByRole(role)
   ↓
6. AuthService determina ruta según rol
   ↓
7. Router navega a la ruta correspondiente
```

### Login con Google OAuth2

```
1. Usuario hace clic en "Login con Google"
   ↓
2. Redirección a backend → Google OAuth2
   ↓
3. Backend redirige a /oauth2/callback con tokens y role
   ↓
4. OAuth2CallbackComponent lee query params
   ↓
5. AuthService.processGoogleCallback() guarda tokens
   ↓
6. Si role no viene en params, se extrae del JWT
   ↓
7. OAuth2CallbackComponent llama a authService.redirectUserByRole(role)
   ↓
8. AuthService determina ruta según rol
   ↓
9. Router navega a la ruta correspondiente
```

## Logs de Debugging

### Login Tradicional Exitoso

```
═══════════════════════════════════════════════════════════
🔵 [Login] Autenticación exitosa
🔵 [Login] Response: { token, refreshToken, role: 'KITCHEN', ... }
🔵 [Login] Preparando redirección...
🔵 [Login] Guardando tokens...
🔵 [Login] Rol detectado: KITCHEN
🔵 [Login] Ejecutando redirección por rol
═══════════════════════════════════════════════════════════
🔵 [Auth] Ejecutando redirección basada en rol
═══════════════════════════════════════════════════════════
🔵 [Auth] Rol actual: KITCHEN
🔵 [Auth] getRouteByRole() llamado con rol: KITCHEN
🔵 [Auth] Ruta elegida para rol KITCHEN: /dashboard
🔵 [Auth] Redirigiendo a: /dashboard
✅ [Auth] Redirección ejecutada exitosamente a: /dashboard
═══════════════════════════════════════════════════════════
```

### Login Google OAuth2 Exitoso

```
🔵 [OAuth2Callback] Query params recibidos: { accessToken, refreshToken, email, name, role }
🔵 [OAuth2Callback] accessToken detectado: ✅ SÍ
🔵 [OAuth2Callback] refreshToken detectado: ✅ SÍ
🔵 [OAuth2Callback] role detectado: KITCHEN
🔵 [Google OAuth2] PROCESANDO CALLBACK
🔵 [Google OAuth2] Rol recibido del backend: KITCHEN
✅ [Google OAuth2] Usuario guardado correctamente
🔵 [OAuth2Callback] Ejecutando authService.redirectUserByRole()
═══════════════════════════════════════════════════════════
🔵 [Auth] Ejecutando redirección basada en rol
═══════════════════════════════════════════════════════════
🔵 [Auth] Rol actual: KITCHEN
🔵 [Auth] Ruta elegida para rol KITCHEN: /dashboard
✅ [Auth] Redirección ejecutada exitosamente a: /dashboard
═══════════════════════════════════════════════════════════
```

### Rol No Encontrado en Token

```
🔵 [Auth] extractRoleFromToken() llamado
🔵 [Auth] Token recibido para decodificación
🔵 [Auth] Decodificando JWT (payload)...
🔵 [Auth] JWT decodificado: {...}
⚠️ [Auth] Rol no encontrado en token
🔵 [Auth] Campos disponibles en payload: ['sub', 'email', 'iat', 'exp']
🔵 [Auth] getRouteByRole() llamado con rol: 
🔵 [Auth] Rol  no tiene ruta específica, redirigiendo a /welcome
```

## Mapeo de Roles a Rutas

| Rol | Ruta de Destino | Descripción |
|-----|----------------|-------------|
| `ADMIN` | `/dashboard` | Dashboard general |
| `STOREKEEPER` | `/inventory` | Gestión de inventario |
| `KITCHEN` | `/dashboard` | Dashboard general |
| `WAITER` | `/dashboard` | Dashboard general |
| `CASHIER` | `/dashboard` | Dashboard general |
| `DEFAULT` | `/welcome` | Página de bienvenida |

## Manejo de Errores

### Token sin Rol
- **Síntoma:** El token JWT no contiene el campo `role`
- **Acción:** Redirigir a `/welcome`
- **Log:** `⚠️ [Auth] Rol no encontrado en token`

### Usuario sin Rol en SessionStorage
- **Síntoma:** `getCurrentUser().roles` está vacío
- **Acción:** Redirigir a `/welcome`
- **Log:** `❌ [Auth] No se pudo determinar el rol del usuario`

### Error en Redirección
- **Síntoma:** `Router.navigate()` falla
- **Acción:** Log del error y continuar
- **Log:** `❌ [Auth] Error en redirección: {error}`

## Consideraciones Importantes

### NO se modificó:
- ✅ Lógica existente de login tradicional
- ✅ Lógica de refresh token
- ✅ Endpoints del backend
- ✅ Guards existentes
- ✅ Interceptors existentes

### Se mejoró:
- ✅ Centralización de lógica de redirección
- ✅ Logging detallado para debugging
- ✅ Soporte para múltiples formatos de rol en JWT
- ✅ Fallback a `/welcome` para roles desconocidos
- ✅ Extracción de rol desde JWT si no viene en response

## Testing Recomendado

### Casos de Prueba

1. **Login ADMIN**
   - Credenciales: admin@servly.com / password
   - Resultado esperado: Redirección a `/dashboard`

2. **Login KITCHEN**
   - Credenciales: kitchen@servly.com / password
   - Resultado esperado: Redirección a `/dashboard`

3. **Login STOREKEEPER**
   - Credenciales: storekeeper@servly.com / password
   - Resultado esperado: Redirección a `/inventory`

4. **Login Google OAuth2**
   - Usuario con rol KITCHEN
   - Resultado esperado: Redirección a `/dashboard`

5. **Token sin Rol**
   - Modificar token manualmente para quitar campo `role`
   - Resultado esperado: Redirección a `/welcome`

## Cómo Debuggear

1. Abrir DevTools → Console
2. Filtrar por `[Auth]` o `[Login]` o `[OAuth2Callback]`
3. Seguir la secuencia de logs
4. Verificar que el rol se detecta correctamente
5. Verificar que la ruta elegida es la esperada

## Posibles Extensiones Futuras

1. **Rutas específicas por rol:**
   - Agregar `/kitchen/dashboard` para KITCHEN
   - Agregar `/waiter/dashboard` para WAITER

2. **Configuración dinámica:**
   - Mover mapeo de roles a configuración
   - Permitir cambios sin recompilar

3. **Roles múltiples:**
   - Soporte para usuarios con múltiples roles
   - Redirigir al rol "principal" o más privilegiado
