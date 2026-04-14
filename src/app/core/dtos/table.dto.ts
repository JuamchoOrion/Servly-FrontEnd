/**
 * DTOs e Interfaces para el módulo de Mesas
 * Basado en la API real del backend
 */

export enum TableStatus {
  AVAILABLE = 'AVAILABLE',
  OCCUPIED = 'OCCUPIED',
  RESERVED = 'RESERVED',
  MAINTENANCE = 'MAINTENANCE'
}

export interface RestaurantTableDTO {
  id: number;
  table_number: number;
  capacity: number;
  status: TableStatus;
  location: string;
  created_at?: string;
  updated_at?: string;
}

export interface CreateRestaurantTableRequest {
  tableNumber: number;
  capacity: number;
  location: string;
}

export interface UpdateTableStatusRequest {
  status: TableStatus;
}

export interface MessageResponse {
  message: string;
}

export interface TableFormData {
  tableNumber: number | null;
  capacity: number | null;
  location: string;
}
