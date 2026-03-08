import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../enviroments/enviroment';

export interface CreateItemRequest {
  name: string;
  description: string;
  unitOfMeasurement: string;
  expirationDays: number;
  category: string;
}

export interface UpdateItemRequest {
  name?: string;
  description?: string;
  unitOfMeasurement?: string;
  expirationDays?: number;
  category?: string;
}

export interface ItemResponse {
  id: number;
  name: string;
  description: string;
  unitOfMeasurement: string;
  expirationDays: number;
  category: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedItemResponse {
  content: ItemResponse[];
  pageNumber: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
  isLast: boolean;
}

/**
 * Servicio para gestionar items
 * Handles all HTTP requests related to items
 */
@Injectable({ providedIn: 'root' })
export class ItemService {
  private readonly API_URL = environment.apiUrl;
  private readonly ITEMS_ENDPOINT = `${this.API_URL}/api/items`;

  constructor(private http: HttpClient) {}

  /**
   * Crear un nuevo item
   * POST /api/items
   */
  createItem(request: CreateItemRequest): Observable<ItemResponse> {
    return this.http.post<ItemResponse>(
      this.ITEMS_ENDPOINT,
      request,
      { withCredentials: true }
    );
  }

  /**
   * Obtener todos los items (sin paginación)
   * GET /api/items
   */
  getAllItems(): Observable<ItemResponse[]> {
    return this.http.get<ItemResponse[]>(
      this.ITEMS_ENDPOINT,
      { withCredentials: true }
    );
  }

  /**
   * Obtener items con paginación
   * GET /api/items/paginated?page=0&size=10&sort=id,asc
   */
  getItemsPaginated(
    page: number = 0,
    size: number = 10,
    sort: string = 'id,asc'
  ): Observable<PaginatedItemResponse> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString())
      .set('sort', sort);

    return this.http.get<PaginatedItemResponse>(
      `${this.ITEMS_ENDPOINT}/paginated`,
      { withCredentials: true, params }
    );
  }

  /**
   * Obtener items de una categoría con paginación
   * GET /api/items/category-paginated/{categoryId}?page=0&size=10
   */
  getItemsByCategoryPaginated(
    categoryId: number,
    page: number = 0,
    size: number = 10
  ): Observable<PaginatedItemResponse> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    return this.http.get<PaginatedItemResponse>(
      `${this.ITEMS_ENDPOINT}/category-paginated/${categoryId}`,
      { withCredentials: true, params }
    );
  }

  /**
   * Buscar items por nombre con paginación
   * GET /api/items/search-paginated?name=Arroz&page=0&size=10
   */
  searchItemsPaginated(
    name: string,
    page: number = 0,
    size: number = 10
  ): Observable<PaginatedItemResponse> {
    let params = new HttpParams()
      .set('name', name)
      .set('page', page.toString())
      .set('size', size.toString());

    return this.http.get<PaginatedItemResponse>(
      `${this.ITEMS_ENDPOINT}/search-paginated`,
      { withCredentials: true, params }
    );
  }

  /**
   * Obtener item por ID
   * GET /api/items/{id}
   */
  getItemById(id: number): Observable<ItemResponse> {
    return this.http.get<ItemResponse>(
      `${this.ITEMS_ENDPOINT}/${id}`,
      { withCredentials: true }
    );
  }

  /**
   * Actualizar item existente
   * PUT /api/items/{id}
   */
  updateItem(id: number, request: UpdateItemRequest): Observable<ItemResponse> {
    return this.http.put<ItemResponse>(
      `${this.ITEMS_ENDPOINT}/${id}`,
      request,
      { withCredentials: true }
    );
  }

  /**
   * Eliminar item
   * DELETE /api/items/{id}
   */
  deleteItem(id: number): Observable<void> {
    return this.http.delete<void>(
      `${this.ITEMS_ENDPOINT}/${id}`,
      { withCredentials: true }
    );
  }
}
