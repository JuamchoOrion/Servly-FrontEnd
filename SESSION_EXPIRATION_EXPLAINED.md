# ⏰ EXPLICACIÓN: Cuándo Expiran las Sesiones de Mesa

## 📊 Resumen General

| Parámetro | Valor | Fuente |
|-----------|-------|--------|
| **Duración** | Depende del `expiresAt` del backend | GET `/api/client/session?table=X` |
| **Cómo se envía** | Campo `expiresAt` en ISO string | Response del backend |
| **Monitoreo** | Cada 30 segundos | Frontend |
| **Cuando expira** | El guard redirige a `/client` | ClientSessionGuard |

---

## 🔍 Cómo Funciona Actualmente

### **1️⃣ Cliente Escanea QR**

```
URL: http://localhost:4200/client?table=10
    ↓
GET /api/client/session?table=10
    ↓
Backend responde con:
{
  "sessionToken": "eyJ...",
  "tableNumber": 10,
  "sessionId": "2edf92fb-2e4b-4d30-9f41-370405cd8815",
  "expiresAt": "2026-04-19T16:00:23.4652501",  ← AQUÍ está el tiempo de expiración
  "tokenType": "Bearer"
}
```

### **2️⃣ Frontend Calcula la Expiración**

```typescript
// ClientService.openSession()
if (session.expiresAt) {
  const expiresDate = new Date(session.expiresAt);  // Parsea ISO string
  expiresAtMs = expiresDate.getTime();              // Convierte a timestamp
  this.sessionExpiresAt = expiresAtMs;              // Guarda en variable
  
  console.log('Sesión expirará en:', expiresDate.toLocaleTimeString());
  // Ejemplo: "Sesión expirará en: 16:00:23"
}
```

### **3️⃣ Frontend Monitorea Cada 30 Segundos**

```typescript
// ClientService.startSessionMonitoring()
setInterval(() => {
  if (this.getCurrentSession() && this.isSessionExpired()) {
    console.log('⏰ Sesión expirada, cerrando sesión');
    this.closeSession();  // Limpia localStorage
  }
}, 30000); // Cada 30 segundos (30000ms)
```

### **4️⃣ Si el Usuario Navega a /client/menu o /client/orders**

```typescript
// ClientSessionGuard ejecuta:
const remainingSeconds = this.clientService.getSessionTimeRemaining();

if (remainingSeconds <= 0) {
  console.log('⏰ Sesión expirada');
  this.clientService.closeSession();
  this.router.navigate(['/client']);  // ← Redirige a entrada
  return false;
}
```

---

## 📋 Ejemplo Práctico

### **Escenario: Cliente escanea a las 15:00:00**

```
15:00:00 - Cliente escanea QR
          GET /api/client/session?table=5
          Backend responde: expiresAt = "2026-04-19T16:00:23"
          Frontend guarda: sessionExpiresAt = 16:00:23 (en timestamp)
          
15:00:30 - Monitor verifica cada 30s
           ¿16:00:23 > ahora? SÍ → Sesión válida ✓
           
15:30:00 - Usuario todavía en menú, monitor sigue verificando
           ¿16:00:23 > ahora? SÍ → Sesión válida ✓
           
16:00:23 - Monitor verifica
           ¿16:00:23 > ahora? NO → Sesión EXPIRADA ❌
           closeSession() ejecutado
           localStorage limpiado
           
16:00:25 - Si el usuario intenta hacer algo:
           ClientSessionGuard revisa
           ¿Hay sesión? NO → Redirige a /client
           
16:00:30 - Usuario ve pantalla de "Bienvenido a Servly"
           Debe escanear QR de nuevo
```

---

## 🕐 ¿Cuánto Duran las Sesiones?

**Depende completamente del BACKEND.**

El backend decide en `expiresAt` cuándo expirará la sesión. 

### **Lo que ves en Console:**

```
✅ [ClientService] ExpiresAt (ISO): 2026-04-19T16:00:23.4652501
⏰ [ClientService] Sesión expirará en: 16:00:23
```

**Ejemplo 1: Sesión de 1 hora**
```
Backend envía: expiresAt = "ahora + 3600 segundos"
Frontend muestra: Sesión expirará en: XX:XX:XX (1 hora después)
```

**Ejemplo 2: Sesión de 4 horas**
```
Backend envía: expiresAt = "ahora + 14400 segundos"
Frontend muestra: Sesión expirará en: XX:XX:XX (4 horas después)
```

---

## 🔄 Flujo Completo de Validación

```
┌──────────────────────────────────────────────────────────┐
│ 1. Cliente escanea QR @ /client?table=5                  │
├──────────────────────────────────────────────────────────┤
│ 2. GET /api/client/session?table=5                       │
│    Response: { expiresAt: "2026-04-19T16:00:23" }       │
├──────────────────────────────────────────────────────────┤
│ 3. Frontend parsea expiresAt → calcula timestamp         │
│    sessionExpiresAt = 1713600023000 (milisegundos)      │
├──────────────────────────────────────────────────────────┤
│ 4. startSessionMonitoring() corre cada 30s               │
│    while (sessionExpiresAt > Date.now()) {               │
│      // Sesión aún válida                                │
│    }                                                      │
│    // Cuando expiresAt <= ahora → closeSession()         │
├──────────────────────────────────────────────────────────┤
│ 5. Guard en cada navegación verifica:                    │
│    if (getSessionTimeRemaining() <= 0) {                 │
│      redirige a /client                                  │
│    }                                                      │
├──────────────────────────────────────────────────────────┤
│ 6. Usuario debe escanear QR de nuevo                     │
└──────────────────────────────────────────────────────────┘
```

---

## ✅ Puntos Clave

1. **El backend decide la duración** via `expiresAt`
   - Si backend dice expiresAt = "16:00:23", sesión dura hasta esa hora
   - Frontend solo LEE y RESPETA ese valor

2. **El frontend monitorea automáticamente**
   - Cada 30 segundos verifica si ya pasó la hora
   - Cuando llega la hora, limpia localStorage automáticamente

3. **El guard protege antes de navegar**
   - Si intentas acceder a `/client/menu` después de expirar
   - El guard detecta "sin sesión" y redirige a `/client`

4. **El usuario NO ve errores**
   - Todo sucede en background (monitor cada 30s)
   - Si no intenta hacer nada, no lo afecta
   - Si intenta navegar, guard lo redirige suavemente

---

## 🛠️ Si Necesitas Cambiar la Duración

**Solo el BACKEND puede cambiarla.**

Busca en backend:
- Variables: `CLIENT_SESSION_TIMEOUT`, `EXPIRES_IN`, etc.
- Archivos: `application.properties`, `application.yml`, `ClientSessionService.java`

**Cambio desde 1 hora → 4 horas:**
```java
// Antes:
private static final long SESSION_TIMEOUT_SECONDS = 3600; // 1 hora

// Después:
private static final long SESSION_TIMEOUT_SECONDS = 14400; // 4 horas
```

Luego backend calcula:
```java
LocalDateTime expiresAt = LocalDateTime.now().plusSeconds(14400);
response.setExpiresAt(expiresAt.toString());
```

Y el frontend automáticamente lo respeta. ✅

---

## 📦 Resumen en una Frase

**El backend decide cuándo expira (expiresAt), el frontend lo monitorea (cada 30s), y el guard lo protege (antes de navegar).**


