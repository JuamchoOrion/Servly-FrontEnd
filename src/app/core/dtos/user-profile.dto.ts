/**
 * DTO para el perfil del usuario autenticado
 * Respuesta del endpoint GET /api/auth/me
 */
export interface UserProfile {
  userId: number;
  email: string;
  name: string;
  role: string;
  createdAt?: string;
  enabled?: boolean;
  twoFactorEnabled?: boolean;
}

/**
 * DTO para error de API
 */
export interface ProfileError {
  message: string;
  status?: number;
}
