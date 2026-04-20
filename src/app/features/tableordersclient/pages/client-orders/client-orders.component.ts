import { Component, OnInit, OnDestroy, NgZone, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subject, interval } from 'rxjs';
import { takeUntil, startWith, switchMap } from 'rxjs/operators';
import { ClientService } from '../../../../core/services/client.service';
import { Order } from '../../../../core/dtos/client.dto';
import { I18nService } from '../../../../core/services/i18n.service';
import { AccessibilityMenuComponent } from '../../../../shared/components/accessibility-menu/accessibility-menu.component';
import { ClientNavbarComponent } from '../../../../shared/components/client-navbar/client-navbar.component';
import { FooterComponent } from '../../../../shared/components/footer/footer.component';

@Component({
  selector: 'app-client-orders',
  standalone: true,
  imports: [CommonModule, AccessibilityMenuComponent, ClientNavbarComponent, FooterComponent],
  templateUrl: './client-orders.component.html',
  styleUrls: ['./client-orders.component.scss']
})
export class ClientOrdersComponent implements OnInit, OnDestroy {
  orders: Order[] = [];
  isLoading = true;
  errorMessage: string | null = null;
  tableNumber: number | null = null;
  selectedOrder: Order | null = null;

  private destroy$ = new Subject<void>();

   constructor(
     private clientService: ClientService,
     private router: Router,
     public i18n: I18nService,
     private ngZone: NgZone,
     private cdr: ChangeDetectorRef
   ) {}

  ngOnInit(): void {
    console.log('🔵 [ClientOrdersComponent] Inicializando componente');

    if (!this.clientService.getCurrentSession()) {
      console.log('❌ [ClientOrdersComponent] Sin sesión, redirigiendo a /client');
      this.router.navigate(['/client']);
      return;
    }

    this.tableNumber = this.clientService.getCurrentTable();
    console.log('🔵 [ClientOrdersComponent] Número de mesa:', this.tableNumber);

    // Cargar órdenes inmediatamente y luego cada 10 segundos
    interval(10000)
      .pipe(
        startWith(0), // Disparar inmediatamente (0)
        switchMap(() => {
          console.log('🔵 [ClientOrdersComponent] Cargando órdenes...');
          return this.clientService.getOrders();
        }),
        takeUntil(this.destroy$)
      )
        .subscribe({
          next: (orders: Order[]) => {
            this.ngZone.run(() => {
              console.log('✅ [ClientOrdersComponent] Órdenes cargadas:', orders.length, orders);
              this.orders = orders;
              this.isLoading = false;

              // ✅ Seleccionar automáticamente la última orden
              if (orders.length > 0) {
                this.selectedOrder = orders[0]; // Primera orden es la más reciente
              }

              this.cdr.detectChanges(); // ✅ Forzar detección de cambios
            });
          },
         error: (error: any) => {
           this.ngZone.run(() => {
             console.error('❌ [ClientOrdersComponent] Error cargando órdenes:', error);
             this.errorMessage = 'Error al cargar las órdenes';
             this.isLoading = false;
             this.cdr.detectChanges(); // ✅ Forzar detección de cambios
           });
         }
       });
  }

  ngOnDestroy(): void {
    console.log('🔵 [ClientOrdersComponent] Destruyendo componente');
    this.destroy$.next();
    this.destroy$.complete();
  }

  selectOrder(order: Order): void {
    this.selectedOrder = this.selectedOrder?.id === order.id ? null : order;
  }

  requestHelp(orderId: number): void {
    const message = prompt(this.i18n.translate('client.orders.helpMessage'));
    if (message) {
      this.clientService.requestHelp(orderId, message)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            alert(this.i18n.translate('client.orders.helpSent'));
          },
          error: (error: any) => {
            alert(this.i18n.translate('client.errors.helpFailed'));
          }
        });
    }
  }

  confirmDelivery(orderId: number): void {
    const rating = prompt(this.i18n.translate('client.orders.rateOrder'), '5');
    if (rating) {
      const feedback = prompt(this.i18n.translate('client.orders.feedback'), '');
      this.clientService.confirmDelivery(orderId, parseInt(rating), feedback || '')
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            console.log('✅ Entrega confirmada');
          },
          error: (error: any) => {
            alert(this.i18n.translate('client.errors.confirmFailed'));
          }
        });
    }
  }

  requestInvoice(orderIds: number[]): void {
    this.clientService.requestInvoice(orderIds)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (invoice) => {
          window.open(invoice.pdfUrl, '_blank');
        },
        error: (error: any) => {
          alert(this.i18n.translate('client.errors.invoiceFailed'));
        }
      });
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'PENDING':
        return 'status-pending';
      case 'IN_PREPARATION':
        return 'status-preparing';
      case 'SERVED':
        return 'status-served';
      case 'PAID':
        return 'status-paid';
      default:
        return '';
    }
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'PENDING':
        return 'schedule';
      case 'IN_PREPARATION':
        return 'local_dining';
      case 'SERVED':
        return 'done';
      case 'PAID':
        return 'check_circle';
      default:
        return 'help';
    }
  }

  backToMenu(): void {
    this.router.navigate(['/client/menu']);
  }

   logout(): void {
     console.log('🔵 [ClientOrdersComponent] Cerrando sesión...');
     this.clientService.closeSessionOnServer()
       .pipe(takeUntil(this.destroy$))
       .subscribe({
         next: () => {
           this.ngZone.run(() => {
             console.log('✅ [ClientOrdersComponent] Sesión cerrada');
             this.router.navigate(['/client']);
           });
         },
         error: (error: any) => {
           this.ngZone.run(() => {
             console.error('❌ [ClientOrdersComponent] Error al cerrar sesión:', error);
             // Redirigir de todas formas
             this.router.navigate(['/client']);
           });
         }
       });
   }

  getOrderDate(order: Order): string {
    const dateStr = order.createdAt || order.created_at;
    if (!dateStr) return 'N/A';
    try {
      const date = new Date(dateStr);
      // Mostrar solo el día del mes (ej: "19")
      return date.getDate().toString();
    } catch (e) {
      return dateStr;
    }
  }

  getOrderTime(order: Order): string {
    const dateStr = order.createdAt || order.created_at;
    if (!dateStr) return 'N/A';
    try {
      const date = new Date(dateStr);
      // Formato: "14:30" (24 horas) o "2:30 PM" (12 horas)
      return date.toLocaleTimeString('es-CO', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false  // ✅ Usa formato 24 horas (14:30 en lugar de 2:30 PM)
      });
    } catch (e) {
      return dateStr;
    }
  }

   /**
    * Obtiene solo la ÚLTIMA orden ACTIVA (excluyendo PAID)
    * Retorna un array con 1 elemento (la orden más reciente por ID)
    */
   getActiveOrders(): Order[] {
     const activeOrders = this.orders.filter(order => order.status !== 'PAID');
     if (activeOrders.length === 0) return [];

     // Obtener la orden con mayor ID (la más reciente)
     const latestOrder = activeOrders.reduce((max, order) =>
       order.id > max.id ? order : max
     );

     return [latestOrder];
   }

  /**
   * Obtiene solo las órdenes PAGADAS
   */
  getPaidOrders(): Order[] {
    return this.orders.filter(order => order.status === 'PAID');
  }

  getSubtotal(order: Order): number {
    if (order.subtotal) return order.subtotal;
    // Si no hay subtotal, calcular como total / 1.08 (8% es el impuesto)
    return order.total / 1.08;
  }

  getTax(order: Order): number {
    if (order.tax) return order.tax;
    // Si no hay tax, calcular como diferencia
    return order.total - this.getSubtotal(order);
  }

  getItemPrice(item: any): number {
    if (item.subtotal) return item.subtotal;
    const price = item.unit_price || item.price || 0;
    return (price * (item.quantity || 0));
  }
}
