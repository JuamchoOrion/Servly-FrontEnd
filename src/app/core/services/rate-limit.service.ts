import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

/**
 * Interfaz para tracking de intentos
 */
interface RateLimitAttempt {
  timestamp: number;
  endpoint: string;
}

/**
 * Servicio de Rate Limiting
 * Previene ataques de fuerza bruta limitando intentos
 */
@Injectable({ providedIn: 'root' })
export class RateLimitService {
  // Configuración
  private readonly MAX_ATTEMPTS = 5;
  private readonly TIME_WINDOW = 15 * 60 * 1000; // 15 minutos
  private readonly LOCKOUT_DURATION = 30 * 60 * 1000; // 30 minutos
  private readonly STORAGE_KEY = 'rate_limit_attempts';

  // Estado
  private attempts: RateLimitAttempt[] = [];
  private lockedOut$ = new BehaviorSubject<boolean>(false);
  private remainingTime$ = new BehaviorSubject<number>(0);

  constructor() {
    this.loadAttemptsFromStorage();
  }

  /**
   * Verifica si está bloqueado por rate limit
   */
  isLocked(): boolean {
    return this.lockedOut$.value;
  }

  /**
   * Observable del estado de bloqueo
   */
  isLockedOut$() {
    return this.lockedOut$.asObservable();
  }

  /**
   * Observable del tiempo restante de bloqueo (en segundos)
   */
  getRemainingTime$() {
    return this.remainingTime$.asObservable();
  }

  /**
   * Registra un intento de login fallido
   * @param endpoint URL del endpoint (ej: '/api/auth/login')
   */
  recordFailedAttempt(endpoint: string): void {
    const now = Date.now();

    // Limpiar intentos antiguos
    this.attempts = this.attempts.filter(
      attempt => now - attempt.timestamp < this.TIME_WINDOW
    );

    // Agregar nuevo intento
    this.attempts.push({
      timestamp: now,
      endpoint
    });

    this.saveAttemptsToStorage();

    // Verificar si se debe bloquear
    if (this.attempts.length >= this.MAX_ATTEMPTS) {
      this.lockOut();
    }
  }

  /**
   * Obtiene el número de intentos fallidos en la ventana de tiempo
   */
  getFailedAttemptCount(): number {
    const now = Date.now();
    return this.attempts.filter(
      attempt => now - attempt.timestamp < this.TIME_WINDOW
    ).length;
  }

  /**
   * Obtiene el número de intentos restantes antes del bloqueo
   */
  getRemainingAttempts(): number {
    return Math.max(0, this.MAX_ATTEMPTS - this.getFailedAttemptCount());
  }

  /**
   * Limpia los intentos fallidos
   */
  clearFailedAttempts(): void {
    this.attempts = [];
    this.lockedOut$.next(false);
    this.remainingTime$.next(0);
    this.saveAttemptsToStorage();
  }

  /**
   * Bloquea la cuenta por intentos excesivos
   */
  private lockOut(): void {
    this.lockedOut$.next(true);
    const lockoutStartTime = Date.now();

    // Actualizar tiempo restante cada segundo
    const interval = setInterval(() => {
      const elapsed = Date.now() - lockoutStartTime;
      const remaining = Math.max(0, this.LOCKOUT_DURATION - elapsed);

      this.remainingTime$.next(Math.ceil(remaining / 1000));

      if (remaining <= 0) {
        clearInterval(interval);
        this.clearFailedAttempts();
      }
    }, 1000);

    sessionStorage.setItem('lockout_start_time', lockoutStartTime.toString());
  }

  /**
   * Obtiene el tiempo restante de bloqueo en segundos
   */
  getLockoutTimeRemaining(): number {
    const lockoutStart = sessionStorage.getItem('lockout_start_time');
    if (!lockoutStart) return 0;

    const elapsed = Date.now() - parseInt(lockoutStart);
    const remaining = this.LOCKOUT_DURATION - elapsed;

    return Math.max(0, Math.ceil(remaining / 1000));
  }

  /**
   * Guarda intentos en localStorage para persistencia entre sesiones
   */
  private saveAttemptsToStorage(): void {
    sessionStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.attempts));
  }

  /**
   * Carga intentos de localStorage
   */
  private loadAttemptsFromStorage(): void {
    const stored = sessionStorage.getItem(this.STORAGE_KEY);
    if (stored) {
      try {
        this.attempts = JSON.parse(stored);
        // Limpiar intentos antiguos
        const now = Date.now();
        this.attempts = this.attempts.filter(
          attempt => now - attempt.timestamp < this.TIME_WINDOW
        );

        // Verificar bloqueo existente
        if (this.attempts.length >= this.MAX_ATTEMPTS) {
          this.lockOut();
        }
      } catch (error) {
        console.error('Error cargando rate limit attempts:', error);
        this.attempts = [];
      }
    }
  }

  /**
   * Obtiene información detallada del rate limit
   */
  getStatus() {
    return {
      isLocked: this.isLocked(),
      failedAttempts: this.getFailedAttemptCount(),
      remainingAttempts: this.getRemainingAttempts(),
      maxAttempts: this.MAX_ATTEMPTS,
      timeWindowMinutes: this.TIME_WINDOW / (60 * 1000),
      lockoutDurationMinutes: this.LOCKOUT_DURATION / (60 * 1000),
      lockoutTimeRemaining: this.getLockoutTimeRemaining()
    };
  }
}

