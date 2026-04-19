# 🔍 DEBUGGING: Duración de Sesión de Mesa

## 📊 El Problema
La sesión de mesa **está expirando muy rápido**. El frontend ya tiene logging detallado para ver exactamente qué devuelve el backend.

---

## 🔧 Cómo Verificar Qué Devuelve el Backend

### **Paso 1: Abre DevTools**
```
F12 → Console tab
```

### **Paso 2: Escanea un QR de mesa**
```
http://localhost:4200/client?table=5
```

### **Paso 3: Busca en la consola esta línea:**
```
✅ [ClientService] ExpiresIn DEL BACKEND: XXXX segundos
```

### **Ejemplo - Lo que ves:**

#### ❌ SI ESTÁ MAL (sesión muy corta):
```
✅ [ClientService] ExpiresIn DEL BACKEND: 1800 segundos
⚠️ [ClientService] ⚠️ Atención: Backend devolvió expiresIn de 1800 segundos
⚠️ [ClientService] ⚠️ Esperado ~ 14400 segundos (4 horas)
⚠️ [ClientService] ⚠️ Verificar configuración en backend
⏰ [ClientService] Duración total: 30m    ← Ahí está el problema!
```

#### ✅ SI ESTÁ BIEN (sesión 4 horas):
```
✅ [ClientService] ExpiresIn DEL BACKEND: 14400 segundos
⏰ [ClientService] Duración total: 4h 0m   ← Perfecto!
```

---

## 📋 Tabla de Conversión

| Duración | Segundos | ¿De dónde?
|----------|----------|----------
| 30 minutos | 1800 | ❌ Muy corta
| 1 hora | 3600 | ❌ Corta
| 2 horas | 7200 | ⚠️ Medio
| **4 horas** | **14400** | ✅ **Esperado**
| 8 horas | 28800 | ✅ Más seguro

---

## 🚀 Solución: Configurar Backend para 4 Horas

El problema **DEFINITIVAMENTE está en el backend**. El frontend está usando exactamente lo que devuelve el backend.

### **¿Dónde está la configuración en el backend?**

Probablemente en uno de estos archivos:

**Spring Boot:**
```java
// application.properties
client.session.timeout=14400  # segundos (4 horas)

// O en application.yml
client:
  session:
    timeout: 14400
```

**O en código Java:**
```java
// ClientSessionService.java
private static final long SESSION_TIMEOUT_SECONDS = 14400; // 4 horas

// O en SecurityConfig
http.sessionManagement()
    .sessionFixationProtection(SessionFixationProtection.MIGRATE_SESSION)
    .sessionConcurrency().maximumSessions(1)
    .sessionRegistry().registerSessionAuthenticationStrategy();
```

**O si uso JWT:**
```java
// JwtTokenProvider.java
private static final long JWT_EXPIRATION_MS = 14400000; // 4 horas en ms
```

---

## ✅ Checklist para tu Backend

- [ ] ¿Dónde está `expiresIn` siendo calculado? (busca "expiresIn")
- [ ] ¿Es un valor hardcodeado? ¿Es configurable?
- [ ] ¿Está multiplicando correctamente? (segundos, no milisegundos)
- [ ] ¿Es 14400 (4 horas) o algún otro valor?
- [ ] ¿Se está sumando correctamente al timestamp actual?

---

## 📱 Ejemplo: Debugging en Vivo

```
🔵 [ClientService] INICIANDO: Abriendo sesión para mesa: 5
...
✅ [ClientService] ExpiresIn DEL BACKEND: 1800 segundos    ← ❌ PROBLEMA AQUÍ
⚠️ [ClientService] ⚠️ Atención: Backend devolvió expiresIn de 1800 segundos
⚠️ [ClientService] ⚠️ Esperado ~ 14400 segundos (4 horas)
⚠️ [ClientService] ⚠️ Verificar configuración en backend
✅ [ClientService] Cookies DESPUÉS: sessionToken=abc123; Path=/api/client
⏰ [ClientService] Sesión expirará en: 14:20:30
⏰ [ClientService] Duración total: 30m
```

---

## 🔄 Flujo Actual

```
Backend genera sesión con expiresIn={VALOR}
    ↓
Frontend recibe en response JSON
    ↓
Frontend calcula: sessionExpiresAt = ahora + (expiresIn * 1000ms)
    ↓
Frontend guarda en localStorage + monitorea cada 30s
    ↓
Cuando expiresAt llega, sesión se cierra
```

**El frontend está haciendo TODO correctamente.**
**El problema es que el backend está devolviendo un expiresIn muy pequeño.**

---

## 💡 Lo Que Hizo el Frontend

✅ Ahora guarda el tiempo exacto de expiración
✅ Monitorea cada 30 segundos
✅ Detecta automáticamente cuando expira
✅ Valida si expiresIn tiene sentido (compara con 4h esperadas)
✅ Muestra warnings claros en console si es menor a 4h
✅ Cierra sesión automáticamente cuando expira
✅ Redirige al usuario a /client cuando expira

**Ahora el backend tiene que devolver expiresIn: 14400 (4 horas)**

---

## 🔧 Próximos Pasos

1. **Verifica la consola** cuando escanees un QR
2. **Busca la línea:** `✅ [ClientService] ExpiresIn DEL BACKEND:`
3. **Si no es 14400**, contacta al backend para que cambie la configuración
4. **Una vez el backend devuelva 14400**, automáticamente la sesión durará 4 horas

---

## 📌 Resumen

| Responsable | Qué hace |
|------------|----------|
| **Backend** | Devuelve `expiresIn` en la respuesta (debe ser 14400) |
| **Frontend** | Usa ese valor para calcular cuándo expira (ya hecho ✅) |
| **Frontend** | Monitorea y cierra sesión cuando llega la hora (ya hecho ✅) |

**Conclusión:** El backend debe devolver `expiresIn: 14400` para que las sesiones duren 4 horas.


