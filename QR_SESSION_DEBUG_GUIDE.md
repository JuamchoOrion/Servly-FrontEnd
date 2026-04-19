## 🔍 DIAGNÓSTICO: QR SESSION ERROR

### 📋 PROBLEMA REPORTADO
- ✅ Entrada manual en `/client` → **FUNCIONA**
- ❌ Escaneo QR (URL: `/client?table=X`) → **DA ERROR DE AUTENTICACIÓN**

---

## 🔎 ANÁLISIS REALIZADO

### ✅ Configuración Correcta:
1. **QrGeneratorService** (línea 66)
   - ✅ Genera URL correcta: `${baseUrl}/client?table=${tableNumber}`

2. **ClientWelcomeComponent** (línea 40-55)
   - ✅ Detecta parámetro `?table=X`
   - ✅ Valida número de mesa (1-999)
   - ✅ Llama a `openSessionAutomatically()`

3. **ClientService.openSession()** (línea 39-64)
   - ✅ GET a `/api/client/session?table=X`
   - ✅ Incluye `withCredentials: true`
   - ✅ Guarda sessionToken en localStorage

4. **AuthInterceptor** (línea 35, 45-48)
   - ✅ `/api/client/session` está excluido de necesidad de JWT
   - ✅ Siempre envía `withCredentials: true`

---

## 🎯 CAUSAS POSIBLES DEL ERROR

### **Causa 1: Error del Backend (Incorrecto)**
El endpoint `/api/client/session?table=X` podría estar:
- ❌ No retornando la cookie HTTP-Only
- ❌ Devolviendo error 401/403
- ❌ Fallo interno 500

### **Causa 2: Problema de CORS + Credenciales**
El navegador podría rechazar la respuesta porque:
- ❌ La cookie no tiene `SameSite=None; Secure`
- ❌ El backend no incluye `Access-Control-Allow-Credentials: true`
- ❌ El header `Access-Control-Allow-Origin` no es específico (no puede ser `*` con credenciales)

### **Causa 3: Cookie No Se Envía en Siguiente Petición**
Aunque la sesión se abre:
- ❌ La cookie no se adjunta automáticamente en GET `/api/client/orders`

---

## 🔧 SOLUCIÓN PASO A PASO

### **Paso 1: Verificar Error Real**
Abre la consola del navegador (F12) y:

```javascript
// En la consola, cuando intentes abrir sesión desde QR:
// 1. En la pestaña "Network", busca la petición GET a /api/client/session
// 2. Mira el estado: ¿200? ¿401? ¿403? ¿500?
// 3. En "Response", ¿recibes el sessionToken y tableNumber?
// 4. En "Cookies", ¿aparece una nueva cookie después de la respuesta?
```

### **Paso 2: Verificar Logs en Consola**
Los logs del ClientService te dirán:

```
🔵 [ClientService] Abriendo sesión para mesa: X
🔵 [ClientService] Cookies antes: (muestra cookies actuales)
✅ [ClientService] Sesión abierta: { sessionToken, tableNumber, ... }
✅ [ClientService] Cookies después: (muestra si hay cookie nueva)
```

### **Paso 3: Configurar Backend para Credenciales**
En el backend Spring se necesita:

```java
// En WebSecurityConfig o CorsConfig:
@Configuration
public class CorsConfig {
    @Bean
    public WebMvcConfigurer corsConfigurer() {
        return new WebMvcConfigurer() {
            @Override
            public void addCorsMappings(CorsRegistry registry) {
                registry
                    .addMapping("/api/**")
                    .allowedOrigins("http://localhost:4200")
                    .allowedMethods("GET", "POST", "PUT", "DELETE", "PATCH")
                    .allowCredentials(true)  // ✅ CRUCIAL
                    .allowedHeaders("*");
            }
        };
    }
}
```

### **Paso 4: Configurar Cookie en Backend**
La cookie debe incluir:

```java
// En el controlador de sesión:
HttpServletResponse response;

// Crear cookie:
Cookie sessionCookie = new Cookie("sessionToken", sessionToken);
sessionCookie.setHttpOnly(true);      // ✅ No accesible desde JavaScript
sessionCookie.setSecure(false);       // ❌ EN DESARROLLO (true en producción)
sessionCookie.setPath("/");           // Disponible en todo el sitio
sessionCookie.setMaxAge(3600);        // 1 hora
sessionCookie.setSameSite("Lax");     // ✅ Permite requests entre sitios

response.addCookie(sessionCookie);
```

---

## 🧪 DEBUGGING - VERIFICAR CADA PASO

### **Test 1: Verificar parámetro QR**
```bash
# En el navegador, ve a:
http://localhost:4200/client?table=5

# Deberías ver en console:
# 🔵 [ClientWelcomeComponent] QR detectado con mesa: 5
# 🔵 [ClientWelcomeComponent] Abriendo sesión automática para mesa: 5
```

### **Test 2: Verificar petición HTTP**
```bash
# F12 → Network → busca "session"
# Debería haber un GET a: http://localhost:4200/api/client/session?table=5
# (El proxy lo redirige a http://localhost:8081/api/client/session?table=5)
```

### **Test 3: Verificar respuesta**
En Network, click en la petición session:
```json
// Response esperado:
{
  "sessionToken": "abc123xyz...",
  "tableNumber": 5,
  "expiresIn": 3600,
  "message": "Session opened"
}
```

### **Test 4: Verificar cookies**
En Network → Cookies (o F12 → Application → Cookies):
```
Cookie esperado:
Name: sessionToken
Value: abc123xyz...
HttpOnly: ✅ Sí
Secure: ❌ No (en desarrollo)
SameSite: Lax
```

---

## ✅ CHECKLIST DE VERIFICACIÓN

- [ ] El error está en la petición GET (Network → status code)
- [ ] El error está en la respuesta (JSON con error)
- [ ] El backend devuelve la cookie correctamente
- [ ] El navegador rechaza la cookie por CORS
- [ ] La cookie se establece pero no se envía en siguientes peticiones
- [ ] El sessionToken se guarda en localStorage

---

## 🔗 FLUJO CORRECTO (Paso a Paso)

```
1. Cliente escanea QR
   └─ URL en QR: http://localhost:4200/client?table=5

2. Navegador abre esa URL
   └─ Angular navega a /client?table=5

3. ClientWelcomeComponent.ngOnInit()
   └─ Detecta queryParams['table'] = '5'
   └─ Llama a openSessionAutomatically(5)

4. ClientService.openSession(5)
   └─ GET /api/client/session?table=5
   └─ Con withCredentials: true
   └─ AuthInterceptor lo deja pasar (está en excludedUrls)

5. Backend responde
   └─ HTTP 200
   └─ JSON: { sessionToken, tableNumber, ... }
   └─ Set-Cookie: sessionToken=... (HttpOnly, Lax)

6. Frontend recibe respuesta
   └─ ClientService.tap() guarda en localStorage
   └─ sessionSubject.next(session)
   └─ Router.navigate(['/client/menu'])

7. ClientMenuComponent.ngOnInit()
   └─ Verifica session: OK ✅
   └─ Carga menú desde /api/menu/products (público)
```

---

## 🐛 POSIBLE CULPABLE

La mayoría de veces es uno de estos 3:

### **#1 (Más Probable): Backend no devuelve cookie**
```
Síntoma: Respuesta 200 pero sin Set-Cookie header
Solución: Ver configuración de CORS y Spring Security
```

### **#2 (Segundo más probable): CORS rechaza credenciales**
```
Síntoma: Error en console: "Cross-Origin Request Blocked"
Solución: Agregar allowCredentials(true) en CorsConfig
```

### **#3 (Menos probable): Cookie se rechaza por SameSite**
```
Síntoma: Cookie no aparece en Application → Cookies
Solución: Cambiar SameSite a "Lax" en backend
```

---

## 📞 SIGUIENTES PASOS

1. **Abre DevTools** (F12) mientras escaneas/accedes por QR
2. **Ve a Network tab** y busca la petición a `/api/client/session`
3. **Copia el JSON de error** que recibes
4. **Verifica CORS headers**:
   - ¿Hay `Set-Cookie` en Response Headers?
   - ¿Hay `Access-Control-Allow-Credentials: true`?
5. **Comparte el error exacto** para que pueda ayudarte más

---

## 📝 LOGS ESPERADOS (Console)

### **Si TODO funciona:**
```
🔵 [ClientWelcomeComponent] QR detectado con mesa: 5
🔵 [ClientWelcomeComponent] Abriendo sesión automática para mesa: 5
✅ [ClientService] Sesión abierta: {...}
✅ [ClientService] SessionToken recibido: abc123...
✅ [ClientWelcomeComponent] Sesión abierta automáticamente desde QR
```

### **Si FALLA en backend:**
```
🔵 [ClientWelcomeComponent] QR detectado con mesa: 5
🔵 [ClientWelcomeComponent] Abriendo sesión automática para mesa: 5
❌ [ClientService] Error abriendo sesión: { statusCode: 401, message: "..." }
❌ [ClientWelcomeComponent] Error abriendo sesión desde QR: { statusCode: 401 }
```

---

**¿Cuál es el error exacto que ves en Console?** Comparte el JSON del error para debugging.


