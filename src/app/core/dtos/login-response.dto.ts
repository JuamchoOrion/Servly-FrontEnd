/**
 * LoginResponseDTO
 * Data Transfer Object para la respuesta de login
 */
export interface LoginResponseDTO {
  /**
   * Token de autenticación JWT
   */
  token: string;

  /**
   * Información del empleado autenticado
   */
  employee: {
    id: string;
    email: string;
    name: string;
    role: 'mesero' | 'cocina' | 'cajero' | 'administrador';
  };

  /**
   * Mensaje de éxito
   */
  message: string;
}

