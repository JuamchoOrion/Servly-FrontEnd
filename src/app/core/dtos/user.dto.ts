/**
 * Interfaz para usuario en la lista
 */
export interface UserListItem {
  id: string;
  name: string;
  email: string;
  role: string;
  provider: string;
  enabled: boolean;
  twoFactorEnabled: boolean;
  createdAt: string;
  mustChangePassword: boolean;
  firstLoginCompleted: boolean;
}

/**
 * DTO para cambiar rol de usuario
 */
export interface UpdateRoleDto {
  role: 'ADMIN' | 'CASHIER' | 'WAITER' | 'KITCHEN' | 'STOREKEEPER';
}

/**
 * DTO para respuesta de actualización de rol
 */
export interface UpdateRoleResponse {
  id: string;
  name: string;
  email: string;
  role: string;
  updatedAt: string;
}

/**
 * DTO para error de API
 */
export interface ApiErrorDto {
  message: string;
  status?: number;
}
