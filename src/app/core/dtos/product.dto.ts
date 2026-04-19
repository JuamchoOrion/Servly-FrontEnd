/**
 * DTOs y Interfaces para el módulo de Productos
 * Basado en la API real del backend
 */

export interface RecipeItem {
  id: number;
  itemId?: number; // ID del item (a veces viene así)
  item?: { id: number; name: string }; // O como objeto completo
  itemName?: string; // Nombre del item
  quantity?: number; // Campo alternativo para cantidad
  baseQuantity?: number;
  annotation?: string | null;
  isOptional: boolean;
  minQuantity?: number;
  maxQuantity?: number;
}

export interface ItemDetail {
  itemId: number;
  quantity: number;
  annotation?: string;
  isOptional?: boolean;
}

export interface CreateRecipeRequest {
  name: string;
  quantity: number;
  description?: string;
  itemDetails: ItemDetail[];
}

export interface UpdateRecipeRequest {
  name?: string;
  quantity?: number;
  description?: string;
  itemDetails?: ItemDetail[];
}

export interface Recipe {
  id: number;
  name: string;
  quantity: number;
  description?: string;
  itemDetails?: RecipeItem[];
  itemDetailList?: RecipeItem[]; // API también retorna con este nombre
  createdAt?: string;
  updatedAt?: string;
}

export interface Category {
  id: number;
  name: string;
  description: string;
  active?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Product {
  id: number;
  name: string;
  description: string;
  basePrice: number; // Campo del backend es basePrice, no price
  price?: number; // Alias para basePrice
  category?: string;
  image?: string;
  imageUrl?: string; // URL de imagen en Cloudinary (desde POST con imagen)
  active?: boolean;
  recipeItems?: RecipeItem[]; // Items opcionales de la receta
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateProductRequest {
  name: string;
  description: string;
  price: number;
  productCategoryId: number;
  active?: boolean;
  recipeId?: number;
  image?: File; // Para enviar como FormData
}

export interface UpdateProductRequest {
  name?: string;
  description?: string;
  price?: number;
  basePrice?: number;
  category?: string;
  active?: boolean;
  image?: string | File; // URL o archivo
  imageUrl?: string; // URL después de actualizar
}

export interface ProductFormData {
  name: string;
  description: string;
  price: number;
  category?: string;
  active: boolean;
  image?: string;
}

export interface PaginatedProductResponse {
  content: Product[];
  pageNumber: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
  isLast: boolean;
}

