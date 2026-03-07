/**
 * LoginResponseDTO
 * Data Transfer Object para la respuesta exitosa de login
 * Corresponde a POST /api/auth/login (200 OK)
 */
export interface LoginResponseDTO {
  /**
   * Token JWT de acceso válido por 24 horas
   * Usar en header: Authorization: Bearer {token}
   * (Puede venir como 'token' o 'accessToken' según el backend)
   */
  token?: string;
  accessToken?: string;

  /**
   * Token JWT de refresco válido por 7 días
   * Usar para renovar el access token cuando expire
   */
  refreshToken: string;

  /**
   * Email del usuario autenticado
   */
  email: string;

  /**
   * Nombre completo del usuario
   */
  name: string;

  /**
   * Lista de roles del usuario
   * Ejemplos: ['ADMIN'], ['STAFF'], ['ADMIN', 'STAFF']
   */
  roles?: string[];

  /**
   * Role individual del usuario (singular)
   * Ejemplos: 'ADMIN', 'STAFF', 'STOREKEEPER'
   */
  role?: string;

  /**
   * ID único del usuario
   */
  userId?: string;

  /**
   * Flag indicando si el usuario debe cambiar la contraseña
   * Si es true, mostrar pantalla de cambio de contraseña obligatorio
   */
  mustChangePassword: boolean;

  /**
   * Flag indicando si el usuario completó el primer login
   */
  firstLoginCompleted?: boolean;
}

/**
 * ErrorResponseDTO
 * Data Transfer Object para respuestas de error
 */
export interface ErrorResponseDTO {
  /**
   * Código HTTP de error (400, 401, 403, 422, 429, 500)
   */
  status: number;

  /**
   * Mensaje de error general
   */
  message: string;

  /**
   * Detalles adicionales del error (si aplica)
   */
  details?: string;

  /**
   * Errores de validación (si aplica para 422)
   */
  errors?: {
    [field: string]: string[];
  };

  /**
   * Timestamp de cuando ocurrió el error
   */
  timestamp?: string;
}



