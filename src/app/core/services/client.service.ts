import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { environment } from '../../../enviroments/enviroment';
import {
  ClientSession,
  MenuItem,
  CreateClientOrderRequest,
  Order,
  HelpRequest,
  HelpResponse,
  ConfirmDeliveryRequest,
  ConfirmDeliveryResponse,
  Invoice,
  InvoiceRequest
} from '../dtos/client.dto';

@Injectable({
  providedIn: 'root'
})
export class ClientService {
  private apiUrl = `${environment.apiUrl}`;
  private sessionSubject = new BehaviorSubject<ClientSession | null>(null);
  private tableNumberSubject = new BehaviorSubject<number | null>(null);
  private sessionTokenSubject = new BehaviorSubject<string | null>(null);

  session$ = this.sessionSubject.asObservable();
  tableNumber$ = this.tableNumberSubject.asObservable();
  sessionToken$ = this.sessionTokenSubject.asObservable();

  constructor(private http: HttpClient) {
    this.loadSessionFromStorage();
  }

  /**
   * Inicia sesión para una mesa (escanea QR)
   */
  openSession(tableNumber: number): Observable<ClientSession> {
    console.log('🔵 [ClientService] Abriendo sesión para mesa:', tableNumber);
    console.log('🔵 [ClientService] Cookies antes de la sesión:', document.cookie);

    return this.http.get<ClientSession>(
      `${this.apiUrl}/api/client/session?table=${tableNumber}`,
      { withCredentials: true }
    ).pipe(
      tap(session => {
        console.log('✅ [ClientService] Sesión abierta:', session);
        console.log('✅ [ClientService] SessionToken recibido:', session.sessionToken);
        console.log('✅ [ClientService] Cookies después de la sesión:', document.cookie);

        // Guardar el sessionToken para usarlo en peticiones posteriores
        this.sessionTokenSubject.next(session.sessionToken);

        this.sessionSubject.next(session);
        this.tableNumberSubject.next(tableNumber);
        this.saveSessionToStorage(session);
      }),
      catchError(error => {
        console.error('❌ [ClientService] Error abriendo sesión:', error);
        throw error;
      })
    );
  }

  /**
   * Obtiene el menú disponible
   */
  getMenu(): Observable<MenuItem[]> {
    console.log('🔵 [ClientService] Cargando menú...');
    return this.http.get<MenuItem[]>(
      `${this.apiUrl}/api/menu/products?page=0&size=100`,
      { withCredentials: true }
    ).pipe(
      tap(items => {
        console.log('✅ [ClientService] Menú cargado:', items.length, 'productos');
      }),
      catchError(error => {
        console.error('❌ [ClientService] Error cargando menú:', error);
        throw error;
      })
    );
  }

  /**
   * Obtiene las categorías del menú
   */
  getMenuCategories(): Observable<any> {
    return this.http.get<any>(
      `${this.apiUrl}/api/menu/categories`,
      { withCredentials: true }
    ).pipe(
      catchError(error => {
        console.warn('⚠️ [ClientService] Error cargando categorías (no es crítico):', error);
        // Retornar array vacío para no romper el flujo
        return of({ data: [] });
      })
    );
  }

  /**
   * Detalle de un producto
   */
  getMenuItemDetail(itemId: number): Observable<MenuItem> {
    return this.http.get<MenuItem>(
      `${this.apiUrl}/api/menu/products/${itemId}`,
      { withCredentials: true }
    );
  }

  /**
   * Crea una nueva orden
   */
  createOrder(order: CreateClientOrderRequest): Observable<Order> {
    console.log('🔵 [ClientService] Creando orden...');
    console.log('🔵 [ClientService] Cookies al crear orden:', document.cookie);
    console.log('🔵 [ClientService] Payload:', order);

    return this.http.post<Order>(
      `${this.apiUrl}/api/client/orders`,
      order,
      { withCredentials: true }
    ).pipe(
      tap(createdOrder => {
        console.log('✅ [ClientService] Orden creada:', createdOrder);
      }),
      catchError(error => {
        console.error('❌ [ClientService] Error creando orden:', error);

        // Parsear errores del backend
        if (error.error?.message) {
          console.error('❌ [ClientService] Mensaje de error del backend:', error.error.message);
        }

        throw error;
      })
    );
  }

  /**
   * Obtiene las órdenes del cliente en la mesa actual
   */
  getOrders(): Observable<Order[]> {
    return this.http.get<Order[]>(
      `${this.apiUrl}/api/client/orders`,
      { withCredentials: true }
    );
  }

  /**
   * Obtiene el detalle de una orden
   */
  getOrderDetail(orderId: number): Observable<Order> {
    return this.http.get<Order>(
      `${this.apiUrl}/api/client/orders/${orderId}`,
      { withCredentials: true }
    );
  }

  /**
   * Solicita ayuda al mesero
   */
  requestHelp(orderId: number, message: string): Observable<HelpResponse> {
    return this.http.post<HelpResponse>(
      `${this.apiUrl}/api/client/orders/${orderId}/request-help`,
      { message } as HelpRequest,
      { withCredentials: true }
    );
  }

  /**
   * Confirma entrega y califica
   */
  confirmDelivery(orderId: number, rating: number, feedback: string): Observable<ConfirmDeliveryResponse> {
    return this.http.patch<ConfirmDeliveryResponse>(
      `${this.apiUrl}/api/client/orders/${orderId}/confirm-delivery`,
      { rating, feedback } as ConfirmDeliveryRequest,
      { withCredentials: true }
    );
  }

  /**
   * Solicita factura
   */
  requestInvoice(orderIds: number[]): Observable<Invoice> {
    return this.http.post<Invoice>(
      `${this.apiUrl}/api/staff/orders/invoice`,
      { orderIds } as InvoiceRequest,
      { withCredentials: true }
    );
  }

  /**
   * Obtiene sesión actual
   */
  getCurrentSession(): ClientSession | null {
    return this.sessionSubject.value;
  }

  /**
   * Obtiene número de mesa actual
   */
  getCurrentTable(): number | null {
    return this.tableNumberSubject.value;
  }

  /**
   * Obtiene el sessionToken actual
   */
  getSessionToken(): string | null {
    return this.sessionTokenSubject.value;
  }

  /**
   * Cierra sesión
   */
  closeSession(): void {
    this.sessionSubject.next(null);
    this.tableNumberSubject.next(null);
    this.sessionTokenSubject.next(null);
    localStorage.removeItem('clientSession');
    localStorage.removeItem('clientTableNumber');
    localStorage.removeItem('clientSessionToken');
  }

  /**
   * Guarda sesión en localStorage
   */
  private saveSessionToStorage(session: ClientSession): void {
    localStorage.setItem('clientSession', JSON.stringify(session));
    localStorage.setItem('clientTableNumber', session.tableNumber.toString());
    localStorage.setItem('clientSessionToken', session.sessionToken);
  }

  /**
   * Carga sesión desde localStorage
   */
  private loadSessionFromStorage(): void {
    const sessionStr = localStorage.getItem('clientSession');
    const sessionToken = localStorage.getItem('clientSessionToken');

    if (sessionStr && sessionToken) {
      try {
        const session = JSON.parse(sessionStr);
        this.sessionSubject.next(session);
        this.tableNumberSubject.next(session.tableNumber);
        this.sessionTokenSubject.next(sessionToken);
        console.log('✅ [ClientService] Sesión restaurada desde localStorage');
      } catch (error) {
        console.error('Error loading session from storage:', error);
      }
    }
  }
}

