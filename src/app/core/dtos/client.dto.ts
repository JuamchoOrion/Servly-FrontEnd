// Session
export interface ClientSession {
  sessionToken: string;
  tableNumber: number;
  expiresIn: number;
  message: string;
}

// Menu Item
export interface MenuItem {
  id: number;
  name: string;
  basePrice?: number;
  price?: number;
  description: string;
  recipeItems?: RecipeItem[];
  category?: string;
}

export interface RecipeItem {
  id: number;
  itemId: number;
  itemName: string;
  baseQuantity: number;
  annotation: string | null;
  isOptional: boolean;
  minQuantity: number;
  maxQuantity: number;
}

// Order Request/Response
export interface OrderItem {
  id: number;
  quantity: number;
  notes?: string;
}

export interface OrderItemVariation {
  productId: number;
  quantity: number;
  itemQuantityOverrides?: { [itemId: number]: number };
}

export interface CreateOrderRequest {
  products: OrderItemVariation[];
}

export interface CreateClientOrderRequest {
  products: OrderItemVariation[];
}

export interface Order {
  id: number;
  tableNumber?: number;
  table_number?: number | null;
  status: 'PENDING' | 'IN_PREPARATION' | 'SERVED' | 'PAID';
  items: OrderItemResponse[];
  subtotal?: number;
  tax?: number;
  total: number;
  createdAt?: string;
  created_at?: string;
  orderType?: 'TABLE';
  order_type?: 'TABLE';
  estimatedTime?: string;
}

export interface OrderItemResponse {
  id: number;
  name?: string;
  item_name?: string;
  quantity: number;
  price?: number;
  unit_price?: number;
  notes?: string;
  subtotal?: number;
  tax_percent?: number;
  item_id?: number;
}

// Help Request
export interface HelpRequest {
  message: string;
}

export interface HelpResponse {
  success: boolean;
  message: string;
}

// Delivery Confirmation
export interface ConfirmDeliveryRequest {
  rating: number;
  feedback: string;
}

export interface ConfirmDeliveryResponse {
  success: boolean;
  message: string;
}

// Invoice
export interface Invoice {
  invoiceNumber: string;
  date: string;
  items: InvoiceItem[];
  subtotal: number;
  tax: number;
  total: number;
  pdfUrl: string;
}

export interface InvoiceItem {
  description: string;
  price: number;
}

export interface InvoiceRequest {
  orderIds: number[];
}

