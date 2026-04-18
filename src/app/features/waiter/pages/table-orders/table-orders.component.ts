import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { WaiterService } from '../../../../core/services/waiter.service';
import { StaffOrder, UpdateOrderStatusResponse, ConfirmPaymentRequest } from '../../../../core/dtos/waiter.dto';
import { I18nService } from '../../../../core/services/i18n.service';

@Component({
  selector: 'app-table-orders',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './table-orders.component.html',
  styleUrls: ['./table-orders.component.scss']
})
export class TableOrdersComponent implements OnInit, OnDestroy {
  tableNumber: number | null = null;
  orders: StaffOrder[] = [];
  filteredOrders: StaffOrder[] = [];
  isLoading = true;
  errorMessage: string | null = null;
  selectedOrder: StaffOrder | null = null;
  isProcessing = false;
  paymentMethod: 'CASH' | 'CARD' | 'QR_PAYMENT' = 'CASH';
  paymentAmount: number = 0;
  tip: number = 0;
  moneyReceived: number = 0;
  change: number = 0;
  ordersToPayIds: Set<number> = new Set();
  selectedStatusFilter: string = 'ALL';
  showPaidOrders = false;

  private destroy$ = new Subject<void>();

  constructor(
    private waiterService: WaiterService,
    private route: ActivatedRoute,
    private router: Router,
    public i18n: I18nService
  ) {}

  ngOnInit(): void {
    this.route.params.pipe(takeUntil(this.destroy$)).subscribe(params => {
      this.tableNumber = parseInt(params['tableNumber'], 10);
      console.log('🔵 [TableOrdersComponent] Cargando órdenes de mesa:', this.tableNumber);
      this.loadOrders();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

   private loadOrders(): void {
     if (!this.tableNumber) return;

     this.waiterService.getTableOrders(this.tableNumber)
       .pipe(takeUntil(this.destroy$))
       .subscribe({
         next: (orders: StaffOrder[]) => {
           console.log('✅ Órdenes cargadas:', orders.length);
           // Priorizar: PENDING > IN_PREPARATION > SERVED > PAID
           this.orders = orders.sort((a, b) => {
             const priorityOrder = { 'PENDING': 0, 'IN_PREPARATION': 1, 'SERVED': 2, 'PAID': 3 };
             const priorityA = priorityOrder[a.status as keyof typeof priorityOrder] ?? 99;
             const priorityB = priorityOrder[b.status as keyof typeof priorityOrder] ?? 99;
             return priorityA - priorityB;
           });
           this.applyFilters();
           this.isLoading = false;
           if (orders.length > 0) {
             this.paymentAmount = this.getPayableOrders().reduce((sum, o) => sum + o.total, 0);
           }
         },
         error: (error: any) => {
           console.error('❌ Error cargando órdenes:', error);
           this.errorMessage = 'Error al cargar las órdenes';
           this.isLoading = false;
         }
       });
   }

   /**
    * Recarga las órdenes (público para el template)
    */
   public refreshOrders(): void {
     this.isLoading = true;
     this.loadOrders();
   }

  applyFilters(): void {
    if (this.selectedStatusFilter === 'ALL') {
      this.filteredOrders = [...this.orders];
    } else {
      this.filteredOrders = this.orders.filter(order => order.status === this.selectedStatusFilter);
    }
  }

  getActiveOrders(): StaffOrder[] {
    return this.filteredOrders.filter(o => o.status !== 'PAID');
  }

  getPaidOrders(): StaffOrder[] {
    return this.orders.filter(o => o.status === 'PAID');
  }

  getPaidOrdersCount(): number {
    return this.orders.filter(o => o.status === 'PAID').length;
  }

  hasActiveOrders(): boolean {
    return this.filteredOrders.filter(o => o.status !== 'PAID').length > 0;
  }

  hasNoFilteredActiveOrders(): boolean {
    return this.orders.length > 0 && this.filteredOrders.filter(o => o.status !== 'PAID').length === 0 && this.selectedStatusFilter !== 'PAID';
  }  onStatusFilterChange(): void {
    this.applyFilters();
  }

   selectOrder(order: StaffOrder): void {
     this.selectedOrder = this.selectedOrder?.id === order.id ? null : order;
   }

   updateOrderStatus(orderOrId: StaffOrder | number, newStatus?: string): void {
     // Sobrecarga: puede ser updateOrderStatus(order) o updateOrderStatus(orderId, newStatus)
     let orderId: number;
     let statusToUpdate: string;

     if (typeof orderOrId === 'object') {
       // Caso 1: updateOrderStatus(order) - desde select directo
       orderId = orderOrId.id;
       statusToUpdate = orderOrId.status;
     } else {
       // Caso 2: updateOrderStatus(orderId, newStatus)
       orderId = orderOrId;
       statusToUpdate = newStatus || '';
     }

     if (this.isProcessing || !statusToUpdate) return;
     this.isProcessing = true;

     this.waiterService.updateOrderStatus(orderId, statusToUpdate)
       .pipe(takeUntil(this.destroy$))
       .subscribe({
         next: (response: UpdateOrderStatusResponse) => {
           console.log('✅ Estado actualizado:', response);
           this.loadOrders();
           this.isProcessing = false;
         },
         error: (error: any) => {
           console.error('❌ Error:', error);
           alert('Error al actualizar el estado');
           this.isProcessing = false;
         }
       });
   }

  confirmPayment(): void {
    if (this.isProcessing || this.ordersToPayIds.size === 0) return;
    this.isProcessing = true;

    // En CASH, usar moneyReceived; en otros métodos, usar tip
    const tipAmount = this.paymentMethod === 'CASH' ? 0 : this.tip;

    const paymentRequest: ConfirmPaymentRequest = {
      paymentMethod: this.paymentMethod,
      amount: this.paymentAmount,
      tip: tipAmount
    };

    // Confirmar pago para cada orden seleccionada
    const orderIds = Array.from(this.ordersToPayIds);
    let processed = 0;

    orderIds.forEach(orderId => {
      this.waiterService.confirmPayment(orderId, paymentRequest)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            processed++;
            if (processed === orderIds.length) {
              // Mostrar cambio si es CASH
              if (this.paymentMethod === 'CASH') {
                alert(`Pago confirmado. Cambio a entregar: $${this.change.toFixed(2)}`);
              } else {
                alert('Pago confirmado');
              }
              this.ordersToPayIds.clear();
              this.paymentAmount = 0;
              this.tip = 0;
              this.moneyReceived = 0;
              this.change = 0;
              this.loadOrders();
              this.isProcessing = false;
            }
          },
          error: (error: any) => {
            console.error('❌ Error:', error);
            alert('Error al confirmar el pago');
            this.isProcessing = false;
          }
        });
    });
  }

  generateInvoice(orderIds: number[]): void {
    if (!orderIds || orderIds.length === 0) return;

    const orderId = orderIds[0];
    this.waiterService.getInvoice(orderId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (invoice: any) => {
          console.log('✅ Factura obtenida:', invoice);

          // Si el backend devuelve un pdfUrl, descargarlo
          if (invoice.pdfUrl) {
            window.open(invoice.pdfUrl, '_blank');
          } else {
            // Si no, generar un PDF cliente-side con los datos de la orden
            this.generateClientSidePDF(invoice);
          }
        },
        error: (error: any) => {
          console.error('❌ Error al generar factura:', error);
          alert(this.i18n.translate('waiter.orders.invoiceError') || 'Error al generar la factura');
        }
      });
  }

  private generateClientSidePDF(invoice: any): void {
    // Generar un PDF simple con los datos de la orden
    const doc = `
      <html>
        <head>
          <title>Factura #${invoice.id}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1 { color: #667eea; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { padding: 10px; border: 1px solid #ddd; text-align: left; }
            th { background: #f5f5f5; }
            .total { font-weight: bold; font-size: 18px; }
          </style>
        </head>
        <body>
          <h1>Factura #${invoice.id}</h1>
          <p><strong>Mesa:</strong> ${invoice.table_number || this.tableNumber}</p>
          <p><strong>Fecha:</strong> ${new Date(invoice.created_at).toLocaleString('es-ES')}</p>
          <p><strong>Estado:</strong> ${invoice.status}</p>

          <h2>Detalles de la Orden</h2>
          <table>
            <thead>
              <tr>
                <th>Producto</th>
                <th>Cantidad</th>
                <th>Precio Unitario</th>
                <th>Subtotal</th>
              </tr>
            </thead>
            <tbody>
              ${invoice.items?.map((item: any) => `
                <tr>
                  <td>${item.item_name}</td>
                  <td>${item.quantity}</td>
                  <td>$${(item.unit_price || 0).toFixed(2)}</td>
                  <td>$${(item.subtotal || 0).toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div style="text-align: right; margin-top: 20px;">
            <p><strong>Total:</strong> <span class="total">$${(invoice.total || 0).toFixed(2)}</span></p>
          </div>

          <footer style="margin-top: 40px; text-align: center; color: #999; font-size: 12px;">
            <p>Gracias por su compra - SERVLY</p>
          </footer>
        </body>
      </html>
    `;

    // Abrir en nueva ventana para imprimir
    const printWindow = window.open('', '', 'height=600,width=800');
    if (printWindow) {
      printWindow.document.write(doc);
      printWindow.document.close();
      printWindow.print();
    }
  }

  closeTable(): void {
    if (!this.tableNumber) return;
    if (confirm('¿Seguro que deseas cerrar esta mesa?')) {
      this.waiterService.closeTableSession(this.tableNumber)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            console.log('✅ Mesa cerrada');
            this.router.navigate(['/waiter/tables']);
          },
          error: (error: any) => {
            alert('Error al cerrar la mesa');
          }
        });
    }
  }

  backToTables(): void {
    this.router.navigate(['/waiter/tables']);
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'PENDING': return 'status-pending';
      case 'IN_PREPARATION': return 'status-preparing';
      case 'SERVED': return 'status-served';
      case 'PAID': return 'status-paid';
      default: return '';
    }
  }

   getStatusIcon(status: string): string {
     switch (status) {
       case 'PENDING': return 'schedule';
       case 'IN_PREPARATION': return 'local_dining';
       case 'SERVED': return 'done';
       case 'PAID': return 'check_circle';
       default: return 'help';
     }
   }

   /**
    * Obtiene el label del estado
    */
   getStatusLabel(status: string): string {
     const labels: { [key: string]: string } = {
       'PENDING': 'Pendiente',
       'IN_PREPARATION': 'En Preparación',
       'SERVED': 'Servido',
       'PAID': 'Pagado'
     };
     return labels[status] || status;
   }

   /**
    * Obtiene la hora formateada de la orden
    */
   getOrderTime(order: any): string {
     const dateStr = order.createdAt || order.created_at;
     if (!dateStr) return 'N/A';
     try {
       return new Date(dateStr).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
     } catch (e) {
       return dateStr;
     }
   }

   /**
    * Calcula subtotal de una orden
    */
   getOrderSubtotal(order: any): number {
     if (order.subtotal) return order.subtotal;
     return order.total / 1.08;
   }

   /**
    * Calcula impuesto de una orden
    */
   getOrderTax(order: any): number {
     if (order.tax) return order.tax;
     return order.total - this.getOrderSubtotal(order);
   }

   /**
    * Obtiene total de todas las órdenes
    */
   getTotalBill(): number {
     return this.orders.reduce((sum, order) => sum + order.total, 0);
   }

   /**
    * Obtiene total de órdenes seleccionadas para pago
    */
   getSelectedOrdersTotal(): number {
     return this.orders
       .filter(order => this.ordersToPayIds.has(order.id))
       .reduce((sum, order) => sum + order.total, 0);
   }

   /**
    * Marca una orden para pago
    */
   markOrderForPayment(orderId: number): void {
     this.toggleOrderForPayment(orderId);
   }

   /**
    * Verifica si se puede confirmar el pago
    */
   canConfirmPayment(): boolean {
     if (this.paymentMethod === 'CASH') {
       return this.moneyReceived >= this.paymentAmount;
     }
     return this.paymentAmount > 0;
   }

  getNextStatus(currentStatus: string): string | null {
    switch (currentStatus) {
      case 'PENDING': return 'IN_PREPARATION';
      case 'IN_PREPARATION': return 'SERVED';
      case 'SERVED': return 'PAID';
      default: return null;
    }
  }

  canUpdateStatus(status: string): boolean {
    return status !== 'PAID';
  }

  getAvailableNextStatuses(currentStatus: string): { value: string; label: string }[] {
    const transitions: { [key: string]: string[] } = {
      'PENDING': ['IN_PREPARATION', 'CANCELLED'],
      'IN_PREPARATION': ['SERVED', 'CANCELLED'],
      'SERVED': ['PAID', 'CANCELLED'],
      'PAID': ['CANCELLED'],
      'CANCELLED': []
    };

    const nextStatuses = transitions[currentStatus] || [];
    return nextStatuses.map(status => ({
      value: status,
      label: `waiter.status.${status}`
    }));
  }

  getItemPrice(item: any): number {
    if (item.subtotal) return item.subtotal;
    const price = item.price || item.unit_price || 0;
    return (price * item.quantity);
  }

  toggleOrderForPayment(orderId: number): void {
    if (this.ordersToPayIds.has(orderId)) {
      this.ordersToPayIds.delete(orderId);
    } else {
      this.ordersToPayIds.add(orderId);
    }
    this.updatePaymentAmount();
  }

  isOrderSelectedForPayment(orderId: number): boolean {
    return this.ordersToPayIds.has(orderId);
  }

  updatePaymentAmount(): void {
    this.paymentAmount = this.orders
      .filter(order => this.ordersToPayIds.has(order.id))
      .reduce((sum, order) => sum + order.total, 0);
  }

  getPayableOrders(): StaffOrder[] {
    return this.orders.filter(order => order.status !== 'PAID');
  }

  selectAllForPayment(): void {
    this.getPayableOrders().forEach(order => {
      this.ordersToPayIds.add(order.id);
    });
    this.updatePaymentAmount();
  }

  deselectAllForPayment(): void {
    this.ordersToPayIds.clear();
    this.updatePaymentAmount();
  }

  calculateChange(): void {
    if (this.paymentMethod === 'CASH') {
      this.change = Math.max(0, this.moneyReceived - this.paymentAmount);
    }
  }

  togglePaidOrdersSection(): void {
    this.showPaidOrders = !this.showPaidOrders;
  }
}
