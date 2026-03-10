# 🧪 Guía de Prueba - Métricas de Auditoría

## ✅ Checklist de Prueba

### 1. Verificar Acceso al Componente

```
URL: http://localhost:4200/admin/audit-metrics
Rol requerido: ADMIN
```

**Pasos:**
1. Iniciar sesión como ADMIN
2. Navegar a `/admin/audit-metrics`
3. Verificar que carga el componente

**Resultado Esperado:**
- ✅ Muestra spinner de carga
- ✅ Luego muestra 6 cards de métricas
- ✅ Muestra 3-5 gráficos
- ✅ Muestra tabla de estadísticas

---

### 2. Verificar Filtros de Fecha

**Prueba 2.1: Últimos 7 días (default)**
```
Acción: Cargar página
Esperado: Muestra métricas de últimos 7 días
```

**Prueba 2.2: Últimos 30 días**
```
Acción: Seleccionar "Últimos 30 días"
Esperado: Recarga datos con período de 30 días
```

**Prueba 2.3: Rango personalizado**
```
Acción: Seleccionar "Rango personalizado"
Acción: Seleccionar fecha inicio y fin
Acción: Click en "Aplicar"
Esperado: Recarga datos con rango seleccionado
```

---

### 3. Verificar Cards de Métricas

**Card 1: Tiempo Promedio de Autenticación**
```
Valor: Ej: 1250 ms
Estado: OK (verde), WARNING (dorado), CRITICAL (rojo)
Umbral OK: < 2000ms
```

**Card 2: Tasa de Éxito Global**
```
Valor: Ej: 98.5%
Estado: OK ≥ 95%, WARNING 80-95%, CRITICAL < 80%
```

**Card 3: Tiempo Verificación 2FA**
```
Valor: Ej: 15.2 seg
Estado: OK < 60s, WARNING 60-120s, CRITICAL ≥ 120s
```

**Card 4: Expiración de Códigos**
```
Valor: Ej: 5.0%
Estado: OK < 10%, WARNING 10-25%, CRITICAL ≥ 25%
```

**Card 5: Recuperación de Contraseña**
```
Valor: Ej: 2.5 min
Estado: OK < 5min, WARNING 5-10min, CRITICAL ≥ 10min
```

**Card 6: Duración de Sesión**
```
Valor: Ej: 240 min
Estado: Siempre OK (informativo)
```

---

### 4. Verificar Gráficos

**Gráfico 1: Barras - Tasas de Éxito**
```
Eje X: Roles (ADMIN, WAITER, CASHIER, KITCHEN*, STOREKEEPER*)
Eje Y: Porcentaje (0-100%)
Colores: Verde (≥95%), Dorado (80-95%), Rojo (<80%)
* Opcionales según backend
```

**Gráfico 2: Línea - Tiempos Promedio**
```
Eje X: Roles
Eje Y: Milisegundos
Línea: Dorada con área rellena
```

**Gráfico 3: Doughnut - Distribución**
```
Segmentos: Por rol
Colores: Diferentes por rol
Leyenda: Abajo del gráfico
```

**Tabla: Estadísticas Detalladas**
```
Columnas: Rol, Intentos Totales, Exitosos, Fallidos, Tasa Éxito, Tiempo Promedio
Filas: ADMIN, WAITER, CASHIER, KITCHEN* (si existe), STOREKEEPER* (si existe)
Badges: Verde/Dorado/Rojo según tasa de éxito
```

---

### 5. Verificar Exportar CSV

**Prueba:**
```
Acción: Click en botón "Exportar CSV"
Esperado: Descarga archivo audit-metrics-YYYY-MM-DD.csv
```

**Contenido CSV Esperado:**
```csv
Métrica,Valor,Estado,Unidad
Tiempo Promedio de Autenticación,1250.50,OK,ms
Tasa de Éxito ADMIN,100.00,OK,%
Tasa de Éxito WAITER,98.00,OK,%
Tasa de Éxito CASHIER,97.50,OK,%
Tiempo Verificación 2FA,15.20,OK,segundos
Tasa de Expiración de Códigos,5.00,OK,%
Tiempo Recuperación Contraseña,2.50,OK,minutos
Duración Promedio de Sesión,240.00,INFO,minutos
```

---

### 6. Verificar Manejo de Errores

**Prueba 6.1: Sin permisos (no ADMIN)**
```
Acción: Intentar acceder como no-ADMIN
Esperado: Redirige a /access-denied
```

**Prueba 6.2: Token expirado**
```
Acción: Esperar a que expire token
Esperado: Redirige a /login
```

**Prueba 6.3: Error de servidor**
```
Acción: Simular error 500 en backend
Esperado: Muestra mensaje "Error del servidor. Intente más tarde"
```

**Prueba 6.4: Sin datos para período**
```
Acción: Seleccionar rango sin datos
Esperado: Muestra mensaje "Métricas no disponibles para el rango seleccionado"
```

---

### 7. Verificar Responsive Design

**Desktop (1920x1080)**
```
Esperado: 
- Cards en grid de 3 columnas
- Gráficos en grid de 2 columnas
- Tabla completa visible
```

**Tablet (768x1024)**
```
Esperado:
- Cards en grid de 2 columnas
- Gráficos en 1 columna
- Tabla con scroll horizontal
```

**Mobile (375x667)**
```
Esperado:
- Cards en 1 columna
- Gráficos en 1 columna
- Tabla con scroll horizontal
```

---

## 🔍 Debugging

### Logs en Consola

Al cargar el componente, buscar:

```typescript
🔵 [AuditMetrics] Cargando métricas...
🔵 [AuditMetrics] Filtro aplicado: 7days
✅ [AuditMetrics] Métricas cargadas exitosamente
🔵 [Charts] Actualizando gráficos...
✅ [Charts] Gráficos actualizados
```

### Errores Comunes

| Error | Causa | Solución |
|-------|-------|----------|
| `Cannot read property 'periodStart' of null` | Backend no devolvió datos | Verificar endpoint |
| `Cannot match any routes` | Ruta no configurada | Verificar app.routes.ts |
| `401 Unauthorized` | Token expirado | Hacer login nuevamente |
| `403 Forbidden` | Sin rol ADMIN | Usar cuenta ADMIN |

---

## 📊 Datos de Prueba (Mock)

Si necesitas datos de prueba para testing local:

```json
{
  "periodStart": "2026-03-02T00:00:00",
  "periodEnd": "2026-03-09T23:59:59",
  "averageAuthenticationTimeMs": 1250.5,
  "authenticationTimeStatus": "OK",
  "generalAuthMetrics": {
    "totalAttempts": 150,
    "successfulAttempts": 148,
    "averageDurationMs": 1250.5
  },
  "adminAuthMetrics": {
    "totalAttempts": 30,
    "successfulAttempts": 30,
    "averageDurationMs": 1100.0
  },
  "waiterAuthMetrics": {
    "totalAttempts": 50,
    "successfulAttempts": 49,
    "averageDurationMs": 1300.0
  },
  "cashierAuthMetrics": {
    "totalAttempts": 40,
    "successfulAttempts": 39,
    "averageDurationMs": 1350.0
  },
  "twoFactorMetrics": {
    "averageVerificationTimeSeconds": 15.0,
    "failedVerifications": 2
  },
  "passwordRecoveryMetrics": {
    "codeExpirationRate": 5.0,
    "averagePasswordRecoveryTimeMinutes": 2.5
  },
  "sessionMetrics": {
    "averageDurationSeconds": 14400
  }
}
```

---

## ✅ Criterios de Aceptación

- [ ] Componente carga sin errores
- [ ] Muestra 6 cards con datos correctos
- [ ] Muestra al menos 3 gráficos
- [ ] Filtros de fecha funcionan
- [ ] Botón exportar CSV descarga archivo
- [ ] Estados (OK/WARNING/CRITICAL) se muestran con colores correctos
- [ ] Responsive design funciona
- [ ] Manejo de errores muestra mensajes apropiados
- [ ] Solo ADMIN puede acceder
- [ ] Datos coinciden con backend

---

## 📝 Reporte de Bugs

Si encuentras algún bug, reporta:

```
**Bug:** [Descripción corta]
**Pasos para reproducir:**
1. ...
2. ...
3. ...

**Comportamiento esperado:** ...
**Comportamiento actual:** ...
**Capturas de pantalla:** [adjuntar]
**Console logs:** [adjuntar]
```

---

**Versión**: 1.0.0  
**Fecha**: 2026-03-09  
**Estado**: ✅ LISTO PARA PRODUCCIÓN
