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
  description?: string;
  contactNumber?: string;
  email?: string;
  logo?: File | null;
}

export interface MessageResponse {
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class SupplierService {
  private readonly API_URL = '/api/staff/inventory/suppliers';

  constructor(private http: HttpClient) {}

  /**
   * Obtiene todos los proveedores
   * GET /api/staff/inventory/suppliers
   */
  getAll(): Observable<SupplierDTO[]> {
    return this.http.get<SupplierDTO[]>(this.API_URL);
  }

  /**
   * Obtiene un proveedor por ID
   * GET /api/staff/inventory/suppliers/{id}
   */
  getById(id: number): Observable<SupplierDTO> {
    return this.http.get<SupplierDTO>(`${this.API_URL}/${id}`);
  }

  /**
   * Crea un nuevo proveedor
   * POST /api/staff/inventory/suppliers
   * Requiere rol: STOREKEEPER
   * Content-Type: multipart/form-data
   *
   * El backend espera:
   * - data: JSON string con los datos del proveedor
   * - image: el archivo de imagen
   */
  create(request: SupplierCreateRequest): Observable<SupplierDTO> {
    const formData = new FormData();

    // Crear JSON con los datos y convertirlo a string
    const dataJson = {
      name: request.name,
      description: request.description,
      contactNumber: request.contactNumber,
      email: request.email
    };

    formData.append('data', new Blob([JSON.stringify(dataJson)], { type: 'application/json' }));
    if (request.logo) formData.append('image', request.logo);

    return this.http.post<SupplierDTO>(this.API_URL, formData, {
      reportProgress: false,
      observe: 'body'
    });
  }

  /**
   * Actualiza un proveedor existente
   * PUT /api/staff/inventory/suppliers/{id}
   * Requiere rol: STOREKEEPER
   * Content-Type: multipart/form-data
   *
   * El backend espera:
   * - data: JSON string con los datos del proveedor
   * - image: el archivo de imagen (opcional)
   */
  update(id: number, request: SupplierCreateRequest): Observable<SupplierDTO> {
    const formData = new FormData();

    // Crear JSON con los datos y convertirlo a string
    const dataJson = {
      name: request.name,
      description: request.description,
      contactNumber: request.contactNumber,
      email: request.email
    };

    formData.append('data', new Blob([JSON.stringify(dataJson)], { type: 'application/json' }));
    if (request.logo) formData.append('image', request.logo);

    return this.http.put<SupplierDTO>(`${this.API_URL}/${id}`, formData, {
      reportProgress: false,
      observe: 'body'
    });
  }

  /**
   * Elimina un proveedor
   * DELETE /api/staff/inventory/suppliers/{id}
   * Requiere rol: STOREKEEPER
   */
  delete(id: number): Observable<MessageResponse> {
    return this.http.delete<MessageResponse>(`${this.API_URL}/${id}`);
  }
}
