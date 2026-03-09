import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../enviroments/enviroment';
import { CreateEmployeeDto, EmployeeResponseDto } from '../dtos/employee.dto';

/**
 * EmployeeService
 * Servicio para gestionar operaciones de empleados
 */
@Injectable({ providedIn: 'root' })
export class EmployeeService {

  private readonly API_URL = environment.apiUrl;
  private readonly EMPLOYEES_ENDPOINT = `${this.API_URL}/api/admin/employees`;

  constructor(private http: HttpClient) {}

  /**
   * Crea un nuevo empleado
   *
   * @param employee Datos del empleado a crear
   * @returns Observable<EmployeeResponseDto> con la respuesta del servidor
   *
   * Posibles errores:
   * - 400: Validación fallida (campos inválidos)
   * - 403: Sin permisos o token inválido
   * - 404: Usuario autenticado no encontrado
   * - 409: Email duplicado
   * - 500: Error del servidor
   */
  createEmployee(employee: CreateEmployeeDto): Observable<EmployeeResponseDto> {
    return this.http.post<EmployeeResponseDto>(this.EMPLOYEES_ENDPOINT, employee, {
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
        errorMessage = body?.message || 'Datos inválidos. Verifica los campos';
        break;
      case 403:
        errorMessage = 'No tiene permisos para realizar esta acción';
        break;
      case 404:
        errorMessage = 'Usuario no encontrado';
        break;
      case 409:
        errorMessage = 'Ya existe una cuenta con ese email';
        break;
      case 500:
        errorMessage = 'Error del servidor. Intenta más tarde';
        break;
      default:
        errorMessage = body?.message || 'Error al crear el empleado';
    }

    console.error('Employee creation error:', error);
    return throwError(() => ({
      status,
      message: errorMessage,
      originalError: error
    }));
  }
}
