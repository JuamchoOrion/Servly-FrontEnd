import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef, Pipe, PipeTransform } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { WaiterService } from '../../../../core/services/waiter.service';
import { Table } from '../../../../core/dtos/waiter.dto';
import { I18nService } from '../../../../core/services/i18n.service';
import { AuthService } from '../../../../core/services/auth.service';

// ── Pipe para filtrar mesas por estado ─────────────────────────────────────
@Pipe({
  name: 'filter',
  standalone: true
})
export class FilterPipe implements PipeTransform {
  transform(tables: Table[], status: string): Table[] {
    if (!tables) return [];
    return tables.filter(table => table.status === status);
  }
}

@Component({
  selector: 'app-waiter-tables',
  standalone: true,
  imports: [CommonModule, FilterPipe],
  templateUrl: './waiter-tables.component.html',
  styleUrls: ['./waiter-tables.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class WaiterTablesComponent implements OnInit, OnDestroy {
  tables: Table[] = [];
  isLoading = true;
  errorMessage: string | null = null;
  selectedTableNumber: number | null = null;

  // Estadísticas
  occupiedCount = 0;
  availableCount = 0;
  reservedCount = 0;
  dirtyCount = 0;

  private destroy$ = new Subject<void>();
  private refreshInterval: number | null = null;

  constructor(
    private waiterService: WaiterService,
    private router: Router,
    private authService: AuthService,
    private cdr: ChangeDetectorRef,
    public i18n: I18nService
  ) {}

  ngOnInit(): void {
    console.log('🔵 [WaiterTablesComponent] Inicializando componente');
    this.loadTables();

    // Recargar mesas cada 10 segundos
    this.refreshInterval = window.setInterval(() => {
      this.loadTables();
    }, 10000);
  }

  ngOnDestroy(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadTables(): void {
    console.log('🔵 [WaiterTablesComponent] Cargando mesas...');
    this.waiterService.getTables()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (tables: Table[]) => {
          console.log('✅ [WaiterTablesComponent] Mesas cargadas:', tables.length);

          // Ordenar por número de mesa
          this.tables = tables.sort((a, b) => {
            const aNum = a.table_number || a.number || 0;
            const bNum = b.table_number || b.number || 0;
            return aNum - bNum;
          });

          // Calcular estadísticas
          this.updateStatistics();

          this.isLoading = false;
          this.errorMessage = null;
          this.cdr.markForCheck();
        },
        error: (error: any) => {
          console.error('❌ [WaiterTablesComponent] Error cargando mesas:', error);
          this.errorMessage = this.i18n.translate('waiter.errors.loadFailed') || 'Error al cargar las mesas';
          this.isLoading = false;
          this.cdr.markForCheck();
        }
      });
  }

  /**
   * Calcula las estadísticas de mesas por estado
   */
  private updateStatistics(): void {
    this.occupiedCount = this.tables.filter(t => t.status === 'OCCUPIED').length;
    this.availableCount = this.tables.filter(t => t.status === 'AVAILABLE').length;
    this.reservedCount = this.tables.filter(t => t.status === 'RESERVED').length;
    this.dirtyCount = this.tables.filter(t => t.status === 'DIRTY').length;
  }

  /**
   * Selecciona una mesa y navega a los detalles
   */
  selectTable(tableNumber: number): void {
    console.log('🔵 [WaiterTablesComponent] Seleccionando mesa:', tableNumber);
    this.selectedTableNumber = tableNumber;
    this.router.navigate(['/waiter/table-orders', tableNumber]).then(
      success => {
        console.log('✅ Navegación exitosa:', success);
      },
      error => {
        console.error('❌ Error en navegación:', error);
      }
    );
  }

  /**
   * Obtiene el color/clase del estado
   */
  getStatusColor(status: string): string {
    switch (status) {
      case 'OCCUPIED': return 'status-occupied';
      case 'AVAILABLE': return 'status-available';
      case 'RESERVED': return 'status-reserved';
      case 'DIRTY': return 'status-dirty';
      default: return '';
    }
  }

  /**
   * Obtiene el icono Material para el estado
   */
  getStatusIcon(status: string): string {
    switch (status) {
      case 'OCCUPIED': return 'people';
      case 'AVAILABLE': return 'check_circle';
      case 'RESERVED': return 'event_busy';
      case 'DIRTY': return 'cleaning_services';
      default: return 'help';
    }
  }

  /**
   * Cierra sesión del usuario
   */
  logout(): void {
    console.log('🔵 [WaiterTablesComponent] Cerrando sesión...');
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  /**
   * Recarga manualmente las mesas
   */
  refreshTables(): void {
    console.log('🔵 [WaiterTablesComponent] Recargando mesas manualmente...');
    this.isLoading = true;
    this.cdr.markForCheck();
    this.loadTables();
  }
}

