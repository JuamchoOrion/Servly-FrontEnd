import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { ChartConfiguration, ChartData, ChartType, registerables } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
import { AuditMetricsService } from '../../../../core/services/audit-metrics.service';
import { AuthService } from '../../../../core/services/auth.service';
import { AuthMetricsResponse, DateFilter, RoleAuthMetrics } from '../../../../core/dtos/audit-metrics.dto';
import { Router } from '@angular/router';

// Registrar todos los componentes de Chart.js
import { Chart } from 'chart.js';
Chart.register(...registerables);

/**
 * Card de métrica individual
 */
interface MetricCard {
  title: string;
  value: string | number;
  unit: string;
  status: 'OK' | 'WARNING' | 'CRITICAL';
  icon: string;
  description: string;
}

@Component({
  selector: 'app-audit-metrics',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, BaseChartDirective],
  templateUrl: './audit-metrics.component.html',
  styleUrls: ['./audit-metrics.component.scss']
})
export class AuditMetricsComponent implements OnInit {

  // Filtros
  filterForm!: FormGroup;
  showCustomDateRange = false;

  // Datos
  metrics: AuthMetricsResponse | null = null;
  isLoading = true;
  errorMessage: string | null = null;

  // Cards de métricas
  metricCards: MetricCard[] = [];

  // Gráfico de barras - Tasas de éxito por rol
  barChartType: ChartType = 'bar';
  barChartData: ChartData<'bar'> = { labels: [], datasets: [] };
  barChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: true, position: 'top' },
      tooltip: {
        callbacks: {
          label: (context) => `${context.parsed.y}%`
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        ticks: { callback: (value) => `${value}%` }
      }
    }
  };

  // Gráfico de línea - Tiempos promedio
  lineChartType: ChartType = 'line';
  lineChartData: ChartData<'line'> = { labels: [], datasets: [] };
  lineChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: true, position: 'top' }
    },
    scales: {
      y: {
        beginAtZero: true
      }
    }
  };

  // Gráfico doughnut - Distribución de intentos
  doughnutChartType: ChartType = 'doughnut';
  doughnutChartData: ChartData<'doughnut'> = { labels: [], datasets: [] };
  doughnutChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: true, position: 'bottom' }
    }
  };

  constructor(
    private fb: FormBuilder,
    private auditMetricsService: AuditMetricsService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Verificar permisos de ADMIN
    if (!this.authService.hasRole('ADMIN')) {
      this.router.navigate(['/access-denied']);
      return;
    }

    this.initializeForm();
    this.loadMetrics({ type: '7days' });
  }

  private initializeForm(): void {
    this.filterForm = this.fb.group({
      dateFilter: ['7days']
    });

    this.filterForm.get('dateFilter')?.valueChanges.subscribe((value: string) => {
      this.showCustomDateRange = value === 'custom';
      if (!this.showCustomDateRange) {
        this.loadMetrics({ type: value as '7days' | '30days' });
      }
    });
  }

  loadMetrics(filter: DateFilter): void {
    this.isLoading = true;
    this.errorMessage = null;

    console.log('═══════════════════════════════════════════════════════════');
    console.log('🔵 [AuditMetrics] Cargando métricas...');
    console.log('🔵 [AuditMetrics] Filtro aplicado:', filter);

    this.auditMetricsService.getAuthMetrics(filter).subscribe({
      next: (metrics) => {
        console.log('═══════════════════════════════════════════════════════════');
        console.log('✅ [AuditMetrics] Métricas cargadas exitosamente');
        console.log('🔵 [AuditMetrics] Métricas completas:', metrics);
        console.log('═══════════════════════════════════════════════════════════');

        // Log detallado de cada campo
        console.log('📊 [AuditMetrics] DESGLOSE DE DATOS DEL BACKEND:');
        console.log('  - periodStart:', metrics.periodStart);
        console.log('  - periodEnd:', metrics.periodEnd);
        console.log('  - averageAuthenticationTimeMs:', metrics.averageAuthenticationTimeMs);
        console.log('  - authenticationTimeStatus:', metrics.authenticationTimeStatus);
        console.log('  - generalAuthMetrics:', metrics.generalAuthMetrics);
        console.log('  - adminAuthMetrics:', metrics.adminAuthMetrics);
        console.log('  - waiterAuthMetrics:', metrics.waiterAuthMetrics);
        console.log('  - cashierAuthMetrics:', metrics.cashierAuthMetrics);
        console.log('  - kitchenAuthMetrics:', metrics.kitchenAuthMetrics || '❌ NO VIENE');
        console.log('  - storekeeperAuthMetrics:', metrics.storekeeperAuthMetrics || '❌ NO VIENE');
        console.log('  - twoFactorMetrics:', metrics.twoFactorMetrics);
        console.log('  - passwordRecoveryMetrics:', metrics.passwordRecoveryMetrics);
        console.log('  - sessionMetrics:', metrics.sessionMetrics);
        console.log('═══════════════════════════════════════════════════════════');

        this.metrics = metrics;
        this.isLoading = false;

        console.log('🔵 [AuditMetrics] Actualizando cards...');
        this.updateMetricCards();

        console.log('🔵 [AuditMetrics] Actualizando gráficos...');
        this.updateCharts();

        console.log('✅ [AuditMetrics] Componente actualizado correctamente');
      },
      error: (error) => {
        console.log('═══════════════════════════════════════════════════════════');
        console.log('❌ [AuditMetrics] Error cargando métricas:', error);
        console.log('═══════════════════════════════════════════════════════════');
        this.isLoading = false;
        this.errorMessage = error.message || 'Error al cargar las métricas';
      }
    });
  }

  onApplyCustomDate(): void {
    const startDate = this.filterForm.get('startDate')?.value;
    const endDate = this.filterForm.get('endDate')?.value;

    if (startDate && endDate) {
      this.loadMetrics({
        type: 'custom',
        startDate: new Date(startDate),
        endDate: new Date(endDate)
      });
    } else {
      this.errorMessage = 'Debe seleccionar ambas fechas';
    }
  }

  onExportCSV(): void {
    if (!this.metrics) return;

    const csvContent = this.auditMetricsService.exportToCSV(this.metrics);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `audit-metrics-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  private updateMetricCards(): void {
    if (!this.metrics) {
      console.warn('⚠️ [AuditMetrics] updateMetricCards: metrics es null');
      return;
    }

    console.log('🔵 [AuditMetrics] updateMetricCards: Creando cards...');

    this.metricCards = [
      {
        title: 'Tiempo Promedio de Autenticación',
        value: this.metrics.averageAuthenticationTimeMs.toFixed(0),
        unit: 'ms',
        status: this.metrics.authenticationTimeStatus,
        icon: 'timer',
        description: 'Tiempo promedio para completar login'
      },
      {
        title: 'Tasa de Éxito Global',
        value: this.metrics.generalAuthMetrics.successRate.toFixed(1),
        unit: '%',
        status: this.getStatusByRate(this.metrics.generalAuthMetrics.successRate),
        icon: 'check_circle',
        description: 'Porcentaje de logins exitosos'
      },
      {
        title: 'Verificación 2FA',
        value: this.metrics.twoFactorMetrics.averageVerificationTimeSeconds.toFixed(1),
        unit: 'seg',
        status: this.metrics.twoFactorStatus || 'OK',
        icon: 'security',
        description: `Verificaciones: ${this.metrics.twoFactorMetrics.totalVerifications} | Fallidas: ${this.metrics.twoFactorMetrics.failedVerifications}`
      },
      {
        title: 'Expiración de Códigos',
        value: this.metrics.passwordRecoveryMetrics.codeExpirationRate.toFixed(1),
        unit: '%',
        status: this.metrics.codeExpirationStatus || 'OK',
        icon: 'schedule',
        description: `Recuperaciones: ${this.metrics.passwordRecoveryMetrics.totalRecoveryRequests} | Exitosas: ${this.metrics.passwordRecoveryMetrics.successfulResets}`
      },
      {
        title: 'Duración de Sesión',
        value: (this.metrics.sessionMetrics.averageDurationSeconds / 60).toFixed(0),
        unit: 'min',
        status: 'OK',
        icon: 'hourglass_empty',
        description: `Sesiones totales: ${this.metrics.sessionMetrics.totalSessions}`
      },
      {
        title: 'Intentos Totales',
        value: this.metrics.generalAuthMetrics.totalAttempts,
        unit: '',
        status: 'OK',
        icon: 'login',
        description: `Exitosos: ${this.metrics.generalAuthMetrics.successfulAttempts} | Fallidos: ${this.metrics.generalAuthMetrics.totalAttempts - this.metrics.generalAuthMetrics.successfulAttempts}`
      }
    ];

    console.log('📊 [AuditMetrics] Cards generadas:', this.metricCards);
    this.metricCards.forEach((card, index) => {
      console.log(`  Card ${index + 1}: ${card.title} = ${card.value} ${card.unit} [${card.status}]`);
    });
    console.log('✅ [AuditMetrics] Cards actualizadas correctamente');
  }

  private updateCharts(): void {
    if (!this.metrics) return;

    console.log('🔵 [AuditMetrics] updateCharts: Actualizando gráficos...');

    // Gráfico de barras - Tasas de éxito por rol
    // Roles base que siempre vienen
    const roles = ['ADMIN', 'WAITER', 'CASHIER'];

    // Roles opcionales - se agregan si existen en la respuesta
    if (this.metrics.kitchenAuthMetrics) {
      roles.push('KITCHEN');
      console.log('🔵 [AuditMetrics] KITCHEN agregado a gráficos');
    }
    if (this.metrics.storekeeperAuthMetrics) {
      roles.push('STOREKEEPER');
      console.log('🔵 [AuditMetrics] STOREKEEPER agregado a gráficos');
    }

    const roleMetrics: Record<string, RoleAuthMetrics> = {
      'ADMIN': this.metrics.adminAuthMetrics,
      'WAITER': this.metrics.waiterAuthMetrics,
      'CASHIER': this.metrics.cashierAuthMetrics,
      'KITCHEN': this.metrics.kitchenAuthMetrics || { totalAttempts: 0, successfulAttempts: 0, averageDurationMs: 0, successRate: 0 },
      'STOREKEEPER': this.metrics.storekeeperAuthMetrics || { totalAttempts: 0, successfulAttempts: 0, averageDurationMs: 0, successRate: 0 }
    };

    console.log('📊 [AuditMetrics] Roles en gráfico:', roles);

    this.barChartData = {
      labels: roles,
      datasets: [
        {
          label: 'Tasa de Éxito (%)',
          data: roles.map(role => roleMetrics[role].successRate),
          backgroundColor: roles.map(role => {
            const rate = roleMetrics[role].successRate;
            return this.getColorByRate(rate);
          }),
          borderColor: '#556B2F',
          borderWidth: 1
        }
      ]
    };

    // Gráfico de línea - Tiempos promedio por rol
    this.lineChartData = {
      labels: roles,
      datasets: [
        {
          label: 'Tiempo Promedio (ms)',
          data: roles.map(role => roleMetrics[role].averageDurationMs),
          borderColor: '#847500',
          backgroundColor: 'rgba(132, 117, 0, 0.2)',
          tension: 0.4,
          fill: true
        }
      ]
    };

    // Gráfico doughnut - Distribución de intentos
    this.doughnutChartData = {
      labels: roles,
      datasets: [
        {
          data: roles.map(role => roleMetrics[role].totalAttempts),
          backgroundColor: [
            'rgba(85, 107, 47, 0.8)',    // ADMIN - Verde oliva
            'rgba(132, 117, 0, 0.8)',    // WAITER - Olive oscuro
            'rgba(200, 169, 81, 0.8)',   // CASHIER - Dorado
            'rgba(107, 123, 95, 0.8)',   // KITCHEN - Sage
            'rgba(232, 220, 200, 0.8)'   // STOREKEEPER - Beige
          ],
          borderColor: '#F5F5F5',
          borderWidth: 2
        }
      ]
    };

    console.log('✅ [AuditMetrics] Gráficos actualizados correctamente');
  }

  private calculateGlobalSuccessRate(): number {
    if (!this.metrics) return 0;

    // Usar el successRate que ya viene del backend
    return this.metrics.generalAuthMetrics.successRate;
  }

  private getStatusByRate(rate: number): 'OK' | 'WARNING' | 'CRITICAL' {
    if (rate >= 95) return 'OK';
    if (rate >= 80) return 'WARNING';
    return 'CRITICAL';
  }

  private getStatusBy2FA(timeSeconds: number): 'OK' | 'WARNING' | 'CRITICAL' {
    if (timeSeconds < 60) return 'OK';
    if (timeSeconds < 120) return 'WARNING';
    return 'CRITICAL';
  }

  private getStatusByExpirationRate(rate: number): 'OK' | 'WARNING' | 'CRITICAL' {
    if (rate < 10) return 'OK';
    if (rate < 25) return 'WARNING';
    return 'CRITICAL';
  }

  private getStatusByRecoveryTime(timeMinutes: number): 'OK' | 'WARNING' | 'CRITICAL' {
    if (timeMinutes < 5) return 'OK';
    if (timeMinutes < 10) return 'WARNING';
    return 'CRITICAL';
  }

  getStatusColor(status: 'OK' | 'WARNING' | 'CRITICAL'): string {
    switch (status) {
      case 'OK': return '#556B2F';      // Verde oliva
      case 'WARNING': return '#847500'; // Olive oscuro/dorado
      case 'CRITICAL': return '#D9534F'; // Rojo
    }
  }

  private getColorByRate(rate: number): string {
    if (rate >= 95) return '#556B2F';   // Verde oliva
    if (rate >= 80) return '#847500';   // Olive oscuro
    return '#D9534F';                   // Rojo
  }

  getSuccessRate(metrics: RoleAuthMetrics): number {
    if (metrics.totalAttempts === 0) return 0;
    return (metrics.successfulAttempts / metrics.totalAttempts) * 100;
  }

  getRateBadgeClass(metrics: RoleAuthMetrics): string {
    const rate = metrics.successRate;
    if (rate >= 95) return 'badge-ok';
    if (rate >= 80) return 'badge-warning';
    return 'badge-critical';
  }

  getRateBadgeClassByRate(rate: number): string {
    if (rate >= 95) return 'badge-ok';
    if (rate >= 80) return 'badge-warning';
    return 'badge-critical';
  }

  getPeriodDays(): number {
    if (!this.metrics) return 0;
    const start = new Date(this.metrics.periodStart);
    const end = new Date(this.metrics.periodEnd);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays + 1; // Incluir ambos días
  }

  get today(): Date {
    return new Date();
  }
}
