import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../enviroments/enviroment';

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
  logo?: File | null;
}

export interface MessageResponse {
  message: string;
}

export interface PaginatedSupplierResponse {
  content: SupplierDTO[];
  pageNumber: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class SupplierService {
  private readonly API_URL = `${environment.apiUrl}/api/staff/inventory/suppliers`;

  constructor(private http: HttpClient) {}

  /**
   * Obtiene todos los proveedores
   * GET /api/staff/inventory/suppliers
   */
  getAll(): Observable<SupplierDTO[]> {
    return this.http.get<SupplierDTO[]>(this.API_URL, { withCredentials: true });
  }

  /**
   * Obtiene un proveedor por ID
   * GET /api/staff/inventory/suppliers/{id}
   */
  getById(id: number): Observable<SupplierDTO> {
    return this.http.get<SupplierDTO>(`${this.API_URL}/${id}`, { withCredentials: true });
  }

  /**
   * Crea un nuevo proveedor
   * POST /api/staff/inventory/suppliers
   * Content-Type: multipart/form-data
   * Requiere rol: STOREKEEPER
   */
  create(request: SupplierCreateRequest): Observable<SupplierDTO> {
    const formData = new FormData();

    // Crear el JSON con los datos del proveedor
    const dataJson = {
      name: request.name,
      description: request.description,
      contactNumber: request.contactNumber,
      email: request.email
    };

    // Agregar los datos como JSON
    formData.append('data', new Blob([JSON.stringify(dataJson)], { type: 'application/json' }));

    // Agregar la imagen si existe
    if (request.logo) {
      formData.append('image', request.logo);
    }

    // Debug: log del FormData
    console.log('=== Creating Supplier ===');
    console.log('Data JSON:', dataJson);
    console.log('Has image:', !!request.logo);
    if (request.logo) {
      console.log('Image name:', request.logo.name);
      console.log('Image type:', request.logo.type);
      console.log('Image size:', request.logo.size);
    }

    return this.http.post<SupplierDTO>(this.API_URL, formData, { withCredentials: true });
  }

  /**
   * Actualiza un proveedor existente
   * PUT /api/staff/inventory/suppliers/{id}
   * Content-Type: multipart/form-data
   * Requiere rol: STOREKEEPER
   */
  update(id: number, request: SupplierCreateRequest): Observable<SupplierDTO> {
    const formData = new FormData();

    // Crear el JSON con los datos del proveedor
    const dataJson = {
      name: request.name,
      description: request.description,
      contactNumber: request.contactNumber,
      email: request.email
    };

    // Agregar los datos como JSON
    formData.append('data', new Blob([JSON.stringify(dataJson)], { type: 'application/json' }));

    // Agregar la imagen si existe
    if (request.logo) {
      formData.append('image', request.logo);
    }

    // Debug: log del FormData
    console.log('=== Updating Supplier (ID:', id, ') ===');
    console.log('Data JSON:', dataJson);
    console.log('Has image:', !!request.logo);
    if (request.logo) {
      console.log('Image name:', request.logo.name);
      console.log('Image type:', request.logo.type);
      console.log('Image size:', request.logo.size);
    }

    return this.http.put<SupplierDTO>(`${this.API_URL}/${id}`, formData, { withCredentials: true });
  }

  /**
   * Elimina un proveedor
   * DELETE /api/staff/inventory/suppliers/{id}
   * Requiere rol: STOREKEEPER
   */
  delete(id: number): Observable<MessageResponse> {
    return this.http.delete<MessageResponse>(`${this.API_URL}/${id}`, { withCredentials: true });
  }
}
