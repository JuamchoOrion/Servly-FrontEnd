/**
 * LoginRequestDTO
 * Data Transfer Object para la solicitud de login
 */
export interface LoginRequestDTO {
  /**
   * Email del empleado
   */
  email: string;

  /**
   * Contraseña del empleado
   */
  password: string;
}

