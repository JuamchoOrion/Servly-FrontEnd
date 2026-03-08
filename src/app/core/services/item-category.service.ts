import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../enviroments/enviroment';
import { CreateItemCategoryRequest, UpdateItemCategoryRequest, ItemCategoryResponse } from '../dtos/category.dto';

export interface PaginatedCategoryResponse {
  content: ItemCategoryResponse[];
  pageNumber: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
  isLast: boolean;
}

/**
 * Servicio para gestionar categorías de items
 * Handles all HTTP requests related to item categories
 */
@Injectable({ providedIn: 'root' })
export class ItemCategoryService {
  private readonly API_URL = environment.apiUrl;
  private readonly CATEGORIES_ENDPOINT = `${this.API_URL}/api/item-categories`;

  constructor(private http: HttpClient) {}

  /**
   * Crear una nueva categoría
   * POST /api/item-categories
   */
  createCategory(request: CreateItemCategoryRequest): Observable<ItemCategoryResponse> {
    return this.http.post<ItemCategoryResponse>(
      this.CATEGORIES_ENDPOINT,
      request,
      { withCredentials: true }
    );
  }

  /**
   * Obtener todas las categorías
   * GET /api/item-categories
   */
  getAllCategories(): Observable<ItemCategoryResponse[]> {
    return this.http.get<ItemCategoryResponse[]>(
      this.CATEGORIES_ENDPOINT,
      { withCredentials: true }
    );
  }

  /**
   * Obtener categorías paginadas
   * GET /api/item-categories/paginated?page=0&size=10
   */
  getCategoriesPaginated(
    page: number = 0,
    size: number = 10
  ): Observable<PaginatedCategoryResponse> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    return this.http.get<PaginatedCategoryResponse>(
      `${this.CATEGORIES_ENDPOINT}/paginated`,
      { withCredentials: true, params }
    );
  }

  /**
   * Obtener categoría por ID
   * GET /api/item-categories/{id}
   */
  getCategoryById(id: number): Observable<ItemCategoryResponse> {
    return this.http.get<ItemCategoryResponse>(
      `${this.CATEGORIES_ENDPOINT}/${id}`,
      { withCredentials: true }
    );
  }

  /**
   * Actualizar categoría existente
   * PUT /api/item-categories/{id}
   */
  updateCategory(id: number, request: UpdateItemCategoryRequest): Observable<ItemCategoryResponse> {
    return this.http.put<ItemCategoryResponse>(
      `${this.CATEGORIES_ENDPOINT}/${id}`,
      request,
      { withCredentials: true }
    );
  }

  /**
   * Toggle (activar/desactivar) una categoría
   * PATCH /api/item-categories/{id}/toggle
   */
  toggleCategory(id: number): Observable<ItemCategoryResponse> {
    return this.http.patch<ItemCategoryResponse>(
      `${this.CATEGORIES_ENDPOINT}/${id}/toggle`,
      {},
      { withCredentials: true }
    );
  }

  /**
   * Eliminar categoría
   * DELETE /api/item-categories/{id}
   */
  deleteCategory(id: number): Observable<void> {
    return this.http.delete<void>(
      `${this.CATEGORIES_ENDPOINT}/${id}`,
      { withCredentials: true }
    );
  }
}

