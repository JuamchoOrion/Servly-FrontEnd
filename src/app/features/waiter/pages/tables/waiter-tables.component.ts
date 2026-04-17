import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { WaiterService } from '../../../../core/services/waiter.service';
import { Table } from '../../../../core/dtos/waiter.dto';
import { I18nService } from '../../../../core/services/i18n.service';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-waiter-tables',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './waiter-tables.component.html',
  styleUrls: ['./waiter-tables.component.scss']
})
export class WaiterTablesComponent implements OnInit, OnDestroy {
  tables: Table[] = [];
  isLoading = true;
  errorMessage: string | null = null;
  selectedTableNumber: number | null = null;

  private destroy$ = new Subject<void>();

  constructor(
    private waiterService: WaiterService,
    private router: Router,
    private authService: AuthService,
    public i18n: I18nService
  ) {}

  ngOnInit(): void {
    console.log('🔵 [WaiterTablesComponent] Inicializando componente');
    this.loadTables();
  }

  ngOnDestroy(): void {
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
          console.log('📊 Estructura de mesa:', JSON.stringify(tables[0], null, 2));
          console.log('📊 Campos disponibles:', Object.keys(tables[0] || {}));
          // Sortear por table_number o number
          this.tables = tables.sort((a, b) => {
            const aNum = a.table_number || a.number || 0;
            const bNum = b.table_number || b.number || 0;
            console.log(`Comparando ${aNum} vs ${bNum}`);
            return aNum - bNum;
          });
          console.log('🎯 Mesas después del sort:', this.tables.map(t => ({ num: t.table_number || t.number, status: t.status })));
          this.isLoading = false;
        },
        error: (error: any) => {
          console.error('❌ [WaiterTablesComponent] Error cargando mesas:', error);
          this.errorMessage = 'Error al cargar las mesas';
          this.isLoading = false;
        }
      });
  }

  selectTable(tableNumber: number): void {
    console.log('🔵 [WaiterTablesComponent] Seleccionando mesa:', tableNumber);
    console.log('📍 Navegando a:', ['/waiter/table-orders', tableNumber]);
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

  getStatusColor(status: string): string {
    switch (status) {
      case 'OCCUPIED': return 'status-occupied';
      case 'AVAILABLE': return 'status-available';
      case 'RESERVED': return 'status-reserved';
      case 'DIRTY': return 'status-dirty';
      default: return '';
    }
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'OCCUPIED': return 'people';
      case 'AVAILABLE': return 'check_circle';
      case 'RESERVED': return 'event_busy';
      case 'DIRTY': return 'cleaning_services';
      default: return 'help';
    }
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/auth/login']);
  }

  refreshTables(): void {
    this.isLoading = true;
    this.loadTables();
  }
}

