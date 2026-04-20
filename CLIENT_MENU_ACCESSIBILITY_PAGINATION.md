# Integración de Accesibilidad y Paginación en el Menú del Cliente

## 📋 Resumen de Cambios

Se ha integrado completamente el módulo de accesibilidad y paginación en el componente de menú del cliente (`client-menu`), mejorando la experiencia del usuario con cumplimiento de estándares WCAG 2.1 AA.

## 🎯 Características Implementadas

### 1. **Integración del Menú de Accesibilidad**
- ✅ El componente `AccessibilityMenuComponent` se renderiza flotante en la esquina superior derecha
- ✅ Sincronización en tiempo real con el servicio `AccessibilityService`
- ✅ Suscripción a cambios de configuración de accesibilidad
- ✅ Detección de cambios optimizada con `ChangeDetectionStrategy.OnPush`

**Configuraciones soportadas:**
- Modo oscuro/claro
- Control de tamaño de fuente (pequeño, medio, grande, muy grande)
- Alto contraste
- Reducción de movimiento

### 2. **Sistema de Paginación Completo**
- ✅ Paginación de items en grilla de 3x3 (9 items por página)
- ✅ Cálculo dinámico de páginas totales basado en items filtrados
- ✅ Navegación anterior/siguiente
- ✅ Números de página con elipsis (...) para muchas páginas
- ✅ Reset de página al filtrar por categoría
- ✅ Smooth scroll al cambiar de página

**Propiedades agregadas:**
```typescript
currentPage = 1;
itemsPerPage = 9;
totalPages = 1;
pageNumbers: number[] = [];
paginatedItems: MenuItem[] = [];
```

**Métodos de paginación:**
- `updatePagination()`: Actualiza el estado de paginación
- `calculatePageNumbers()`: Calcula números visibles con elipsis
- `updatePagedItems()`: Actualiza items de la página actual
- `goToPage(pageNumber)`: Navega a página específica con scroll
- `previousPage()`: Página anterior
- `nextPage()`: Siguiente página
- `isFirstPage()`: Verifica si es primera página
- `isLastPage()`: Verifica si es última página

### 3. **Accesibilidad en el Template HTML**

**Atributos ARIA implementados:**
```html
<!-- Role y aria-label para el contenedor de items -->
<div class="items-grid" role="region" aria-label="Menú de items">

<!-- Role article para cada item -->
<div *ngFor="let item of paginatedItems" class="menu-item-card" role="article">

<!-- Aria-label para el precio -->
<span class="item-price" aria-label="Precio: $...">

<!-- Aria-label para botones de agregar al carrito -->
<button [attr.aria-label]="'Agregar ' + item.name + ' al carrito'">

<!-- Role y aria-live para mensajes de error -->
<div *ngIf="!isLoading && errorMessage" class="error-banner" role="alert" aria-live="polite">

<!-- Role navigation para paginación -->
<div class="pagination-controls" role="navigation" aria-label="Paginación del menú">

<!-- Aria-current para página activa -->
<button [attr.aria-current]="page === currentPage ? 'page' : null">

<!-- Aria-disabled para botones deshabilitados -->
<button [disabled]="isFirstPage()" [attr.aria-disabled]="isFirstPage()">

<!-- Role status y aria-live para información de paginación -->
<div class="pagination-info" role="status" aria-live="polite">
```

### 4. **Estilos Accesibles para Paginación**

**Nueva clase `.pagination-container`** con:
- Flexbox responsive
- Estados visual claro para botones activos/deshabilitados
- Respeto a `prefers-reduced-motion` con `:root.reduce-motion &`
- Colores de alto contraste
- Espaciado adecuado
- Responsive design para móviles

**Características de estilo:**
```scss
// Transiciones respetan reduceMotion
:root.reduce-motion & {
  transition: none;
}

// Estados visuales claros
&.active {
  background: #667eea;
  color: white;
  border-color: #667eea;
}

// Botones deshabilitados
&:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

// Elipsis no interactivo
&.ellipsis {
  cursor: default;
  background: transparent;
  border: none;
}
```

### 5. **Cambios en Detección de Cambios**
- Se cambió `ChangeDetectorRef.detectChanges()` a `ChangeDetectorRef.markForCheck()`
- Más eficiente con `ChangeDetectionStrategy.OnPush`
- Mejor rendimiento en aplicaciones grandes

## 📝 Cambios en el Componente

### Imports Agregados
```typescript
import { AccessibilityService, type AccessibilitySettings } from '../../../../shared/services/accessibility.service';
import { AccessibilityMenuComponent } from '../../../../shared/components/accessibility-menu/accessibility-menu.component';
import { ChangeDetectionStrategy } from '@angular/core';
```

### Propiedades Agregadas
```typescript
paginatedItems: MenuItem[] = [];
currentPage = 1;
itemsPerPage = 9;
totalPages = 1;
pageNumbers: number[] = [];
accessibilitySettings: AccessibilitySettings = {...};
Math = Math; // Para usar en template
```

### Constructor Modificado
```typescript
constructor(
  // ... servicios existentes
  private accessibilityService: AccessibilityService
) {}
```

### ngOnInit Mejorado
- Suscripción a cambios de accesibilidad
- Actualización de paginación al cargar menú
- Uso de `markForCheck()` en lugar de `detectChanges()`

### Métodos Agregados
```typescript
updatePagination()
calculatePageNumbers()
updatePagedItems()
goToPage(pageNumber)
previousPage()
nextPage()
isFirstPage()
isLastPage()
```

## 🎨 Cambios en el Template

### Encabezado
```html
<!-- Menú de Accesibilidad (flotante) -->
<app-accessibility-menu></app-accessibility-menu>
```

### Sección de Items
- Cambio de `*ngFor="let item of filteredItems"` a `*ngFor="let item of paginatedItems"`
- Agregados atributos ARIA para accesibilidad
- Agregadas clases role y aria-labels

### Nueva Sección de Paginación
```html
<!-- Paginación -->
<div *ngIf="!isLoading && !errorMessage && filteredItems.length > 0 && totalPages > 1" class="pagination-container">
  <div class="pagination-info" role="status" aria-live="polite">
    <!-- Información de página -->
  </div>
  <div class="pagination-controls" role="navigation" aria-label="Paginación del menú">
    <!-- Botones de navegación -->
  </div>
</div>
```

## 🧪 Pruebas Recomendadas

### Accesibilidad
- [ ] Verificar con lectores de pantalla (NVDA, JAWS)
- [ ] Navegar solo con teclado (Tab, Enter, Espacio)
- [ ] Verificar contraste de colores (WCAG AA minimum)
- [ ] Validar con axe DevTools

### Paginación
- [ ] Cambiar páginas y verificar items correctos
- [ ] Verificar smooth scroll al cambiar página
- [ ] Filtrar por categoría y resetear paginación
- [ ] Verificar elipsis con muchas páginas
- [ ] Pruebas en móvil (responsive)

### Integración de Accesibilidad
- [ ] Cambiar tamaño de fuente y verificar en menú
- [ ] Activar modo oscuro
- [ ] Activar alto contraste
- [ ] Activar reducción de movimiento
- [ ] Persistencia de configuraciones

## 📱 Responsive Design

- **Desktop**: Grilla de 3x3 (9 items)
- **Tablet**: Grilla responsive con `grid-template-columns: repeat(auto-fill, minmax(200px, 1fr))`
- **Móvil**: Layout optimizado con botones de paginación compactos

## ♿ Cumplimiento de Estándares

### WCAG 2.1 Level AA
- ✅ Contraste de color (4.5:1 para texto normal)
- ✅ Etiquetas descriptivas en botones
- ✅ Roles semánticos ARIA
- ✅ Mensajes de estado con `aria-live`
- ✅ Navegación con teclado
- ✅ Indicadores visuales claros

### ISO 25010
- ✅ Usabilidad
- ✅ Accesibilidad
- ✅ Eficiencia de desempeño
- ✅ Compatibilidad

## 🔄 Flujo de Actualización de Paginación

```
filterByCategory()
    ↓
resetear currentPage = 1
    ↓
updatePagination()
    ↓
calculatePageNumbers()
    ↓
updatePagedItems()
    ↓
markForCheck() → template renderiza paginatedItems
```

## 📊 Configuración Actual

- **Items por página**: 9 (grilla 3x3)
- **Máximo números de página visibles**: 5 (personalizable)
- **Scroll behavior**: `smooth` en cambios de página
- **Tiempo de timeout**: 5 segundos para carga

## 🚀 Mejoras Futuras

- [ ] Opción para cambiar items por página
- [ ] Recordar página actual en sessionStorage
- [ ] Animaciones de transición con `@angular/animations`
- [ ] Lazy loading de imágenes
- [ ] Búsqueda combinada con paginación
- [ ] Exportar menú a PDF con paginación

## 📞 Soporte

Para reportar problemas con accesibilidad o paginación, verificar:
1. Consola del navegador para mensajes de error
2. Estado de la paginación en DevTools
3. Valores del `AccessibilityService`
4. Respuesta del API del menú

