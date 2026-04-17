// Waiter/Staff DTOs

// Table
export interface Table {
  id: number;
  table_number: number;
  number?: number;
  capacity: number;
  status: 'OCCUPIED' | 'AVAILABLE' | 'RESERVED' | 'DIRTY';
  location?: string;
  activeOrders?: number;
  totalBill?: number;
  created_at?: string;
  updated_at?: string;
}

export interface TableSession {
  isActive: boolean;
  tableNumber: number;
  activeSince: string;
}

// Order (Staff View)
export interface StaffOrder {
  id: number;
  status: 'PENDING' | 'IN_PREPARATION' | 'SERVED' | 'PAID';
  items: StaffOrderItem[];
  total: number;
  createdAt: string;
  created_at?: string;
}

export interface StaffOrderItem {
  id?: number;
  name?: string;
  quantity: number;
  notes?: string;
  price?: number;
  unit_price?: number;
  subtotal?: number;
  item_id?: number;
  item_name?: string;
  tax_percent?: number;
}

// Status Update
export interface UpdateOrderStatusRequest {
  status: 'PENDING' | 'IN_PREPARATION' | 'SERVED' | 'PAID';
}

export interface UpdateOrderStatusResponse {
  success: boolean;
  orderId: number;
  newStatus: string;
  message: string;
}

// Invoice
export interface Invoice {
  invoiceNumber?: string;
  tableNumber?: number;
  table_number?: number;
  date?: string;
  created_at?: string;
  items?: InvoiceItem[];
  subtotal?: number;
  tax?: number;
  total: number;
  pdfUrl?: string;
  // Campos que devuelve el backend
  id?: number;
  status?: string;
  order_type?: string;
}

export interface InvoiceItem {
  orderId?: number;
  order_id?: number;
  description?: string;
  price?: number;
  // Campos que devuelve el backend para items
  id?: number;
  quantity?: number;
  subtotal?: number;
  item_id?: number;
  item_name?: string;
  unit_price?: number;
  tax_percent?: number;
}

// Payment
export interface ConfirmPaymentRequest {
  paymentMethod: 'CASH' | 'CARD' | 'QR_PAYMENT';
  amount: number;
  tip?: number;
}

export interface ConfirmPaymentResponse {
  success: boolean;
  orderId: number;
  status: string;
  totalPaid: number;
  message: string;
}

// Session Close
export interface CloseSessionResponse {
  success: boolean;
  message: string;
  tableNumber: number;
}

