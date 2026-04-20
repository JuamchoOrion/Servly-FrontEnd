# 🚀 Guía de Pruebas - Menú del Cliente con Accesibilidad y Paginación

## ✅ Estado Actual

El menú del cliente ha sido completamente actualizado con:
- ✅ Sistema de paginación (9 items por página)
- ✅ Integración de módulo de accesibilidad
- ✅ Atributos ARIA para accesibilidad
- ✅ Responsive design
- ✅ Optimización de rendimiento

---

## 🧪 Pasos para Probar

### 1. **Limpiar y Compilar**
```bash
cd "C:\Users\ramir\Documents\7mo Semestre\Ing de software III\servlyFrontend"
npm run build
```

### 2. **Iniciar el Servidor de Desarrollo**
```bash
npm start
# o
ng serve
```

### 3. **Acceder al Menú del Cliente**
```
Navegador: http://localhost:4200/client/menu
```

---

## 📋 Pruebas Funcionales

### A. **Verificar que el Menú Carga**

✅ **Esperado:**
- Página carga sin errores
- Se ven los items del menú
- Máximo 9 items por página (grilla 3x3)
- Barra de paginación visible (si hay más de 9 items)

❌ **Si No Funciona:**
- Abrir DevTools (F12)
- Verificar pestana "Console" para errores en rojo
- Buscar mensajes como:
  - "Cannot read property 'settings$'"
  - "Unknown component 'app-accessibility-menu'"
  - "Cannot find name 'Math'"

---

### B. **Verificar Botón de Accesibilidad**

✅ **Esperado:**
- En la esquina superior derecha hay un botón flotante con logo de accesibilidad
- Hacer clic abre un panel
- Panel tiene opciones de:
  - Modo oscuro
  - Tamaño de fuente
  - Alto contraste
  - Reducción de movimiento

**Código para verificar en consola:**
```javascript
document.querySelector('app-accessibility-menu')
// Debe retornar un elemento, no null
```

---

### C. **Verificar Paginación**

✅ **Esperado:**
- Si hay más de 9 items, mostrar botones "Anterior" y "Siguiente"
- Mostrar información: "Página X de Y"
- Mostrar rango de items: "Mostrando 1-9 de 50"

**Pasos:**
1. Ir a menú
2. Esperar a que carguen los items
3. Si hay más de 9 items:
   - Verificar que aparece la sección de paginación
   - Hacer clic en "Siguiente"
   - Verificar que cambian los items
   - Número de página debe incrementar

**Código para verificar en consola:**
```javascript
// Ver cantidad de items en la página actual
document.querySelectorAll('.menu-item-card').length
// Debe ser <= 9

// Ver si está paginado
document.querySelector('.pagination-container')
// Debe ser visible si hay más de 9 items
```

---

### D. **Verificar Filtros con Paginación**

✅ **Esperado:**
- Hacer clic en una categoría
- Items se filtran
- Paginación se resetea a página 1
- Cantidad de páginas recalcula

**Pasos:**
1. Ir a menú
2. Hacer clic en una categoría
3. Verificar que:
   - Items cambian
   - Página vuelve a "Página 1 de X"
   - La cantidad de items en pantalla es correcta

---

### E. **Verificar Accesibilidad (ARIA)**

✅ **Esperado:**
- Atributos ARIA correctos en elementos
- Navegación con teclado funciona
- Lectores de pantalla leen bien

**Código para verificar en consola:**
```javascript
// Verificar que hay atributos ARIA
document.querySelector('.pagination-controls').getAttribute('role')
// Debe retornar: "navigation"

// Verificar botones deshabilitados
document.querySelector('.btn-pagination:disabled')
// Debe tener el atributo disabled

// Verificar página activa
document.querySelector('[aria-current="page"]')
// Debe haber un elemento con este atributo
```

**Verificar con teclado:**
- Tab: Navegar entre elementos
- Enter/Espacio: Activar botones
- Verificar que todos los botones son accesibles

---

### F. **Verificar Modo Oscuro**

✅ **Pasos:**
1. Ir a menú
2. Hacer clic en botón de accesibilidad (esquina superior derecha)
3. Activar "Modo oscuro"
4. Verificar que:
   - El menú cambia a colores oscuros
   - Es visible y legible
   - Se mantiene al recargar página

---

### G. **Verificar Cambio de Tamaño de Fuente**

✅ **Pasos:**
1. Ir a menú
2. Hacer clic en botón de accesibilidad
3. Cambiar tamaño de fuente a "Muy Grande (18px)"
4. Verificar que:
   - El texto del menú se agranda
   - Es legible
   - Se mantiene al recargar página

---

### H. **Verificar Responsive (Mobile)**

✅ **Pasos:**
1. Abrir DevTools (F12)
2. Activar "Device Toolbar" (Ctrl+Shift+M)
3. Cambiar a dispositivo móvil (ej: iPhone 12)
4. Verificar que:
   - Layout es responsive
   - Paginación es accesible en móvil
   - Botones son clickeables
   - Grid se adapta al ancho

---

## 🔍 Checklist de Verificación

### Funcionalidad
- [ ] Menú carga sin errores
- [ ] Items se muestran (máximo 9 por página)
- [ ] Paginación aparece si hay > 9 items
- [ ] Botones siguiente/anterior funcionan
- [ ] Números de página funcionan
- [ ] Filtros funcionan
- [ ] Carrito funciona
- [ ] Agregar al carrito funciona

### Accesibilidad
- [ ] Botón flotante de accesibilidad visible
- [ ] Menú de accesibilidad abre/cierra
- [ ] Modo oscuro funciona
- [ ] Cambio de fuente funciona
- [ ] Alto contraste funciona
- [ ] Reducción de movimiento funciona
- [ ] Atributos ARIA presentes
- [ ] Navegación con teclado funciona

### Estilos
- [ ] Colores correctos
- [ ] Botones están bien posicionados
- [ ] Paginación está bien diseñada
- [ ] Responsive en móvil
- [ ] Sin elementos rotos

### Rendimiento
- [ ] Página carga rápido
- [ ] No hay lag al cambiar página
- [ ] Smooth scroll funciona
- [ ] Cambios de accesibilidad son suave

---

## 📊 Información de Depuración

### Ver estado de paginación en consola:
```javascript
// Ejecutar en consola del navegador
angular.getAllAngularTestabilities()[0].whenStable().then(() => {
  const component = ng.probe(document.querySelector('app-client-menu')).componentInstance;
  console.log('Página actual:', component.currentPage);
  console.log('Total de páginas:', component.totalPages);
  console.log('Items por página:', component.itemsPerPage);
  console.log('Items paginados:', component.paginatedItems.length);
  console.log('Items filtrados totales:', component.filteredItems.length);
});
```

### Ver configuración de accesibilidad:
```javascript
angular.getAllAngularTestabilities()[0].whenStable().then(() => {
  const component = ng.probe(document.querySelector('app-client-menu')).componentInstance;
  console.log('Configuración de accesibilidad:', component.accessibilitySettings);
});
```

---

## 🐛 Problemas Comunes y Soluciones

### Problema: "Cannot read property 'settings$'"
**Causa:** `AccessibilityService` no está inyectado correctamente

**Solución:**
1. Verificar que `client-menu.component.ts` tiene:
```typescript
constructor(
  ...
  private accessibilityService: AccessibilityService
) {}
```
2. Verificar que está importado:
```typescript
import { AccessibilityService, type AccessibilitySettings } from '../../../../shared/services/accessibility.service';
```

---

### Problema: "Unknown component 'app-accessibility-menu'"
**Causa:** Componente no está importado

**Solución:**
1. Verificar en `client-menu.component.ts`:
```typescript
imports: [CommonModule, AccessibilityMenuComponent, ClientNavbarComponent, FooterComponent],
```
2. Verificar importación:
```typescript
import { AccessibilityMenuComponent } from '../../../../shared/components/accessibility-menu/accessibility-menu.component';
```

---

### Problema: No aparece paginación
**Causa:** Lógica de paginación no se ejecuta

**Solución:**
1. Verificar en consola:
```javascript
document.querySelector('.pagination-container')
```
2. Si retorna `null`, paginación no está visible
3. Debe haber:
   - `filteredItems.length > 9`
   - `totalPages > 1`

---

### Problema: Botones de paginación deshabilitados cuando no deben
**Causa:** Métodos `isFirstPage()` o `isLastPage()` devuelven valor incorrecto

**Solución:**
1. Verificar en consola:
```javascript
const comp = ng.probe(document.querySelector('app-client-menu')).componentInstance;
console.log('isFirstPage():', comp.isFirstPage());
console.log('isLastPage():', comp.isLastPage());
console.log('currentPage:', comp.currentPage);
```

---

## 📞 Información de Contacto

Si encuentra errores que no puede resolver:
1. Abrir DevTools (F12)
2. Copiar el error completo de la consola
3. Describir qué paso realizó
4. Verificar archivo: `MENU_CLIENT_FIXES.md`

---

**Última actualización:** 2026-04-19
**Versión:** 1.0
**Estado:** ✅ LISTO PARA PRUEBAS

