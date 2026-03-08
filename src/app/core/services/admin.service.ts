import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { environment } from '../../../enviroments/enviroment';
import { CreateUserResponseDTO } from '../dtos/create-user-request.dto';
import { UserResponse, ChangeRoleRequest, ToggleUserStatusResponse, AuthMetrics, CreateEmployeeRequest } from '../dtos/admin.dto';

/**
 * AdminService
 * Servicio para operaciones administrativas
 * Todas las operaciones requieren rol ADMIN
 */
@Injectable({ providedIn: 'root' })
export class AdminService {

  private readonly API_URL = environment.apiUrl;
  private readonly ADMIN_BASE = `${this.API_URL}/api/admin`;

  constructor(private http: HttpClient) {}

  // =====================
  // GESTIÓN DE USUARIOS
  // =====================

  /**
   * Listar todos los usuarios
   * GET /api/admin/users
   */
  getUsers(): Observable<UserResponse[]> {
    return this.http.get<UserResponse[]>(`${this.ADMIN_BASE}/users`, { withCredentials: true });
  }

  /**
   * Obtener datos de un usuario específico
   * GET /api/admin/users/{id}
   */
  getUserById(id: string): Observable<UserResponse> {
    return this.http.get<UserResponse>(`${this.ADMIN_BASE}/users/${id}`, { withCredentials: true });
  }

  /**
   * Crear empleado
   * POST /api/admin/employees
   *
   * Validaciones:
   * - email: Requerido, formato email válido, único en BD
   * - password: Requerido, mín 8 caracteres, 1 mayúscula, 1 minúscula, 1 número
   * - name: Requerido, máx 100 caracteres
   * - lastName: Requerido, máx 100 caracteres
   * - role: Requerido, solo permite: CASHIER, WAITER, KITCHEN, STOREKEEPER (NO ADMIN)
   */
  createUser(user: CreateEmployeeRequest): Observable<CreateUserResponseDTO> {
    return this.http.post<CreateUserResponseDTO>(
      `${this.ADMIN_BASE}/employees`,
      user,
      { withCredentials: true }
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Cambiar rol de usuario
   * PUT /api/admin/users/{id}/role
   */
  changeUserRole(id: string, role: string): Observable<MessageResponse> {
    return this.http.put<MessageResponse>(`${this.ADMIN_BASE}/users/${id}/role`, { role }, { withCredentials: true });
  }

  /**
   * Activar o desactivar cuenta de usuario
   * PATCH /api/admin/users/{id}/toggle
   */
  toggleUserStatus(id: string): Observable<ToggleUserStatusResponse> {
    return this.http.patch<ToggleUserStatusResponse>(`${this.ADMIN_BASE}/users/${id}/toggle`, {}, { withCredentials: true });
  }

  /**
   * Eliminar usuario permanentemente
   * DELETE /api/admin/users/{id}
   */
  deleteUser(id: string): Observable<MessageResponse> {
    return this.http.delete<MessageResponse>(`${this.ADMIN_BASE}/users/${id}`, { withCredentials: true });
  }

  // =====================
  // PERFIL
  // =====================

  /**
   * Obtener datos del admin autenticado
   * GET /api/auth/me
   */
  getCurrentUser(): Observable<UserResponse> {
    console.log('🔵 getCurrentUser: Llamando a /api/auth/me');
    return this.http.get<UserResponse>(`${this.API_URL}/api/auth/me`, {
      withCredentials: true,
      headers: {
        'Authorization': `Bearer ${this.getAuthToken()}`
      }
    }).pipe(
      tap((user: UserResponse) => console.log('🔵 getCurrentUser response:', user)),
      catchError(error => {
        console.error('❌ getCurrentUser error:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Obtiene el token de autenticación desde sessionStorage
   */
  private getAuthToken(): string | null {
    return sessionStorage.getItem('auth_token');
  }

  // =====================
  // MÉTRICAS
  // =====================

  /**
   * Obtener métricas de autenticación (7 días)
   * GET /api/admin/metrics/auth
   */
  getAuthMetrics(): Observable<AuthMetrics> {
    return this.http.get<AuthMetrics>(`${this.ADMIN_BASE}/metrics/auth`, { withCredentials: true });
  }

  // =====================
  // MANEJO DE ERRORES
  // =====================

  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'Error al crear usuario. Intente más tarde.';

    if (error.error instanceof ErrorEvent) {
      // Error del cliente
      errorMessage = error.error.message;
    } else {
      // Error del servidor
      const status = error.status;
      const body = error.error;

      switch (status) {
        case 400:
          // Errores de validación del backend
          if (body?.errors) {
            // Mapear errores por campo
            const errors = body.errors as Record<string, string[]>;
            const messages: string[] = [];

            if (errors['email']) {
              messages.push(errors['email'].join(', '));
            }
            if (errors['password']) {
              messages.push(errors['password'].join(', '));
            }
            if (errors['name']) {
              messages.push(errors['name'].join(', '));
            }
            if (errors['lastName']) {
              messages.push(errors['lastName'].join(', '));
            }
            if (errors['role']) {
              messages.push(errors['role'].join(', '));
            }

            errorMessage = messages.join(' | ');
          } else if (body?.message) {
            errorMessage = body.message;
          }
          break;
        case 401:
          errorMessage = 'No autenticado. Inicie sesión nuevamente.';
          break;
        case 403:
          errorMessage = 'No tiene permisos para realizar esta acción';
          break;
        case 409:
          // Email duplicado
          errorMessage = 'El email ya está registrado';
          break;
        case 422:
          // Error de validación
          if (body?.message) {
            errorMessage = body.message;
          }
          break;
        case 500:
          errorMessage = 'Error del servidor. Intente más tarde.';
          break;
      }
    }

    console.error('Admin API error:', error);
    return throwError(() => new Error(errorMessage));
  }
}

/**
 * MessageResponse genérico
 */
interface MessageResponse {
  message: string;
}
