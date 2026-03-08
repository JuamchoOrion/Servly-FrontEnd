/**
 * CreateUserRequestDTO
 * Data Transfer Object para crear un nuevo usuario
 * Solo accesible para administradores
 */
export interface CreateUserRequestDTO {
  /**
   * Email del usuario (debe ser único)
   */
  email: string;

  /**
   * Contraseña temporal
   * El backend puede generarla automáticamente si no se proporciona
   */
  password?: string;

  /**
   * Nombre del usuario
   */
  name: string;

  /**
   * Apellido del usuario
   */
  lastName: string;

  /**
   * Rol del usuario
   * ADMIN, CASHIER, WAITER, STOREKEEPER, KITCHEN
   */
  role: string;
}

/**
 * CreateUserResponseDTO
 * Respuesta exitosa de creación de usuario
 */
export interface CreateUserResponseDTO {
  /**
   * Mensaje de confirmación
   */
  message: string;
}

/**
 * Roles disponibles para creación de usuarios (excluye ADMIN)
 */
export type UserRole = 'CASHIER' | 'WAITER' | 'STOREKEEPER' | 'KITCHEN';

/**
 * Etiquetas amigables para los roles
 */
export const ROLE_LABELS: Record<UserRole, string> = {
  CASHIER: 'CASHIER',
  WAITER: 'WAITER',
  STOREKEEPER: 'STOREKEEPER',
  KITCHEN: 'KITCHEN'
};
