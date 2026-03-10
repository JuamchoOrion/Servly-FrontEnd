import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { environment } from '../../../enviroments/enviroment';
import { AuthMetricsResponse, DateFilter, RoleAuthMetrics, GeneralAuthMetrics } from '../dtos/audit-metrics.dto';

/**
 * AuditMetricsService
 * Servicio para obtener métricas de auditoría y autenticación
 */
@Injectable({ providedIn: 'root' })
export class AuditMetricsService {

  private readonly API_URL = environment.apiUrl;
  private readonly METRICS_ENDPOINT = `${this.API_URL}/api/admin/metrics/auth`;

  constructor(private http: HttpClient) {}

  /**
   * Obtiene las métricas de autenticación según el filtro de fecha
   *
   * @param filter Filtro de fecha (7 días, 30 días o rango personalizado)
   * @returns Observable<AuthMetricsResponse> con las métricas
   *
   * Posibles errores:
   * - 401/403: Sin permisos o token inválido
   * - 500: Error del servidor
   */
  getAuthMetrics(filter: DateFilter): Observable<AuthMetricsResponse> {
    let url: string;

    switch (filter.type) {
      case '7days':
        url = this.METRICS_ENDPOINT;
        break;
      case '30days':
        url = `${this.METRICS_ENDPOINT}/30days`;
        break;
      case 'custom':
        const start = filter.startDate?.toISOString().split('T')[0];
        const end = filter.endDate?.toISOString().split('T')[0];
        url = `${this.METRICS_ENDPOINT}/custom?start=${start}&end=${end}`;
        break;
      default:
        url = this.METRICS_ENDPOINT;
    }

    console.log('═══════════════════════════════════════════════════════════');
    console.log('🔵 [AuditMetricsService] GET request:', url);
    console.log('🔵 [AuditMetricsService] Filter:', filter);

    return this.http.get<AuthMetricsResponse>(url, {
      withCredentials: true
    }).pipe(
      tap(response => {
        console.log('✅ [AuditMetricsService] Response recibida:', response);
        console.log('📊 [AuditMetricsService] Response detallada:');
        console.log('  - periodStart:', response.periodStart);
        console.log('  - periodEnd:', response.periodEnd);
        console.log('  - averageAuthenticationTimeMs:', response.averageAuthenticationTimeMs);
        console.log('  - authenticationTimeStatus:', response.authenticationTimeStatus);
        console.log('  - generalAuthMetrics:', response.generalAuthMetrics);
        console.log('  - adminAuthMetrics:', response.adminAuthMetrics);
        console.log('  - waiterAuthMetrics:', response.waiterAuthMetrics);
        console.log('  - cashierAuthMetrics:', response.cashierAuthMetrics);
        console.log('  - kitchenAuthMetrics:', response.kitchenAuthMetrics || '❌ NO VIENE');
        console.log('  - storekeeperAuthMetrics:', response.storekeeperAuthMetrics || '❌ NO VIENE');
        console.log('  - twoFactorMetrics:', response.twoFactorMetrics);
        console.log('  - passwordRecoveryMetrics:', response.passwordRecoveryMetrics);
        console.log('  - sessionMetrics:', response.sessionMetrics);
        console.log('═══════════════════════════════════════════════════════════');
      }),
      catchError(error => this.handleError(error))
    );
  }

  /**
   * Exporta las métricas a formato CSV
   *
   * @param metrics Métricas a exportar
   * @returns String con el contenido CSV
   */
  exportToCSV(metrics: AuthMetricsResponse): string {
    const headers = [
      'Métrica',
      'Valor',
      'Estado',
      'Unidad'
    ];

    const rows: string[][] = [
      ['Tiempo Promedio de Autenticación', metrics.averageAuthenticationTimeMs.toFixed(2), metrics.authenticationTimeStatus, 'ms'],
      ['Tasa de Éxito ADMIN', metrics.adminAuthMetrics.successRate.toFixed(2) + '%', this.getStatusByRate(metrics.adminAuthMetrics.successRate), '%'],
      ['Tasa de Éxito WAITER', metrics.waiterAuthMetrics.successRate.toFixed(2) + '%', this.getStatusByRate(metrics.waiterAuthMetrics.successRate), '%'],
      ['Tasa de Éxito CASHIER', metrics.cashierAuthMetrics.successRate.toFixed(2) + '%', this.getStatusByRate(metrics.cashierAuthMetrics.successRate), '%']
    ];

    // Agregar KITCHEN y STOREKEEPER si existen
    if (metrics.kitchenAuthMetrics) {
      rows.push(['Tasa de Éxito KITCHEN', metrics.kitchenAuthMetrics.successRate.toFixed(2) + '%', this.getStatusByRate(metrics.kitchenAuthMetrics.successRate), '%']);
    }
    if (metrics.storekeeperAuthMetrics) {
      rows.push(['Tasa de Éxito STOREKEEPER', metrics.storekeeperAuthMetrics.successRate.toFixed(2) + '%', this.getStatusByRate(metrics.storekeeperAuthMetrics.successRate), '%']);
    }

    rows.push(
      ['Tiempo Verificación 2FA', metrics.twoFactorMetrics.averageVerificationTimeSeconds.toFixed(2), metrics.twoFactorStatus || 'OK', 'segundos'],
      ['Tasa de Expiración de Códigos', metrics.passwordRecoveryMetrics.codeExpirationRate.toFixed(2), metrics.codeExpirationStatus || 'OK', '%'],
      ['Duración Promedio de Sesión', (metrics.sessionMetrics.averageDurationSeconds / 60).toFixed(2), 'INFO', 'minutos']
    );

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    return csvContent;
  }

  private getStatusByRate(rate: number): 'OK' | 'WARNING' | 'CRITICAL' {
    if (rate >= 95) return 'OK';
    if (rate >= 80) return 'WARNING';
    return 'CRITICAL';
  }

  /**
   * Maneja errores HTTP y proporciona mensajes claros
   */
  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'Error desconocido';

    const status = error.status;
    const body = error.error;

    switch (status) {
      case 400:
        errorMessage = body?.message || 'Parámetros inválidos';
        break;
      case 401:
        errorMessage = 'No autorizado. Inicie sesión nuevamente';
        break;
      case 403:
        errorMessage = 'No tiene permisos para ver estas métricas';
        break;
      case 404:
        errorMessage = 'Métricas no disponibles para el rango seleccionado';
        break;
      case 500:
        errorMessage = 'Error del servidor. Intente más tarde';
        break;
      default:
        errorMessage = body?.message || 'Error al cargar las métricas';
    }

    console.error('Audit metrics error:', error);
    return throwError(() => ({
      status,
      message: errorMessage,
      originalError: error
    }));
  }
}
