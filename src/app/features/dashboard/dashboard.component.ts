import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AuthService } from '../../core/services/auth.service';
import { DashboardService, DashboardStats, ExpirationAlert } from '../../core/services/dashboard.service';
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

  // ── Pie Chart (Estado de expiración) ───────────────────────────────────────
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

    // ── Pie chart: estado de expiración ────────────────────────────────────
    const expiringCount = this.stats.expirationAlerts.filter(a => a.status === 'warning').length;
    const criticalCount = this.stats.expirationAlerts.filter(a => a.status === 'critical').length;
    const healthyCount  = Math.max(0, this.stats.totalItems - (expiringCount + criticalCount));

    this.pieChartData = {
      labels: ['Estado Normal', 'Por Expirar', 'Crítico'],
      datasets: [
        {
          data: [healthyCount, expiringCount, criticalCount],
          backgroundColor: [
            'rgba(46, 125, 50, 0.85)',
            'rgba(245, 124, 0, 0.85)',
            'rgba(198, 40, 40, 0.85)'
          ],
          borderColor: ['#2E7D32', '#F57C00', '#C62828'],
          borderWidth: 2,
          hoverOffset: 8
        }
      ]
    };

    this.cdr.markForCheck();
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  /** Filtra items que expiran en menos de 2 semanas (≤14 días, ≥0) */
  getExpiringItems(): ExpirationAlert[] {
    if (!this.stats) return [];
    return this.stats.expirationAlerts.filter(
      alert => alert.expirationDays <= 14 && alert.expirationDays >= 0
    );
  }

  getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Buenos días';
    if (hour < 18) return 'Buenas tardes';
    return 'Buenas noches';
  }

  getExpirationStatusClass(alert: ExpirationAlert): string {
    return alert.status === 'critical' ? 'status-critical' : 'status-warning';
  }

  getExpirationStatusText(alert: ExpirationAlert): string {
    if (alert.status === 'critical') {
      return alert.expirationDays <= 0 ? 'VENCIDO' : `${alert.expirationDays} días`;
    }
    return `${alert.expirationDays} días`;
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
