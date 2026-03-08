/**
 * UserResponseDTO
 * Datos de un usuario para el admin
 */
export interface UserResponse {
  id: string;
  email: string;
  name: string;
  lastName?: string;
  role: string;
  enabled: boolean;
  provider?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * ChangeRoleRequestDTO
 * Request para cambiar el rol de un usuario
 */
export interface ChangeRoleRequest {
  role: string;
}

/**
 * ToggleUserStatusResponseDTO
 * Respuesta al activar/desactivar usuario
 */
export interface ToggleUserStatusResponse {
  message: string;
  enabled: boolean;
}

/**
 * AuthMetricsDTO
 * Métricas de autenticación
 */
export interface AuthMetrics {
  totalLogins: number;
  successfulLogins: number;
  failedLogins: number;
  uniqueUsers: number;
  period: {
    start: string;
    end: string;
  };
}

/**
 * CreateUserRequestDTO
 * Request para crear empleado
 * La contraseña es generada automáticamente por el backend
 */
export interface CreateEmployeeRequest {
  email: string;
  password?: string;  // Opcional - el backend la genera si no se proporciona
  name: string;
  lastName: string;
  role: string;
}

/**
 * Errores de validación del backend
 */
export interface ValidationError {
  field: string;
  message: string;
}
