# Componente: Métricas de Auditoría (AuditMetricsComponent)

## Descripción

Componente Angular para visualizar métricas de autenticación y auditoría en el dashboard de administrador. Muestra información de forma visual, elegante e interactiva usando cards y gráficos.

## ✅ ESTADO: LISTO PARA PRODUCCIÓN

**Endpoints del backend:** ✅ FUNCIONANDO  
**DTOs actualizados:** ✅ COINCIDEN CON BACKEND  
**Componente:** ✅ IMPLEMENTADO  
**Ruta configurada:** ✅ AGREGADA  

## Ubicación

```
src/app/features/admin/pages/audit-metrics/
```

## Archivos

| Archivo | Descripción | Estado |
|---------|-------------|--------|
| `audit-metrics.dto.ts` | Interfaces de tipos de datos | ✅ Actualizado |
| `audit-metrics.service.ts` | Servicio para obtener datos | ✅ Actualizado |
| `audit-metrics.component.ts` | Lógica del componente | ✅ Implementado |
| `audit-metrics.component.html` | Template | ✅ Implementado |
| `audit-metrics.component.scss` | Estilos | ✅ Implementado |
| `app.routes.ts` | Ruta agregada | ✅ Configurado |

## 🚀 Integración con Backend

### Endpoints Disponibles

```
GET https://tu-backend-aws.com/api/admin/metrics/auth          → 7 días
GET https://tu-backend-aws.com/api/admin/metrics/auth/30days   → 30 días
GET https://tu-backend-aws.com/api/admin/metrics/auth/custom?start={fecha}&end={fecha}  → Custom
```

### Headers Requeridos

```
Authorization: Bearer {token_admin}
Content-Type: application/json
```

### Ejemplo de Llamada

```typescript
// En el componente
this.auditMetricsService.getAuthMetrics({ type: '7days' }).subscribe({
  next: (metrics) => {
    console.log('Métricas cargadas:', metrics);
  },
  error: (error) => {
    console.error('Error cargando métricas:', error);
  }
});
```

### Estructura de Respuesta

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
  "waiterAuthMetrics": { ... },
  "cashierAuthMetrics": { ... },
  "kitchenAuthMetrics": { ... },  // Opcional
  "storekeeperAuthMetrics": { ... },  // Opcional
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

### ✅ Cards de Métricas

6 cards que muestran:

1. **Tiempo Promedio de Autenticación**
   - Umbral: < 2s = OK, < 4s = WARNING, ≥ 4s = CRITICAL
   - Color: Verde / Dorado / Rojo

2. **Tasa de Éxito Global**
   - Umbral: ≥ 95% = OK, ≥ 80% = WARNING, < 80% = CRITICAL

3. **Tiempo Verificación 2FA**
   - Umbral: < 60s = OK, < 120s = WARNING, ≥ 120s = CRITICAL

4. **Expiración de Códigos**
   - Umbral: < 10% = OK, < 25% = WARNING, ≥ 25% = CRITICAL

5. **Recuperación de Contraseña**
   - Umbral: < 5 min = OK, < 10 min = WARNING, ≥ 10 min = CRITICAL

6. **Duración de Sesión**
   - Informativo (sin estado crítico)

### 📊 Gráficos Interactivos

1. **Barras - Tasas de Éxito por Rol**
   - Muestra porcentaje de éxito por cada rol
   - Colores según estado (verde/dorado/rojo)

2. **Línea - Tiempos Promedio por Rol**
   - Duración en milisegundos
   - Línea suave con área rellena dorada

3. **Doughnut - Distribución de Intentos**
   - Total de intentos por rol
   - Colores diferenciados por rol

4. **Tabla - Estadísticas Detalladas**
   - Intentos totales, exitosos, fallidos
   - Tasa de éxito y tiempo promedio

### 🎛️ Filtros de Fecha

- **Últimos 7 días** (default)
- **Últimos 30 días**
- **Rango personalizado** (date picker)

### 📥 Exportar a CSV

Botón que genera y descarga archivo CSV con todas las métricas.

## API del Backend

### Endpoints

```
GET /api/admin/metrics/auth          → Últimos 7 días
GET /api/admin/metrics/auth/30days   → Últimos 30 días
GET /api/admin/metrics/auth/custom?start={fecha}&end={fecha}  → Rango personalizado
```

### Headers Requeridos

```
Authorization: Bearer {token_admin}
```

### Respuesta JSON

```json
{
  "averageAuthenticationTimeMs": 1250.5,
  "authenticationTimeStatus": "OK",
  "adminAuthMetrics": {
    "totalAttempts": 30,
    "successfulAttempts": 30,
    "failedAttempts": 0,
    "averageDurationMs": 1100
  },
  "waiterAuthMetrics": { ... },
  "cashierAuthMetrics": { ... },
  "kitchenAuthMetrics": { ... },
  "storekeeperAuthMetrics": { ... },
  "twoFactorMetrics": {
    "averageVerificationTimeSeconds": 35.2,
    "totalVerifications": 10,
    "successfulVerifications": 10,
    "failedVerifications": 0
  },
  "passwordRecoveryMetrics": {
    "codeExpirationRate": 5.0,
    "averagePasswordRecoveryTimeMinutes": 2.5,
    "totalRecoveries": 5,
    "successfulRecoveries": 5
  },
  "sessionMetrics": {
    "averageDurationSeconds": 3600,
    "totalSessions": 100,
    "activeSessions": 45
  },
  "period": {
    "startDate": "2024-01-01",
    "endDate": "2024-01-07",
    "days": 7
  }
}
```

## Paleta de Colores

| Color | Hex | Uso |
|-------|-----|-----|
| Verde | `#4CAF50` | Estado OK, éxitos |
| Beige | `#F5F5DC` | Fondos |
| Dorado | `#D4AF37` | Estado WARNING, detalles |
| Verde Oscuro | `#2E7D32` | Gradientes, textos |
| Rojo | `#F44336` | Estado CRITICAL, errores |

## Estados y Colores

| Estado | Color | Significado |
|--------|-------|-------------|
| OK | Verde | Métrica dentro de rangos aceptables |
| WARNING | Dorado | Métrica requiere atención |
| CRITICAL | Rojo | Métrica fuera de rango, acción requerida |

## Umbrales de Métricas

### Tiempo de Autenticación
- **OK**: < 2000ms (2 segundos)
- **WARNING**: 2000-4000ms
- **CRITICAL**: ≥ 4000ms

### Tasa de Éxito
- **OK**: ≥ 95%
- **WARNING**: 80-95%
- **CRITICAL**: < 80%

### Tiempo 2FA
- **OK**: < 60 segundos
- **WARNING**: 60-120 segundos
- **CRITICAL**: ≥ 120 segundos

### Expiración de Códigos
- **OK**: < 10%
- **WARNING**: 10-25%
- **CRITICAL**: ≥ 25%

### Recuperación de Contraseña
- **OK**: < 5 minutos
- **WARNING**: 5-10 minutos
- **CRITICAL**: ≥ 10 minutos

## Dependencias

```json
{
  "ng2-charts": "^x.x.x",
  "chart.js": "^x.x.x"
}
```

## Uso en el Dashboard

### Agregar al Dashboard de Admin

```html
<!-- En dashboard-admin.component.html -->
<app-audit-metrics></app-audit-metrics>
```

### O como ruta independiente

```
/admin/audit-metrics
```

## Manejo de Errores

### Errores HTTP

| Status | Mensaje | Acción |
|--------|---------|--------|
| 401 | No autorizado | Redirigir a login |
| 403 | Sin permisos | Mostrar mensaje |
| 404 | Métricas no disponibles | Mostrar mensaje |
| 500 | Error del servidor | Reintentar más tarde |

### Estados del Componente

- **Loading**: Spinner mientras carga
- **Error**: Mensaje amigable con ícono
- **Success**: Muestra cards y gráficos

## Exportación CSV

El CSV generado incluye:

```csv
Métrica,Valor,Estado,Unidad
Tiempo Promedio de Autenticación,1250.50,OK,ms
Tasa de Éxito ADMIN,100.00,OK,%
Tasa de Éxito WAITER,98.00,OK,%
...
```

## Seguridad

- Solo usuarios con rol **ADMIN** pueden acceder
- Usa guard `roleGuard(['ADMIN'])`
- Token JWT requerido en cada petición
- Cookies HttpOnly para refresh token

## Performance

- Gráficos renderizados con Canvas (Chart.js)
- Lazy loading del componente
- ChangeDetection default (puede optimizarse a OnPush)
- Gráficos responsive con `maintainAspectRatio: false`

## Testing

### Comandos

```bash
# Test unitario del componente
ng test --include='**/audit-metrics.component.spec.ts'

# Test del servicio
ng test --include='**/audit-metrics.service.spec.ts'
```

## Posibles Mejoras Futuras

1. **Auto-refresh**: Actualizar métricas cada 5 minutos
2. **Comparación de períodos**: Mostrar delta vs período anterior
3. **Alertas**: Notificaciones cuando métrica cambia a CRITICAL
4. **Más gráficos**: Heatmap de intentos por hora/día
5. **Filtros avanzados**: Por rol, tipo de autenticación, etc.
6. **Dashboard personalizable**: Drag & drop de cards

## Ejemplo de Integración

```typescript
// En un módulo o componente padre
import { AuditMetricsComponent } from './features/admin/pages/audit-metrics/audit-metrics.component';

@Component({
  template: `
    <div class="admin-dashboard">
      <h1>Dashboard de Administrador</h1>
      <app-audit-metrics></app-audit-metrics>
    </div>
  `
})
export class AdminDashboardComponent {}
```

## Contacto y Soporte

Para reportar bugs o solicitar mejoras, contactar al equipo de desarrollo.

---

**Versión**: 1.0.0  
**Última actualización**: 2024-01-XX  
**Autor**: Equipo de Desarrollo Servly
