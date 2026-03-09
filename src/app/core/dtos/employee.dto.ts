/**
 * DTO para crear un empleado
 */
export interface CreateEmployeeDto {
  name: string;
  lastName: string;
  email: string;
  address?: string;
  role: 'CASHIER' | 'WAITER' | 'KITCHEN' | 'STOREKEEPER';
}

/**
 * DTO para respuesta de empleado creado
 */
export interface EmployeeResponseDto {
  id: string;
  name: string;
  lastName: string;
  email: string;
  address?: string;
  role: string;
  createdAt: string;
}

/**
 * DTO para error de validación
 */
export interface EmployeeErrorDto {
  message: string;
  field?: string;
}
