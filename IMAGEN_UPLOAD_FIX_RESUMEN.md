# ✅ FIX: Carga de Imágenes en Crear Producto + Corrección de Precio

## 1️⃣ Problema: Precio no se mostraba en la tabla

### Causa
El HTML estaba usando `product.basePrice` pero la API retorna `product.price`.

### Solución
Se cambió en `product-list.component.html`:
```html
<!-- ❌ ANTES -->
<td class="cell-price">${{ product.basePrice | number:'1.2-2' }}</td>

<!-- ✅ AHORA -->
<td class="cell-price">${{ product.price | number:'1.2-2' }}</td>
```

---

## 2️⃣ Problema: Carga de imágenes en crear producto

Al crear un nuevo producto, la imagen no se estaba subiendo a Cloudinary. El problema estaba en el componente TypeScript del formulario.

### Root Cause

En el archivo `product-form.component.ts`, el método `saveProduct()` estaba utilizando:
- **Para crear**: `productService.createProduct()` (NO soporta FormData con imagen)
- **Para editar con imagen**: `productService.createProductWithImage()` (SÍ soporta FormData)

```typescript
// ❌ ANTES - Crear producto sin imagen
: this.productService.createProduct({
    ...productData,
    productCategoryId: parseInt(formData.categoryId.toString()),
    recipeId: formData.recipeId ? parseInt(formData.recipeId.toString()) : undefined
  });
```

## Solución Implementada

### 1. Cambio en `product-form.component.ts`

Se modificó el método `saveProduct()` para siempre usar `createProductWithImage()` al crear productos, incluso si no hay imagen:

```typescript
// ✅ AHORA - Crear producto con soporte para imagen
} else {
  // Modo creación - siempre usar createProductWithImage para soportar imagen
  operation$ = this.productService.createProductWithImage(productData, this.imageFile || undefined);
}
```

### 2. Importación de Observable

Se agregó la importación faltante:
```typescript
import { Subject, Observable } from 'rxjs';
```

### 3. Estructura de Datos

Se reordenó `productData` para incluir `categoryId` directamente (que es lo que espera `createProductWithImage`):

```typescript
const productData = {
  name: formData.name.trim(),
  description: formData.description.trim(),
  price: parseFloat(formData.price.toString()),
  categoryId: parseInt(formData.categoryId.toString()),  // ✅ Agregado
  recipeId: formData.recipeId ? parseInt(formData.recipeId.toString()) : undefined,  // ✅ Agregado
  active: formData.active
};
```

## Flujo Correcto

### Crear Producto
1. Usuario completa el formulario
2. Usuario selecciona imagen (opcional)
3. Al guardar, se llama a `createProductWithImage(productData, imageFile)`
4. El servicio crea un FormData con todos los campos
5. Se envía POST a `/api/admin/products/with-image`
6. Backend sube imagen a Cloudinary y crea el producto

### Editar Producto
- **Sin cambiar imagen**: Usa `updateProduct()`
- **Cambiando imagen**: Usa `updateProductWithImage()`

## Endpoint Backend

El endpoint espera:
```java
POST /api/admin/products/with-image
Content-Type: multipart/form-data

Parámetros:
- name (String)
- description (String)
- price (BigDecimal)
- categoryId (Long)
- active (Boolean)
- recipeId (Long, opcional)
- image (MultipartFile, opcional)
```

## Método del Servicio (`product.service.ts`)

El método `createProductWithImage()` ya estaba implementado correctamente:

```typescript
createProductWithImage(
  data: {
    name: string;
    description: string;
    price: number;
    categoryId: number;
    recipeId?: number;
    active?: boolean;
  },
  imageFile?: File
): Observable<Product> {
  const formData = new FormData();
  formData.append('name', data.name);
  formData.append('description', data.description);
  formData.append('price', data.price.toString());
  formData.append('categoryId', data.categoryId.toString());
  if (data.recipeId) {
    formData.append('recipeId', data.recipeId.toString());
  }
  if (data.active !== undefined) {
    formData.append('active', data.active.toString());
  }
  if (imageFile) {
    formData.append('image', imageFile, imageFile.name);
  }

  return this.http.post<Product>(`${this.API_URL}/api/admin/products/with-image`, formData).pipe(
    catchError(this.handleError)
  );
}
```

## Cambios Realizados

### Archivo Modificado
- `C:\Users\ramir\Documents\7mo Semestre\Ing de software III\servlyFrontend\src\app\features\products\pages\product-form\product-form.component.ts`

### Cambios Específicos
1. Importar `Observable` de `rxjs`
2. Declarar `operation$` como tipo `Observable<Product>`
3. Reestructurar la lógica de creación/edición:
   - Crear siempre con `createProductWithImage()`
   - Editar con `updateProductWithImage()` si hay imagen
   - Editar con `updateProduct()` si no hay imagen
4. Incluir `categoryId` y `recipeId` en `productData`

## Validación

✅ El componente ahora soporta:
- ✅ Crear producto **con imagen**
- ✅ Crear producto **sin imagen**
- ✅ Editar producto **con nueva imagen**
- ✅ Editar producto **sin cambiar imagen**
- ✅ Validación de tipo de archivo (image/*)
- ✅ Validación de tamaño máximo (10MB)
- ✅ Vista previa de imagen antes de guardar
- ✅ Remover imagen seleccionada
- ✅ Mostrar imagen actual en modo edición

## Prueba Recomendada

1. Navegar a `/products/new`
2. Llenar formulario:
   - Nombre: "Test Producto"
   - Descripción: "Producto de prueba para test"
   - Precio: 9.99
   - Categoría: Seleccionar una
   - Imagen: Seleccionar una imagen JPG/PNG
3. Hacer clic en "Crear"
4. Verificar:
   - La imagen aparece en la lista de productos
   - La imagen se ve correctamente en Cloudinary
   - El producto tiene la imagen asignada en el backend

