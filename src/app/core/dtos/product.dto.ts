/**
 * DTOs y Interfaces para el módulo de Productos
 * Basado en la API real del backend
 */

export interface RecipeItem {
  id: number;
  itemId: number;
  itemName: string;
  baseQuantity: number;
  annotation?: string | null;
  isOptional: boolean;
  minQuantity: number;
  maxQuantity: number;
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
  category?: string;
  image?: string;
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
}

export interface UpdateProductRequest {
  name?: string;
  description?: string;
  price?: number;
  basePrice?: number;
  category?: string;
  active?: boolean;
  image?: string;
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

