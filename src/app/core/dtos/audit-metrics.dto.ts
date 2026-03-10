/**
 * DTOs para Métricas de Auditoría
 * Actualizado según estructura REAL del backend
 */

/**
 * Métricas de autenticación por rol
 */
export interface RoleAuthMetrics {
  totalAttempts: number;
  successfulAttempts: number;
  averageDurationMs: number;
  successRate: number;
}

/**
 * Métricas de autenticación generales
 */
export interface GeneralAuthMetrics {
  totalAttempts: number;
  successfulAttempts: number;
  averageDurationMs: number;
  successRate: number;
}

/**
 * Métricas de verificación 2FA
 */
export interface TwoFactorMetrics {
  totalVerifications: number;
  averageVerificationTimeSeconds: number;
  failedVerifications: number;
}

/**
 * Métricas de recuperación de contraseña
 */
export interface PasswordRecoveryMetrics {
  totalRecoveryRequests: number;
  successfulResets: number;
  expiredCodes: number;
  codeExpirationRate: number;
}

/**
 * Métricas de sesión
 */
export interface SessionMetrics {
  totalSessions: number;
  averageDurationSeconds: number;
}

/**
 * Respuesta completa de métricas de autenticación
 * Según estructura REAL del backend
 */
export interface AuthMetricsResponse {
  periodStart: string;
  periodEnd: string;
  averageAuthenticationTimeMs: number;
  authenticationTimeStatus: 'OK' | 'WARNING' | 'CRITICAL';
  generalAuthMetrics: GeneralAuthMetrics;
  adminAuthMetrics: RoleAuthMetrics;
  waiterAuthMetrics: RoleAuthMetrics;
  cashierAuthMetrics: RoleAuthMetrics;
  kitchenAuthMetrics?: RoleAuthMetrics;      // Opcional - puede o no venir
  storekeeperAuthMetrics?: RoleAuthMetrics;  // Opcional - puede o no venir
  twoFactorMetrics: TwoFactorMetrics;
  twoFactorStatus?: 'OK' | 'WARNING' | 'CRITICAL';
  passwordRecoveryMetrics: PasswordRecoveryMetrics;
  codeExpirationStatus?: 'OK' | 'WARNING' | 'CRITICAL';
  sessionMetrics: SessionMetrics;
}

/**
 * Opciones de filtro de fecha
 */
export type DateFilterType = '7days' | '30days' | 'custom';

export interface DateFilter {
  type: DateFilterType;
  startDate?: Date;
  endDate?: Date;
}
