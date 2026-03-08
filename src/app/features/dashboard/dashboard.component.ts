import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AuthService } from '../../core/services/auth.service';
import { DashboardService, DashboardStats, ExpirationAlert } from '../../core/services/dashboard.service';
import { I18nService } from '../../core/services/i18n.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardComponent implements OnInit, OnDestroy {
  // User data
  userName: string = '';
  userRoles: string[] = [];

  // Dashboard data
  stats: DashboardStats | null = null;
  isLoading = true;
  errorMessage: string | null = null;

  // Chart data for visualization
  chartData: { label: string; value: number; color: string }[] = [];

  // Permissions
  isAdmin = false;
  isStorekeeper = false;

  // Cleanup
  private destroy$ = new Subject<void>();

  constructor(
    private authService: AuthService,
    private dashboardService: DashboardService,
    private i18n: I18nService,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) {}

  ngOnInit(): void {
    this.initializeUserData();
    this.loadDashboardData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

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

    const colors = [
      '#C8A951', // Gold
      '#2E7D32', // Green
      '#1976D2', // Blue
      '#F57C00', // Orange
      '#7B1FA2', // Purple
      '#C62828', // Red
      '#00796B', // Teal
      '#5D4037'  // Brown
    ];

    this.chartData = this.stats.topCategories.map((category, index) => ({
      label: category.name,
      value: category.count,
      color: colors[index % colors.length]
    }));
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

  formatTimeAgo(timestamp: string): string {
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now.getTime() - time.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `hace ${diffDays} día${diffDays > 1 ? 's' : ''}`;
    if (diffHours > 0) return `hace ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
    return 'hace unos minutos';
  }

  getActivityIcon(type: string): string {
    switch (type) {
      case 'item_created': return '➕';
      case 'item_updated': return '✏️';
      case 'item_deleted': return '🗑️';
      case 'category_created': return '🏷️';
      default: return '📝';
    }
  }

  refreshData(): void {
    this.loadDashboardData();
  }

  // Métodos para accesibilidad
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
