import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
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
   * Obtener todos los items
   * GET /api/items
   */
  getAllItems(): Observable<ItemResponse[]> {
    return this.http.get<ItemResponse[]>(
      this.ITEMS_ENDPOINT,
      { withCredentials: true }
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
