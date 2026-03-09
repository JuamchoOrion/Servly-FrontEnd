import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../enviroments/enviroment';
import { UserListItem, UpdateRoleDto, UpdateRoleResponse } from '../dtos/user.dto';

/**
 * UserService
 * Servicio para gestionar operaciones de usuarios (solo ADMIN)
 */
@Injectable({ providedIn: 'root' })
export class UserService {

  private readonly API_URL = environment.apiUrl;
  private readonly USERS_ENDPOINT = `${this.API_URL}/api/admin/users`;

  constructor(private http: HttpClient) {}

  /**
   * Obtiene la lista de todos los usuarios
   *
   * @returns Observable<UserListItem[]> con la lista de usuarios
   *
   * Posibles errores:
   * - 401/403: Sin permisos o token inválido
   * - 500: Error del servidor
   */
  getUsers(): Observable<UserListItem[]> {
    return this.http.get<UserListItem[]>(this.USERS_ENDPOINT, {
      withCredentials: true
    }).pipe(
      catchError(error => this.handleError(error))
    );
  }

  /**
   * Cambia el rol de un usuario
   *
   * @param userId ID del usuario
   * @param roleDto Nuevo rol del usuario
   * @returns Observable<UpdateRoleResponse> con la respuesta
   *
   * Posibles errores:
   * - 400: Rol no válido
   * - 403: Intenta cambiar su propio rol de ADMIN
   * - 404: Usuario no encontrado
   * - 500: Error interno
   */
  updateRole(userId: string, roleDto: UpdateRoleDto): Observable<UpdateRoleResponse> {
    return this.http.put<UpdateRoleResponse>(`${this.USERS_ENDPOINT}/${userId}/role`, roleDto, {
      withCredentials: true
    }).pipe(
      catchError(error => this.handleError(error))
    );
  }

  /**
   * Activa o desactiva un usuario
   *
   * @param userId ID del usuario
   * @returns Observable<void>
   *
   * Posibles errores:
   * - 403: Intenta desactivarse a sí mismo
   * - 404: Usuario no encontrado
   * - 500: Error interno
   */
  toggleUser(userId: string): Observable<void> {
    return this.http.patch<void>(`${this.USERS_ENDPOINT}/${userId}/toggle`, {}, {
      withCredentials: true
    }).pipe(
      catchError(error => this.handleError(error))
    );
  }

  /**
   * Elimina un usuario
   *
   * @param userId ID del usuario a eliminar
   * @returns Observable<void>
   *
   * Posibles errores:
   * - 403: Intenta eliminarse a sí mismo
   * - 404: Usuario no encontrado
   * - 500: Error interno
   */
  deleteUser(userId: string): Observable<void> {
    return this.http.delete<void>(`${this.USERS_ENDPOINT}/${userId}`, {
      withCredentials: true
    }).pipe(
      catchError(error => this.handleError(error))
    );
  }

  /**
   * Maneja errores HTTP y proporciona mensajes claros
   */
  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'Error desconocido';

    const status = error.status;
    const body = error.error;

    switch (status) {
      case 400:
        errorMessage = body?.message || 'Datos inválidos';
        break;
      case 401:
        errorMessage = 'No autorizado. Inicie sesión nuevamente';
        break;
      case 403:
        errorMessage = body?.message || 'No tiene permisos para realizar esta acción';
        break;
      case 404:
        errorMessage = 'Usuario no encontrado';
        break;
      case 500:
        errorMessage = 'Error del servidor. Intente más tarde';
        break;
      default:
        errorMessage = body?.message || 'Error al procesar la solicitud';
    }

    console.error('User service error:', error);
    return throwError(() => ({
      status,
      message: errorMessage,
      originalError: error
    }));
  }
}
