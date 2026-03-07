import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface SupplierDTO {
  id: number;
  name: string;
  description: string;
  contactNumber: string;
  email: string;
  logoUrl: string;
}

export interface SupplierCreateRequest {
  name: string;
  description: string;
  contactNumber: string;
  email: string;
  logoUrl: string;
}

export interface MessageResponse {
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class SupplierService {
  private readonly API_URL = '/api/inventory/suppliers';

  constructor(private http: HttpClient) {}

  /**
   * Obtiene todos los proveedores
   * GET /api/inventory/suppliers
   */
  getAll(): Observable<SupplierDTO[]> {
    return this.http.get<SupplierDTO[]>(this.API_URL);
  }

  /**
   * Obtiene un proveedor por ID
   * GET /api/inventory/suppliers/{id}
   */
  getById(id: number): Observable<SupplierDTO> {
    return this.http.get<SupplierDTO>(`${this.API_URL}/${id}`);
  }

  /**
   * Crea un nuevo proveedor
   * POST /api/inventory/suppliers
   * Requiere rol: STOREKEEPER
   */
  create(request: SupplierCreateRequest): Observable<SupplierDTO> {
    return this.http.post<SupplierDTO>(this.API_URL, request);
  }

  /**
   * Actualiza un proveedor existente
   * PUT /api/inventory/suppliers/{id}
   * Requiere rol: STOREKEEPER
   */
  update(id: number, request: SupplierCreateRequest): Observable<SupplierDTO> {
    return this.http.put<SupplierDTO>(`${this.API_URL}/${id}`, request);
  }

  /**
   * Elimina un proveedor
   * DELETE /api/inventory/suppliers/{id}
   * Requiere rol: STOREKEEPER
   */
  delete(id: number): Observable<MessageResponse> {
    return this.http.delete<MessageResponse>(`${this.API_URL}/${id}`);
  }
}
