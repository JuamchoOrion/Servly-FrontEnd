import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, of, throwError } from 'rxjs';
import { tap, catchError, timeout } from 'rxjs/operators';
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
  private sessionExpiresAt: number | null = null;
  private refreshInterval: any;

  session$ = this.sessionSubject.asObservable();
  tableNumber$ = this.tableNumberSubject.asObservable();
  sessionToken$ = this.sessionTokenSubject.asObservable();

  constructor(private http: HttpClient) {
    this.loadSessionFromStorage();
    this.startSessionMonitoring();
  }

  /**
   * Inicia sesión para una mesa (escanea QR)
   */
   openSession(tableNumber: number): Observable<ClientSession> {
     const url = `${this.apiUrl}/api/client/session?table=${tableNumber}`;
     console.log('🔵 [ClientService] INICIANDO: Abriendo sesión para mesa:', tableNumber);
     console.log('🔵 [ClientService] URL completa:', url);
     console.log('🔵 [ClientService] Environment API URL:', this.apiUrl);
     console.log('🔵 [ClientService] Cookies ANTES:', document.cookie || '(ninguna)');
     console.log('🔵 [ClientService] Enviando con withCredentials: true');

     return this.http.get<ClientSession>(
       url,
       { withCredentials: true }
     ).pipe(
       tap(session => {
         console.log('✅ [ClientService] ÉXITO: Sesión abierta completamente');
         console.log('✅ [ClientService] Response recibido:', session);
         console.log('✅ [ClientService] SessionToken:', session.sessionToken);
         console.log('✅ [ClientService] TableNumber:', session.tableNumber);

         // ✅ MANEJAR AMBOS FORMATOS DE EXPIRACIÓN
         let expiresAtMs: number | null = null;

         // Formato 1: Backend devuelve expiresAt ISO string (NUEVO)
         if (session.expiresAt) {
           try {
             const expiresDate = new Date(session.expiresAt);
             expiresAtMs = expiresDate.getTime();
             console.log('✅ [ClientService] ExpiresAt (ISO):', session.expiresAt);
             console.log('⏰ [ClientService] Sesión expirará en:', expiresDate.toLocaleTimeString());
           } catch (e) {
             console.error('❌ [ClientService] Error parsing expiresAt:', e);
           }
         }
         // Formato 2: Backend devuelve expiresIn en segundos (ANTIGUO)
         else if (session.expiresIn !== undefined && session.expiresIn > 0) {
           const expiresInMs = session.expiresIn * 1000;
           const now = Date.now();
           expiresAtMs = now + expiresInMs;
           console.log('✅ [ClientService] ExpiresIn DEL BACKEND:', session.expiresIn, 'segundos');

           // Validar si expiresIn tiene sentido
           const expectedExpiration = 4 * 60 * 60; // 4 horas = 14400 segundos
           if (session.expiresIn < expectedExpiration) {
             console.warn('⚠️  [ClientService] ⚠️  Atención: Backend devolvió expiresIn de', session.expiresIn, 'segundos');
             console.warn('⚠️  [ClientService] ⚠️  Esperado ~', expectedExpiration, 'segundos (4 horas)');
             console.warn('⚠️  [ClientService] ⚠️  Verificar configuración en backend');
           }
           console.log('⏰ [ClientService] Sesión expirará en:', new Date(expiresAtMs).toLocaleTimeString());
           console.log('⏰ [ClientService] Duración total: ' + this.formatDuration(session.expiresIn));
         } else {
           console.error('❌ [ClientService] ERROR: Backend no devolvió expiresAt ni expiresIn');
           console.error('❌ [ClientService] Response:', session);
         }

         console.log('✅ [ClientService] Cookies DESPUÉS:', document.cookie || '(ninguna)');

         // Guardar el tiempo de expiración
         if (expiresAtMs) {
           this.sessionExpiresAt = expiresAtMs;
         }

         // Guardar el sessionToken para usarlo en peticiones posteriores
         this.sessionTokenSubject.next(session.sessionToken);

         this.sessionSubject.next(session);
         this.tableNumberSubject.next(tableNumber);
         if (expiresAtMs) {
           this.saveSessionToStorage(session, expiresAtMs);
         }
       }),
       catchError(error => {
         console.error('❌ [ClientService] ERROR: Falló al abrir sesión');
         console.error('❌ [ClientService] Status:', error.status);
         console.error('❌ [ClientService] Status Text:', error.statusText);
         console.error('❌ [ClientService] Error Message:', error.error?.message);
         console.error('❌ [ClientService] Error completo:', error);
         console.error('❌ [ClientService] URL intentada:', url);
         throw error;
       })
     );
   }

    /**
     * Obtiene las categorías disponibles (SIN AUTENTICACIÓN - endpoint público)
     * GET /api/menu/categories
     */
    getCategories(): Observable<any[]> {
      console.log('🔵 [ClientService] Cargando categorías desde endpoint público...');
      return this.http.get<any[]>(
        `${this.apiUrl}/api/menu/categories`,
        { withCredentials: false }
      ).pipe(
        timeout(10000),
        tap(categories => {
          console.log('✅ [ClientService] Categorías cargadas:', categories.length, 'categorías');
        }),
        catchError(error => {
          console.error('❌ [ClientService] Error cargando categorías:', error);
          return of([]); // Retornar array vacío si falla
        })
      );
    }

    /**
     * Obtiene el menú disponible (SIN AUTENTICACIÓN - endpoint público)
     * GET /api/menu/products o /api/products/active?page=0&size=10
     */
    getMenu(): Observable<MenuItem[]> {
      console.log('🔵 [ClientService] Cargando menú desde endpoint público...');
      // Usar endpoint público sin autenticación
      return this.http.get<any>(
        `${this.apiUrl}/api/menu/products`,
        { withCredentials: false } // Sin credenciales para endpoint público
      ).pipe(
        timeout(10000), // Timeout de 10 segundos
        tap(response => {
          // Manejar tanto array directo como respuesta paginada
          const items = Array.isArray(response) ? response : (response.content || response.data || []);
          console.log('✅ [ClientService] Menú cargado:', items.length, 'productos');
        }),
        catchError(error => {
          console.error('❌ [ClientService] Error cargando menú:', error);
          throw error;
        })
      );
    }

   /**
    * Detalle de un producto (SIN AUTENTICACIÓN - endpoint público)
    * GET /api/menu/products/{id}
    */
  getMenuItemDetail(itemId: number): Observable<MenuItem> {
    return this.http.get<MenuItem>(
      `${this.apiUrl}/api/menu/products/${itemId}`,
      { withCredentials: false } // Sin credenciales para endpoint público
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
     // ✅ Validar si la sesión expiró
     if (this.isSessionExpired()) {
       console.log('❌ [ClientService] Sesión expirada, no se pueden obtener órdenes');
       this.closeSession();
       return throwError(() => new Error('Sesión expirada'));
     }

     const remainingSeconds = this.getSessionTimeRemaining();
     console.log('⏰ [ClientService] Sesión activa, tiempo restante:', remainingSeconds, 'segundos');

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
      console.log('🔵 [ClientService] Cerrando sesión...');
      this.sessionSubject.next(null);
      this.tableNumberSubject.next(null);
      this.sessionTokenSubject.next(null);
      this.sessionExpiresAt = null;
      this.stopSessionMonitoring();
      this.clearSessionStorage();
      console.log('✅ [ClientService] Sesión cerrada');
    }

    /**
     * Cierra sesión del cliente en el servidor (limpia cookie)
     * Se llamará cuando el cliente haga logout
     */
    closeSessionOnServer(): Observable<any> {
      console.log('🔵 [ClientService] Cerrando sesión en servidor...');
      return this.http.post<any>(
        `${this.apiUrl}/api/client/logout`,
        {},
        { withCredentials: true }
      ).pipe(
        tap(() => {
          console.log('✅ [ClientService] Sesión cerrada en servidor');
          // Limpiar también en cliente
          this.closeSession();
        }),
        catchError((error) => {
          console.error('❌ [ClientService] Error cerrando sesión en servidor:', error);
          // Incluso si el servidor falla, limpiar localmente
          this.closeSession();
          return of({ success: false });
        })
      );
    }

   /**
    * Guarda sesión en localStorage
    */
   private saveSessionToStorage(session: ClientSession, expiresAt: number): void {
     localStorage.setItem('clientSession', JSON.stringify(session));
     localStorage.setItem('clientTableNumber', session.tableNumber.toString());
     localStorage.setItem('clientSessionToken', session.sessionToken);
     localStorage.setItem('clientSessionExpiresAt', expiresAt.toString());
   }

   /**
    * Carga sesión desde localStorage
    */
   private loadSessionFromStorage(): void {
     const sessionStr = localStorage.getItem('clientSession');
     const sessionToken = localStorage.getItem('clientSessionToken');
     const expiresAtStr = localStorage.getItem('clientSessionExpiresAt');

     if (sessionStr && sessionToken && expiresAtStr) {
       try {
         const session = JSON.parse(sessionStr);
         const expiresAt = parseInt(expiresAtStr, 10);

         // ✅ Validar si la sesión aún es válida
         if (expiresAt > Date.now()) {
           this.sessionSubject.next(session);
           this.tableNumberSubject.next(session.tableNumber);
           this.sessionTokenSubject.next(sessionToken);
           this.sessionExpiresAt = expiresAt;
           console.log('✅ [ClientService] Sesión restaurada desde localStorage');
           console.log('⏰ [ClientService] Sesión expirará en:', new Date(expiresAt).toLocaleTimeString());
         } else {
           console.log('❌ [ClientService] Sesión expirada en localStorage, limpiando...');
           this.clearSessionStorage();
         }
       } catch (error) {
         console.error('Error loading session from storage:', error);
         this.clearSessionStorage();
       }
     }
   }

   /**
    * Verifica si la sesión actual ha expirado
    */
   private isSessionExpired(): boolean {
     if (!this.sessionExpiresAt) return true;
     const isExpired = Date.now() >= this.sessionExpiresAt;
     if (isExpired) {
       console.log('❌ [ClientService] Sesión expirada');
     }
     return isExpired;
   }

   /**
    * Obtiene el tiempo restante de sesión en segundos
    */
   getSessionTimeRemaining(): number {
     if (!this.sessionExpiresAt) return 0;
     const remaining = Math.max(0, (this.sessionExpiresAt - Date.now()) / 1000);
     return Math.floor(remaining);
   }

   /**
    * Inicia monitoreo de sesión (verifica cada 30 segundos)
    */
   private startSessionMonitoring(): void {
     this.refreshInterval = setInterval(() => {
       if (this.getCurrentSession() && this.isSessionExpired()) {
         console.log('⚠️  [ClientService] Sesión expirada, cerrando sesión');
         this.closeSession();
       }
     }, 30000); // Verificar cada 30 segundos
   }

   /**
    * Limpia el intervalo de monitoreo
    */
   private stopSessionMonitoring(): void {
     if (this.refreshInterval) {
       clearInterval(this.refreshInterval);
       this.refreshInterval = null;
     }
   }

    /**
     * Limpia la sesión del localStorage
     */
    private clearSessionStorage(): void {
      localStorage.removeItem('clientSession');
      localStorage.removeItem('clientTableNumber');
      localStorage.removeItem('clientSessionToken');
      localStorage.removeItem('clientSessionExpiresAt');
    }

    /**
     * Formatea duración en segundos a formato legible "Xh Ym"
     */
    private formatDuration(seconds: number): string {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);

      if (hours > 0) {
        return `${hours}h ${minutes}m`;
      }
      return `${minutes}m`;
    }
}

