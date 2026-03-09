# 📦 Módulo de Inventario - Referencia de APIs

## Endpoints Utilizados

### 1. STOCK BATCH (Lotes de Stock) - NUEVO
**Usado en:** Dashboard, Inventario

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/stock-batch/close-to-expire` | Lotes próximos a expirar (<7 días) |
| GET | `/api/stock-batch/expired` | Lotes ya expirados |
| GET | `/api/stock-batch/item-stock/{itemStockId}` | Todos los lotes de un ItemStock |
| GET | `/api/stock-batch/item-stock/{itemStockId}/next-to-expire` | Próximo lote a expirar (FIFO) |
| POST | `/api/stock-batch` | Crear nuevo lote |
| PUT | `/api/stock-batch/item-stock/{itemStockId}/decrease?quantity=50` | Consumir stock (FIFO) |

**Request POST (crear lote):**
```json
{
  "itemStockId": 1,
  "quantity": 100,
  "supplierId": 1,
  "batchNumber": "LOTE-ARR-20260308-001",
  "expiryDate": "2026-06-01"  // ← OPCIONAL
}
```

> **Nota:** `expiryDate` es **OPCIONAL**. Si no se proporciona, el backend
> lo calcula automáticamente usando: `fechaActual + item.expirationDays`

**Response StockBatch:**
```json
{
  "id": 1,
  "batchNumber": "LOTE-ARROZ-2026-001",
  "quantity": 100,
  "supplierName": "Proveedor A",
  "createdDate": "2026-03-01",
  "expiryDate": "2026-06-01",
  "status": "VIGENTE",
  "daysUntilExpiry": 85
}
```

**Estados posibles (status):**
- `VIGENTE` - Lote en buen estado
- `PROXIMO_A_EXPIRAR` - Menos de 7 días para expirar
- `EXPIRADO` - Ya venció
- `AGOTADO` - Sin stock

---

### 2. INVENTARIO (Stock)
**Ruta Frontend:** `/inventory`

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/staff/inventory/paginated?page=0&size=10&sort=id,asc` | Lista stock paginado |
| PUT | `/api/staff/inventory/{itemStockId}/increase?quantity=5` | Aumentar stock |
| PUT | `/api/staff/inventory/{itemStockId}/decrease?quantity=3` | Disminuir stock |

**Response esperado (GET paginated):**
```json
{
  "content": [{
    "itemStockId": 1,
    "name": "Arroz",
    "description": "Arroz blanco",
    "category": "Granos",
    "quantity": 50,
    "idealStock": 100,
    "unitOfMeasurement": "kg",
    "supplierName": "Proveedor X",
    "expirationDays": 365
  }],
  "pageNumber": 0,
  "pageSize": 10,
  "totalElements": 50,
  "totalPages": 5,
  "last": false
}
```

---

### 2. CATEGORÍAS
**Ruta Frontend:** `/categories`

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/item-categories` | Lista todas |
| GET | `/api/item-categories/paginated?page=0&size=10` | Lista paginada |
| POST | `/api/item-categories` | Crear |
| PUT | `/api/item-categories/{id}` | Actualizar |
| PATCH | `/api/item-categories/{id}/toggle` | Activar/Desactivar |
| DELETE | `/api/item-categories/{id}` | Eliminar |

**Body POST/PUT:**
```json
{
  "name": "Granos",
  "description": "Arroz, trigo, avena"
}
```

**Response:**
```json
{
  "id": 1,
  "name": "Granos",
  "description": "Arroz, trigo, avena",
  "active": true
}
```

---

### 3. ITEMS (Productos)
**Ruta Frontend:** `/items`

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/items` | Lista todos |
| GET | `/api/items/paginated?page=0&size=10&sort=id,asc` | Lista paginada |
| GET | `/api/items/category-paginated/{categoryId}?page=0&size=10` | Por categoría |
| GET | `/api/items/search-paginated?name=Arroz&page=0&size=10` | Búsqueda |
| POST | `/api/items` | Crear |
| PUT | `/api/items/{id}` | Actualizar |
| DELETE | `/api/items/{id}` | Eliminar |

**Body POST:**
```json
{
  "name": "Arroz Blanco",
  "description": "Arroz de calidad",
  "unitOfMeasurement": "kg",
  "expirationDays": 365,
  "category": "1",
  "idealStock": 100
}
```

**Body PUT (parcial):**
```json
{
  "name": "Arroz Integral",
  "expirationDays": 180
}
```

---

### 4. PROVEEDORES
**Ruta Frontend:** `/inventory/providers`

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/staff/inventory/suppliers` | Lista todos |
| GET | `/api/staff/inventory/suppliers/paginated?page=0&size=10&sort=id,asc` | Lista paginada |
| GET | `/api/staff/inventory/suppliers/{id}` | Por ID |
| POST | `/api/staff/inventory/suppliers` | Crear (multipart) |
| PUT | `/api/staff/inventory/suppliers/{id}` | Actualizar (multipart) |
| DELETE | `/api/staff/inventory/suppliers/{id}` | Eliminar |

**POST/PUT - multipart/form-data:**
```
data: {"name":"Proveedor","description":"Desc","contactNumber":"+57300","email":"a@b.com"}
image: [archivo opcional]
```

**Response:**
```json
{
  "id": 1,
  "name": "Proveedor",
  "description": "Desc",
  "contactNumber": "+57300",
  "email": "a@b.com",
  "logoUrl": "https://cloudinary.com/..."
}
```

---

## Autenticación
- Todas las peticiones llevan `withCredentials: true` (cookies)
- Header: `Authorization: Bearer {token}`
- Roles requeridos: `ADMIN` o `STOREKEEPER`

## Paginación Estándar
Todos los endpoints paginados usan:
- `page`: número de página (0-indexed)
- `size`: elementos por página
- `sort`: campo,dirección (ej: `id,asc`)

Response estándar:
```json
{
  "content": [...],
  "pageNumber": 0,
  "pageSize": 10,
  "totalElements": 100,
  "totalPages": 10,
  "last": false
}
```

