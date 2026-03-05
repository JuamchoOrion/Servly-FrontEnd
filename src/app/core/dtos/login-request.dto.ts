/**
 * LoginRequestDTO
 * Data Transfer Object para la solicitud de login
 * Se envía a: POST /api/auth/login
 */
export interface LoginRequestDTO {
  /**
   * Email del usuario (requerido)
   * Debe ser un email válido
   */
  email: string;

  /**
   * Contraseña del usuario (requerido)
   * Mínimo 6 caracteres
   */
  password: string;

  /**
   * Token de reCAPTCHA v3 de Google (requerido)
   * Obtenido del widget de reCAPTCHA en el frontend
   */
  recaptchaToken: string;
}

