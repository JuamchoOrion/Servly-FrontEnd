import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { environment } from '../../../enviroments/enviroment';
import { Table, TableSession, StaffOrder, UpdateOrderStatusRequest, UpdateOrderStatusResponse, Invoice, ConfirmPaymentRequest, ConfirmPaymentResponse, CloseSessionResponse } from '../dtos/waiter.dto';

@Injectable({ providedIn: 'root' })
export class WaiterService {
  private apiUrl = `${environment.apiUrl}`;

  constructor(private http: HttpClient) {}

  getTables(): Observable<Table[]> {
    console.log('🔵 [WaiterService] Obteniendo mesas...');
    return this.http.get<Table[]>(`${this.apiUrl}/api/staff/tables`, { withCredentials: true }).pipe(
      tap(tables => console.log('✅ Mesas obtenidas:', tables.length)),
      catchError(error => { console.error('❌ Error:', error); throw error; })
    );
  }

  getTableOrders(tableNumber: number): Observable<StaffOrder[]> {
    return this.http.get<StaffOrder[]>(`${this.apiUrl}/api/staff/tables/${tableNumber}/orders`, { withCredentials: true }).pipe(
      tap(orders => console.log('✅ Órdenes obtenidas:', orders.length)),
      catchError(error => { console.error('❌ Error:', error); throw error; })
    );
  }

  updateOrderStatus(orderId: number, status: string): Observable<UpdateOrderStatusResponse> {
    const request: UpdateOrderStatusRequest = { status: status as any };
    return this.http.post<UpdateOrderStatusResponse>(`${this.apiUrl}/api/staff/orders/${orderId}/status`, request, { withCredentials: true }).pipe(
      tap(response => console.log('✅ Orden actualizada:', response)),
      catchError(error => { console.error('❌ Error:', error); throw error; })
    );
  }

  getInvoice(orderId: number): Observable<Invoice> {
    return this.http.get<Invoice>(`${this.apiUrl}/api/staff/orders/${orderId}/invoice`, { withCredentials: true }).pipe(
      tap(invoice => console.log('✅ Factura:', invoice.invoiceNumber)),
      catchError(error => { console.error('❌ Error:', error); throw error; })
    );
  }

  confirmPayment(orderId: number, request: ConfirmPaymentRequest): Observable<ConfirmPaymentResponse> {
    return this.http.post<ConfirmPaymentResponse>(`${this.apiUrl}/api/staff/orders/${orderId}/confirm-payment`, request, { withCredentials: true }).pipe(
      tap(() => console.log('✅ Pago confirmado')),
      catchError(error => { console.error('❌ Error:', error); throw error; })
    );
  }

  getAllOrders(): Observable<StaffOrder[]> {
    return this.http.get<StaffOrder[]>(`${this.apiUrl}/api/staff/orders`, { withCredentials: true }).pipe(
      tap(orders => console.log('✅ Todas las órdenes obtenidas:', orders.length)),
      catchError(error => { console.error('❌ Error:', error); throw error; })
    );
  }

  closeTableSession(tableNumber: number): Observable<CloseSessionResponse> {
    return this.http.delete<CloseSessionResponse>(`${this.apiUrl}/api/staff/tables/${tableNumber}/session`, { withCredentials: true }).pipe(
      tap(() => console.log('✅ Sesión cerrada')),
      catchError(error => { console.error('❌ Error:', error); throw error; })
    );
  }
}
