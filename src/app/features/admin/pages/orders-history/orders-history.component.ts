import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { WaiterService } from '../../../../core/services/waiter.service';
import { StaffOrder } from '../../../../core/dtos/waiter.dto';
import { I18nService } from '../../../../core/services/i18n.service';

@Component({
  selector: 'app-orders-history',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './orders-history.component.html',
  styleUrls: ['./orders-history.component.scss']
})
export class OrdersHistoryComponent implements OnInit, OnDestroy {
  allOrders: StaffOrder[] = [];
  filteredOrders: StaffOrder[] = [];
  isLoading = true;
  errorMessage: string | null = null;

  // Filtros
  statusFilter: string = '';
  dateFilter: string = '';
  searchQuery: string = '';

  // Paginación
  currentPage = 1;
  pageSize = 10;
  totalOrders = 0;

  // Exponer Math para usar en template
  Math = Math;

  private destroy$ = new Subject<void>();

  constructor(
    private waiterService: WaiterService,
    public i18n: I18nService
  ) {}

  ngOnInit(): void {
    this.loadAllOrders();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadAllOrders(): void {
    this.isLoading = true;
    // Nota: Si no existe endpoint para obtener todas las órdenes, se puede hacer
    // una llamada manual o usar el que sea disponible
    this.waiterService.getAllOrders?.()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (orders: StaffOrder[]) => {
          console.log('✅ Todas las órdenes cargadas:', orders.length);
          this.allOrders = orders;
          this.applyFilters();
          this.isLoading = false;
        },
        error: (error: any) => {
          console.error('❌ Error cargando órdenes:', error);
          this.errorMessage = 'Error al cargar el historial de órdenes';
          this.isLoading = false;
        }
      });
  }

  applyFilters(): void {
    let filtered = this.allOrders;

    // Filtrar por estado
    if (this.statusFilter) {
      filtered = filtered.filter(order => order.status === this.statusFilter);
    }

    // Filtrar por búsqueda
    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(order =>
        order.id.toString().includes(query)
      );
    }

    // Filtrar por fecha
    if (this.dateFilter) {
      filtered = filtered.filter(order => {
        const orderDate = new Date(order.createdAt || order.created_at || '').toDateString();
        return orderDate === new Date(this.dateFilter).toDateString();
      });
    }

    this.filteredOrders = filtered;
    this.totalOrders = filtered.length;
    this.currentPage = 1;
  }

  getPaginatedOrders(): StaffOrder[] {
    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;
    return this.filteredOrders.slice(start, end);
  }

  getTotalPages(): number {
    return Math.ceil(this.filteredOrders.length / this.pageSize);
  }

  goToPage(page: number): void {
    const totalPages = this.getTotalPages();
    if (page >= 1 && page <= totalPages) {
      this.currentPage = page;
    }
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

  getOrderDate(order: StaffOrder): string {
    const date = new Date(order.createdAt || order.created_at || '');
    return date.toLocaleDateString('es-ES');
  }

  getOrderTime(order: StaffOrder): string {
    const date = new Date(order.createdAt || order.created_at || '');
    return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  }

  getOrderItemsCount(order: StaffOrder): number {
    return order.items?.length || 0;
  }

  exportToCSV(): void {
    let csv = 'ID,Estado,Fecha,Hora,Cantidad de Ítems,Total\n';
    this.filteredOrders.forEach(order => {
      csv += `${order.id},"${order.status}","${this.getOrderDate(order)}","${this.getOrderTime(order)}",${this.getOrderItemsCount(order)},"$${order.total?.toFixed(2)}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ordenes-historial-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  resetFilters(): void {
    this.statusFilter = '';
    this.dateFilter = '';
    this.searchQuery = '';
    this.applyFilters();
  }
}

