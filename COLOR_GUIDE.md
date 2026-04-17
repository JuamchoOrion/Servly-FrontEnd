# 🎨 Guía de Colores y Estilos - Servly

## Paleta de Colores Oficial

La aplicación Servly utiliza una paleta de colores consistente basada en tonos dorados/naranjas que reflejan warmth y profesionalismo.

### Colores Principales

| Variable | Color | Código | Uso |
|----------|-------|--------|-----|
| `$primary-black` | Negro Oscuro | `#1E1E1E` | Texto principal, encabezados |
| `$accent-gold` | Dorado | `#C8A951` | Headers, botones principales, acentos |
| `$gold-dark` | Dorado Oscuro | `#B8941D` | Gradientes, hover states |
| `$light-bg` | Gris Claro | `#F5F5F5` | Fondo general de páginas |
| `$white` | Blanco | `#FFFFFF` | Tarjetas, modales, contenedores |

### Colores Semánticos

| Variable | Color | Código | Uso |
|----------|-------|--------|-----|
| `$success-green` | Verde | `#2E7D32` | Estados exitosos, activos |
| `$warning-orange` | Naranja | `#F57C00` | Advertencias, atención |
| `$error-red` | Rojo | `#C62828` | Errores, peligro |
| `$info-blue` | Azul | `#1976D2` | Información general |

### Colores de Texto

| Variable | Color | Código | Uso |
|----------|-------|--------|-----|
| `$text-dark` | Gris Oscuro | `#2C2C2C` | Texto principal |
| `$text-light` | Gris Medio | `#666666` | Subtítulos, descripción |
| `$text-muted` | Gris Claro | `#999999` | Texto deshabilitado, placeholder |

### Colores de Bordes

| Variable | Color | Código | Uso |
|----------|-------|--------|-----|
| `$border-light` | Gris muy Claro | `#EFEFEF` | Divisores, bordes suaves |

---

## Componentes y Sus Colores

### Headers/Navbar
- **Gradiente**: Dorado a Dorado Oscuro
- **Texto**: Negro Oscuro (#1E1E1E)
- **Sombra**: Dorado con 20% opacidad

### Botones Primarios
- **Fondo**: `$accent-gold`
- **Texto**: `$primary-black`
- **Hover**: Dorado más oscuro con sombra

### Botones Secundarios
- **Fondo**: `$light-bg`
- **Texto**: `$primary-black`
- **Borde**: `$border-light`

### Tarjetas/Cards
- **Fondo**: `$white`
- **Borde**: `$border-light`
- **Sombra**: `0 2px 8px rgba(0, 0, 0, 0.1)`

### Alerts/Alertas
- **Error**: Fondo rojo claro + borde rojo
- **Éxito**: Fondo verde claro + borde verde
- **Advertencia**: Fondo naranja claro + borde naranja
- **Información**: Fondo azul claro + borde azul

---

## Uso en SCSS

### Importar Variables Globales

```scss
// Al inicio de cualquier archivo SCSS
@import '~@app/core/styles/variables.scss';

.mi-componente {
  background: $white;
  color: $text-dark;
  border: 1px solid $border-light;
  box-shadow: $shadow-md;
  
  &:hover {
    box-shadow: $shadow-lg;
  }
}
```

### Colores Rápidos

```scss
// Encabezado con gradiente
.header {
  background: $gradient-header;
  color: $primary-black;
}

// Botón principal
.btn-primary {
  background: $accent-gold;
  color: $primary-black;
  
  &:hover {
    background: $gold-dark;
  }
}

// Error
.error-text {
  color: $error-red;
  background: rgba($error-red, 0.1);
}
```

---

## Transiciones y Animaciones

### Variables Disponibles

```scss
$transition-fast: all 0.15s ease-in-out;   // Interacciones rápidas
$transition-base: all 0.3s ease-in-out;    // Cambios normales
$transition-slow: all 0.5s ease-in-out;    // Animaciones lentas
```

### Ejemplo

```scss
.elemento {
  transition: $transition-base;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: $shadow-lg;
  }
}
```

---

## Espaciado Consistente

### Variables de Espaciado

```scss
$space-xs: 4px;      // Mínimo
$space-sm: 8px;      // Pequeño
$space-md: 16px;     // Medio (más común)
$space-lg: 24px;     // Grande
$space-xl: 32px;     // Muy grande
$space-2xl: 48px;    // Enorme
```

---

## Border Radius

```scss
$radius-sm: 4px;     // Esquinas suaves
$radius-md: 8px;     // Recomendado para componentes
$radius-lg: 12px;    // Tarjetas grandes
$radius-xl: 16px;    // Modales y contenedores grandes
```

---

## Z-Index

```scss
$z-dropdown: 100;        // Dropdowns
$z-navbar: 100;          // Navbar
$z-modal: 1000;          // Modales
$z-tooltip: 1100;        // Tooltips
$z-accessibility: 999999; // Menú de accesibilidad
```

---

## Dark Mode (Futuro)

Para componentes que soportan dark mode:

```scss
:root.dark-mode {
  --text-primary: #ffffff;
  --text-secondary: #b0b0b0;
  
  .componente {
    background-color: #1e1e1e;
    color: var(--text-primary);
  }
}
```

---

## Reglas de Consistencia

✅ **HACER:**
- Importar `variables.scss` al inicio de cada componente
- Usar variables en lugar de valores hardcodeados
- Mantener jerarquía visual con tonos de gris
- Usar `$accent-gold` para elementos principales

❌ **NO HACER:**
- Hardcodear colores como `#667eea` o `#764ba2`
- Mezclar paletas de colores diferentes
- Usar nombres genéricos como "color1" o "color2"
- Ignorar las variables de transición

---

## Referencia Rápida por Módulo

| Módulo | Header | Botones | Cartas |
|--------|--------|---------|--------|
| Dashboard | Dorado gradient | Primary: Dorado | White + border |
| Inventario | Dorado gradient | Primary: Dorado | White + shadow |
| Items | Dorado gradient | Primary: Dorado | White + border |
| Proveedores | Dorado gradient | Primary: Dorado | White + shadow |
| Mesero | Dorado gradient | Primary: Dorado | White + border |
| Admin | Dorado gradient | Primary: Dorado | White + shadow |
| Cliente | White + border dorado | Primary: Dorado | White + shadow |

---

**Última actualización**: Abril 2026

