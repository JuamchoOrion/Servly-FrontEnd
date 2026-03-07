# Configuración de Google OAuth - Servly

## Problema Actual
El error `403: The given client ID is not found` significa que necesitas configurar tu propio CLIENT_ID de Google.

## Pasos para Obtener tu CLIENT_ID de Google

### 1. Ir a Google Cloud Console
- Ve a: https://console.cloud.google.com/

### 2. Crear un Proyecto (si no tienes uno)
- Click en el selector de proyectos (arriba a la izquierda)
- Click en "NUEVO PROYECTO"
- Nombre: `Servly`
- Click en "CREAR"

### 3. Habilitar Google+ API
- En el buscador, busca "Google+ API"
- Haz click en "Google+ API"
- Click en "HABILITAR"

### 4. Crear Credenciales OAuth
- Ve a "Credenciales" en el menú izquierdo
- Click en "CREAR CREDENCIALES"
- Selecciona "ID de cliente OAuth"
- Si te pide, configura la pantalla de consentimiento primero:
  - Click en "Pantalla de consentimiento OAuth"
  - Selecciona "Externo"
  - Llena los datos básicos
  - Guarda

### 5. Crear ID de Cliente
- Selecciona "Aplicación web"
- Nombre: `Servly Frontend`
- En "Orígenes autorizados de JavaScript", agrega:
  ```
  http://localhost:4200
  http://localhost:3000
  https://tu-dominio.com (cuando despliegues)
  ```
- En "URI de redirección autorizados":
  ```
  http://localhost:4200/login
  https://tu-dominio.com/login (cuando despliegues)
  ```
- Click en "CREAR"

### 6. Copiar tu CLIENT_ID
- Copia el **Client ID** (es un string largo que termina en `.apps.googleusercontent.com`)

### 7. Pegar en tu Aplicación
- Abre: `src/enviroments/enviroment.ts`
- Reemplaza esto:
  ```typescript
  google: {
    clientId: 'TU_CLIENT_ID_AQUI.apps.googleusercontent.com',
    ...
  }
  ```
- Por tu CLIENT_ID real:
  ```typescript
  google: {
    clientId: '123456789.apps.googleusercontent.com',  // Tu CLIENT_ID
    ...
  }
  ```

### 8. Reinicia el Servidor
```bash
ng serve
```

### 9. Prueba
- Ve a http://localhost:4200
- El botón "Continuar con Google" debería funcionar

---

## Estructura de la Autenticación

```
Usuario clicks en "Continuar con Google"
                    ↓
Google popup abre (Google Identity Services)
                    ↓
Usuario selecciona cuenta
                    ↓
Google devuelve: credential (JWT)
                    ↓
Tu Frontend: loginWithGoogle(tokenId)
                    ↓
POST http://localhost:8081/api/auth/google
Request: { tokenId: "eyJ..." }
                    ↓
Backend valida con Google
                    ↓
Backend devuelve: { token, refreshToken, email, name, roles }
                    ↓
Frontend guarda en sessionStorage
                    ↓
Redirige a /dashboard
```

---

## Archivos Modificados

1. **src/enviroments/enviroment.ts**
   - Agregué `google.clientId` configurable

2. **src/app/features/auth/pages/login/login.ts**
   - Método `loginWithGoogle()` ahora usa `environment.google.clientId`
   - Valida que el CLIENT_ID esté configurado

3. **src/app/core/services/auth.service.ts**
   - Método `loginWithGoogle(tokenId)` envía a `/api/auth/google`
   - Guarda tokens y usuario en sessionStorage

4. **src/index.html**
   - Script de Google Identity Services cargado

---

## Endpoint Backend Esperado

```
POST http://localhost:8081/api/auth/google

Request Body:
{
  "tokenId": "eyJhbGciOiJSUzI1NiIsImtpZCI6IjExIn0.eyJpc3M..."
}

Success Response (200):
{
  "token": "JWT_24h_access_token",
  "refreshToken": "JWT_7days_refresh_token",
  "email": "usuario@gmail.com",
  "name": "Usuario Nombre",
  "roles": ["USER", "STAFF"],
  "mustChangePassword": false
}

Error Response (401):
{
  "message": "Token de Google inválido"
}
```

---

## Seguridad

⚠️ **IMPORTANTE:**
- El CLIENT_ID es público, está bien que lo veas en el navegador
- El CLIENT_SECRET NUNCA debe ir en el frontend (va en el backend)
- El backend debe validar el token con Google antes de crear una sesión

---

¿Necesitas ayuda? Contacta con tu equipo de backend para confirmar que el endpoint `/api/auth/google` está implementado.

