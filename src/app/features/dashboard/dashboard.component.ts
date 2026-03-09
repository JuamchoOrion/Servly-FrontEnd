import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AuthService } from '../../core/services/auth.service';
import { DashboardService, DashboardStats } from '../../core/services/dashboard.service';
import { StockBatch, StockBatchStatus } from '../../core/services/stock-batch.service';
import { I18nService } from '../../core/services/i18n.service';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData, ChartType, Chart, registerables } from 'chart.js';

// Registrar todos los componentes de Chart.js
Chart.register(...registerables);

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, BaseChartDirective],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardComponent implements OnInit, OnDestroy {

  // ── User data ──────────────────────────────────────────────────────────────
  userName: string = '';
  userRoles: string[] = [];

  // ── Dashboard data ─────────────────────────────────────────────────────────
  stats: DashboardStats | null = null;
  isLoading = true;
  errorMessage: string | null = null;

  // ── Permissions ────────────────────────────────────────────────────────────
  isAdmin = false;
  isStorekeeper = false;

  // ── Bar Chart (Categorías) ─────────────────────────────────────────────────
  barChartType: ChartType = 'bar';

  barChartData: ChartData<'bar'> = {
    labels: [],
    datasets: []
  };

  barChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        callbacks: {
          label: (context) => ` ${context.parsed.y} items`
        }
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          color: '#666666',
          font: { size: 12, family: 'Inter, Roboto, sans-serif' }
        }
      },
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(0,0,0,0.05)' },
        ticks: {
          color: '#666666',
          stepSize: 1,
          font: { size: 12, family: 'Inter, Roboto, sans-serif' }
        }
      }
    }
  };

  // ── Pie Chart (Estado de lotes) ────────────────────────────────────────────
  pieChartType: ChartType = 'pie';

  pieChartData: ChartData<'pie'> = {
    labels: [],
    datasets: []
  };

  pieChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: '#666666',
          font: { size: 12, family: 'Inter, Roboto, sans-serif' },
          padding: 16,
          usePointStyle: true,
          pointStyleWidth: 10
        }
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const total = (context.dataset.data as number[]).reduce((a, b) => a + b, 0);
            const value = context.parsed as number;
            const pct = total > 0 ? Math.round((value / total) * 100) : 0;
            return ` ${context.label}: ${value} (${pct}%)`;
          }
        }
      }
    }
  };

  // ── Cleanup ────────────────────────────────────────────────────────────────
  private destroy$ = new Subject<void>();

  constructor(
    private authService: AuthService,
    private dashboardService: DashboardService,
    private i18n: I18nService,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) {}

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.initializeUserData();
    this.loadDashboardData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Data loading ───────────────────────────────────────────────────────────

  private initializeUserData(): void {
    const user = this.authService.getCurrentUser();
    if (user) {
      this.userName = user.name;
      this.userRoles = user.roles;
      this.isAdmin = user.roles.includes('ADMIN');
      this.isStorekeeper = user.roles.includes('STOREKEEPER');
    }
  }

  loadDashboardData(): void {
    this.isLoading = true;
    this.errorMessage = null;
    this.cdr.markForCheck();

    this.dashboardService.getDashboardStats()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (stats) => {
          this.ngZone.run(() => {
            this.stats = stats;
            this.prepareChartData();
            this.isLoading = false;
            this.cdr.markForCheck();
          });
        },
        error: (error) => {
          this.ngZone.run(() => {
            console.error('Error loading dashboard stats:', error);
            this.errorMessage = 'Error al cargar las estadísticas del dashboard';
            this.isLoading = false;
            this.cdr.markForCheck();
          });
        }
      });
  }

  private prepareChartData(): void {
    if (!this.stats) return;

    // ── Bar chart: top categorías ──────────────────────────────────────────
    this.barChartData = {
      labels: this.stats.topCategories.map(c => c.name),
      datasets: [
        {
          label: 'Items',
          data: this.stats.topCategories.map(c => c.count),
          backgroundColor: [
            'rgba(200, 169, 81, 0.85)',
            'rgba(46, 125, 50, 0.85)',
            'rgba(25, 118, 210, 0.85)',
            'rgba(245, 124, 0, 0.85)',
            'rgba(123, 31, 162, 0.85)',
            'rgba(198, 40, 40, 0.85)',
            'rgba(0, 121, 107, 0.85)',
            'rgba(93, 64, 55, 0.85)'
          ],
          borderColor: [
            '#C8A951', '#2E7D32', '#1976D2',
            '#F57C00', '#7B1FA2', '#C62828',
            '#00796B', '#5D4037'
          ],
          borderWidth: 1,
          borderRadius: 6,
          borderSkipped: false
        }
      ]
    };

    // ── Pie chart: estado de lotes (StockBatch) ────────────────────────────
    const healthyCount = this.stats.batchesHealthy;
    const closeToExpireCount = this.stats.batchesCloseToExpire;
    const expiredCount = this.stats.batchesExpired;

    this.pieChartData = {
      labels: ['Vigentes', 'Próximos a Expirar', 'Expirados'],
      datasets: [
        {
          data: [healthyCount, closeToExpireCount, expiredCount],
          backgroundColor: [
            'rgba(46, 125, 50, 0.85)',   // Verde - Vigentes
            'rgba(245, 124, 0, 0.85)',   // Naranja - Próximos a expirar
            'rgba(198, 40, 40, 0.85)'    // Rojo - Expirados
          ],
          borderColor: ['#2E7D32', '#F57C00', '#C62828'],
          borderWidth: 2,
          hoverOffset: 8
        }
      ]
    };

    this.cdr.markForCheck();
  }

  // ── Helpers para StockBatch ────────────────────────────────────────────────

  /** Obtiene los lotes próximos a expirar (menos de 7 días) */
  getCloseToExpireBatches(): StockBatch[] {
    if (!this.stats) return [];
    return this.stats.closeToExpireBatches || [];
  }

  /** Obtiene los lotes expirados */
  getExpiredBatches(): StockBatch[] {
    if (!this.stats) return [];
    return this.stats.expiredBatches || [];
  }

  /** Obtiene todos los lotes con alertas (próximos a expirar + expirados) */
  getAllAlertBatches(): StockBatch[] {
    return [...this.getCloseToExpireBatches(), ...this.getExpiredBatches()];
  }

  getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Buenos días';
    if (hour < 18) return 'Buenas tardes';
    return 'Buenas noches';
  }

  /** Obtiene la clase CSS según el estado del lote */
  getBatchStatusClass(batch: StockBatch): string {
    switch (batch.status) {
      case 'EXPIRADO': return 'status-critical';
      case 'PROXIMO_A_EXPIRAR': return 'status-warning';
      case 'AGOTADO': return 'status-depleted';
      default: return 'status-healthy';
    }
  }

  /** Obtiene el texto del estado del lote */
  getBatchStatusText(batch: StockBatch): string {
    if (batch.status === 'EXPIRADO') {
      return 'EXPIRADO';
    }
    if (batch.status === 'PROXIMO_A_EXPIRAR') {
      return `${batch.daysUntilExpiry} días`;
    }
    if (batch.status === 'AGOTADO') {
      return 'AGOTADO';
    }
    return 'Vigente';
  }

  /** Formatea la fecha de expiración */
  formatExpiryDate(dateString: string): string {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }

  refreshData(): void {
    this.loadDashboardData();
  }

  // ── Permisos ───────────────────────────────────────────────────────────────

  canViewInventory(): boolean {
    return this.isAdmin || this.isStorekeeper;
  }

  canManageCategories(): boolean {
    return this.isAdmin || this.isStorekeeper;
  }

  canViewItems(): boolean {
    return this.isAdmin || this.isStorekeeper;
  }
}
