# 📋 Módulo de Generación de QR para Mesas

## 🎯 Descripción General

Módulo de Angular standalone que permite generar, descargar e imprimir códigos QR para mesas de restaurante. Completamente integrado en la arquitectura del proyecto con soporte total para:

- ✅ Generación individual de QR
- ✅ Generación en lote (rango de mesas)
- ✅ Descarga como PNG
- ✅ Impresión directa desde el navegador
- ✅ Validaciones reactivas
- ✅ i18n multiidioma (ES/EN/PT)
- ✅ Accesibilidad (WCAG 2.1 AA)
- ✅ Dark mode y módulo de accesibilidad

---

## 📁 Estructura de Archivos

```
src/app/
├── core/
│   └── services/
│       └── qr-generator.service.ts        # Servicio de generación QR
├── features/
│   └── qr/                                # Feature module
│       ├── qr.component.ts                # Componente contenedor
│       ├── qr.routes.ts                   # Rutas lazy-loaded
│       └── pages/
│           ├── qr-single/                 # Generación individual
│           │   ├── qr-single.component.ts
│           │   ├── qr-single.component.html
│           │   └── qr-single.component.scss
│           └── qr-batch/                  # Generación en lote
│               ├── qr-batch.component.ts
│               ├── qr-batch.component.html
│               └── qr-batch.component.scss
└── app.routes.ts                          # Ruta principal actualizada
```

---

## 🔧 Servicio QrGeneratorService

**Ubicación:** `src/app/core/services/qr-generator.service.ts`

### Métodos Principales

#### `generateQR(tableNumber, options?): Promise<GeneratedQR>`
Genera un QR individual para una mesa.

```typescript
try {
  const qr = await qrService.generateQR(5);
  console.log(qr.dataUrl);  // Data URL base64
  console.log(qr.url);      // URL completa con parámetro
  console.log(qr.filename); // mesa_5.png
} catch (error) {
  console.error('Error:', error.message);
}
```

**Parámetros:**
- `tableNumber` (number): 1-999
- `options` (optional): Configuración de generación

#### `generateQRBatch(startTable, endTable, options?): Promise<GeneratedQR[]>`
Genera múltiples QRs en lote.

```typescript
const qrs = await qrService.generateQRBatch(1, 10);
// Array de 10 QRs para mesas 1-10
```

#### `downloadQR(qr): void`
Descarga un QR como PNG.

#### `downloadQRBatch(qrs): Promise<void>`
Descarga múltiples QRs con pequeñas pausas.

#### `printQR(qr): void`
Abre ventana de impresión para un QR individual.

#### `printQRBatch(qrs): void`
Abre ventana de impresión con todos los QRs (una página por QR).

---

## 🎨 Componentes

### QrSingleComponent
**Ruta:** `/qr/single`

Interfaz para generar un QR individual.

**Features:**
- Input validado para número de mesa (1-999)
- Visualización del QR generado
- Botones: Descargar, Imprimir, Limpiar
- Mensajes de error y éxito
- Validaciones con mensajes específicos

### QrBatchComponent
**Ruta:** `/qr/batch`

Interfaz para generar múltiples QRs.

**Features:**
- Inputs para mesa inicial y final
- Información de cantidad de mesas
- Galería de QRs generados (grid responsivo)
- Acciones en lote: Descargar todos, Imprimir todos
- Acciones individuales por QR

---

## 🌐 Integración en Dashboard

Se agregó una nueva acción rápida en el dashboard para administradores:

```html
<a routerLink="/qr/single" class="quick-action" *ngIf="isAdmin">
  <span class="material-icons action-icon">qr_code_2</span>
  <div class="action-text">{{ i18n.translate('dashboard.actions.generateQR') }}</div>
</a>
```

---

## 🛡️ Seguridad y Acceso

- **Guard:** `roleGuard(['ADMIN'])` - Solo administradores pueden acceder
- **Auth:** Requiere autenticación general del sistema (`authGuard`)
- **URL Base:** Se obtiene dinámicamente desde `window.location.origin`
  - Desarrollo: `http://localhost:4200`
  - Producción: URL real del servidor

---

## 📱 Responsividad

### Breakpoints
- **Desktop:** Layouts complejos, galería de 4+ columnas
- **Tablet:** Layout adaptado, galería de 3 columnas
- **Mobile:** Formularios stacked, galería de 1-2 columnas

### Accesibilidad
- Soporte para font-small, font-medium, font-large, font-extra-large
- Dark mode completamente integrado
- Alto contraste compatible
- Reducción de movimiento respetada
- ARIA labels y descripciones

---

## 🌍 Traducciones (i18n)

### Claves Español (ES)

```typescript
// Single
'qr.single.title'
'qr.single.subtitle'
'qr.single.tableNumber'
'qr.single.tableNumberHint'
'qr.single.generate'
'qr.single.generating'
'qr.single.result'
'qr.single.tableLabel'
'qr.single.url'
'qr.single.download'
'qr.single.downloadTooltip'
'qr.single.print'
'qr.single.printTooltip'
'qr.single.clear'
'qr.single.empty'

// Batch
'qr.batch.title'
'qr.batch.subtitle'
'qr.batch.startTable'
'qr.batch.endTable'
'qr.batch.generate'
'qr.batch.generating'
'qr.batch.result'
'qr.batch.resultSubtitle'
'qr.batch.tableLabel'
'qr.batch.downloadAll'
'qr.batch.downloadAllTooltip'
'qr.batch.printAll'
'qr.batch.printAllTooltip'
'qr.batch.downloadTooltip'
'qr.batch.printTooltip'
'qr.batch.clear'
'qr.batch.empty'
'qr.batch.info.tableCount'

// Validations
'qr.validation.tableNumberRequired'
'qr.validation.tableNumberRange'
'qr.validation.tableNumberPattern'
'qr.batch.validation.startRequired'
'qr.batch.validation.endRequired'
'qr.batch.validation.tableNumberRange'

// Errors
'qr.errors.invalidForm'
'qr.errors.generationFailed'
'qr.errors.downloadFailed'
'qr.errors.printFailed'
'qr.batch.errors.invalidRange'
'qr.batch.errors.tooMany'
'qr.batch.errors.generationFailed'
'qr.batch.errors.downloadFailed'
'qr.batch.errors.printFailed'

// Success
'qr.success.generated'
'qr.success.downloaded'
'qr.success.printStarted'
'qr.batch.success.generated'
'qr.batch.success.downloadsStarted'
'qr.batch.success.printStarted'

// Dashboard
'dashboard.actions.generateQR'
```

---

## 🔌 Dependencias

### Instaladas
```json
"qrcode": "^latest"
```

### Incluidas (Angular)
- `@angular/core`
- `@angular/common`
- `@angular/forms`
- `@angular/router`
- `rxjs`

---

## 📊 Formato de Datos

### GeneratedQR
```typescript
interface GeneratedQR {
  tableNumber: number;        // Mesa 1-999
  url: string;                // URL completa con parámetro
  dataUrl: string;            // Data URL base64 PNG
  filename: string;           // Nombre para descarga (mesa_N.png)
}
```

### QRGenerationOptions
```typescript
interface QRGenerationOptions {
  width?: number;             // default: 300px
  margin?: number;            // default: 2px
  color?: {
    dark?: string;            // default: #000000
    light?: string;           // default: #FFFFFF
  };
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';  // default: H
}
```

---

## 🚀 Uso

### Generación Individual
```
1. Navega a /qr/single (o Dashboard → Generar QRs)
2. Ingresa número de mesa (1-999)
3. Haz clic en "Generar QR"
4. Descarga o imprime según sea necesario
```

### Generación en Lote
```
1. Navega a /qr/batch
2. Ingresa mesa inicial y final
3. Haz clic en "Generar Lote"
4. Ve la galería de QRs
5. Descarga/imprime todos o individualmente
```

---

## ⚙️ Configuración

### Entorno
El servicio usa automáticamente:
```typescript
// Desarrollo
BASE_URL = 'http://localhost:4200'

// Producción
BASE_URL = window.location.origin
```

### URL QR
```
{BASE_URL}/table?number={tableNumber}

Ejemplo:
http://localhost:4200/table?number=5
```

---

## 🐛 Validaciones

### Número de Mesa
- ✅ Obligatorio
- ✅ Número entero
- ✅ Rango: 1-999
- ✅ Sin decimales

### Rango de Lote
- ✅ Ambos obligatorios
- ✅ Números enteros
- ✅ Rango: 1-999
- ✅ Mesa inicial ≤ Mesa final
- ✅ Máximo 100 QRs por lote

---

## 🎯 Siguientes Pasos

Para completar la integración:

1. **Backend:** Crear endpoint `/table?number={N}` que muestre la página de mesa
2. **Scanning:** Agregar QR scanner en el punto de venta
3. **Analytics:** Registrar consultas de QR en auditoría
4. **Impresoras:** Integrar con sistemas de etiquetado

---

## 📝 Notas de Desarrollo

- El servicio está providedIn 'root' (singleton)
- Componentes son standalone y lazy-loaded
- Usa ChangeDetectionStrategy.OnPush para optimización
- Cierre de suscripciones con `takeUntil` y Subject
- Tipado estricto en toda la capa TypeScript
- Sin dependencias externas excepto qrcode

---

## ✅ Checklist de Implementación

- [x] Servicio QrGeneratorService en core/services
- [x] Componente QrSingleComponent con validaciones
- [x] Componente QrBatchComponent con galería
- [x] Rutas lazy-loaded en features/qr
- [x] Integración en app.routes.ts
- [x] Traducciones i18n (español)
- [x] Estilos SCSS con dark mode y accesibilidad
- [x] Acción en Dashboard
- [x] Guard roleGuard(['ADMIN'])
- [x] Documentación completa

---

**Versión:** 1.0.0  
**Último actualizado:** 2026-04-11  
**Autor:** Architecture Senior Developer

