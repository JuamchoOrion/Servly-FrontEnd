import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { I18nService } from './i18n.service';

/**
 * Tipos de severidad de error
 */
export enum ErrorSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical'
}

/**
 * Tipos de error
 */
export enum ErrorType {
  NETWORK = 'NETWORK',
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  VALIDATION = 'VALIDATION',
  RATE_LIMIT = 'RATE_LIMIT',
  SERVER = 'SERVER',
  CSRF = 'CSRF',
  TIMEOUT = 'TIMEOUT',
  UNKNOWN = 'UNKNOWN'
}

/**
 * Interfaz de error estructurado
 */
export interface AppError {
  id: string;
  type: ErrorType;
  severity: ErrorSeverity;
  message: string;
  translationKey?: string;
  httpStatus?: number;
  userMessage: string;
  details?: any;
  timestamp: Date;
  context?: string;
  action?: {
    label: string;
    callback: () => void;
  };
}

/**
 * Servicio de Gestión de Errores
 * Centraliza el manejo de errores con categorización y traducción
 */
@Injectable({ providedIn: 'root' })
export class ErrorHandlingService {
  private errors$ = new BehaviorSubject<AppError[]>([]);
  private lastError$ = new BehaviorSubject<AppError | null>(null);
  private readonly MAX_ERRORS = 10;

  constructor(private i18n: I18nService) {}

  /**
   * Observable de errores activos
   */
  getErrors$(): Observable<AppError[]> {
    return this.errors$.asObservable();
  }

  /**
   * Observable del último error
   */
  getLastError$(): Observable<AppError | null> {
    return this.lastError$.asObservable();
  }

  /**
   * Obtiene errores activos
   */
  getErrors(): AppError[] {
    return this.errors$.value;
  }

  /**
   * Obtiene el último error
   */
  getLastError(): AppError | null {
    return this.lastError$.value;
  }

  /**
   * Maneja errores HTTP y los categoriza
   */
  handleHttpError(
    status: number,
    body?: any,
    url?: string,
    context?: string
  ): AppError {
    let type = ErrorType.UNKNOWN;
    let severity = ErrorSeverity.ERROR;
    let translationKey = 'error.500';

    switch (status) {
      case 400:
        type = ErrorType.VALIDATION;
        translationKey = 'error.422';
        break;
      case 401:
        type = ErrorType.AUTHENTICATION;
        translationKey = 'error.401';
        severity = ErrorSeverity.WARNING;
        break;
      case 403:
        type = ErrorType.AUTHORIZATION;
        translationKey = 'error.403';
        severity = ErrorSeverity.WARNING;
        break;
      case 404:
        translationKey = 'error.404';
        break;
      case 422:
        type = ErrorType.VALIDATION;
        translationKey = 'error.422';
        break;
      case 429:
        type = ErrorType.RATE_LIMIT;
        translationKey = 'error.429';
        severity = ErrorSeverity.WARNING;
        break;
      case 500:
        type = ErrorType.SERVER;
        translationKey = 'error.500';
        severity = ErrorSeverity.CRITICAL;
        break;
      case 502:
      case 503:
      case 504:
        type = ErrorType.SERVER;
        severity = ErrorSeverity.CRITICAL;
        break;
      case 0:
        type = ErrorType.NETWORK;
        translationKey = 'error.network';
        break;
    }

    return this.createError(
      type,
      severity,
      body?.message || this.i18n.translate(translationKey),
      translationKey,
      status,
      body,
      context,
      url
    );
  }

  /**
   * Maneja errores de red
   */
  handleNetworkError(error: any, url?: string, context?: string): AppError {
    return this.createError(
      ErrorType.NETWORK,
      ErrorSeverity.ERROR,
      this.i18n.translate('error.network'),
      'error.network',
      0,
      error,
      context,
      url
    );
  }

  /**
   * Maneja errores de timeout
   */
  handleTimeoutError(url?: string, context?: string): AppError {
    return this.createError(
      ErrorType.TIMEOUT,
      ErrorSeverity.WARNING,
      this.i18n.translate('error.timeout'),
      'error.timeout',
      408,
      null,
      context,
      url
    );
  }

  /**
   * Maneja errores de validación
   */
  handleValidationError(fields: { [key: string]: string[] }, context?: string): AppError {
    const fieldMessages = Object.entries(fields)
      .map(([field, errors]) => `${field}: ${errors.join(', ')}`)
      .join('; ');

    return this.createError(
      ErrorType.VALIDATION,
      ErrorSeverity.WARNING,
      fieldMessages,
      'error.422',
      422,
      fields,
      context
    );
  }

  /**
   * Crea un error estructurado y lo registra
   */
  private createError(
    type: ErrorType,
    severity: ErrorSeverity,
    message: string,
    translationKey?: string,
    httpStatus?: number,
    details?: any,
    context?: string,
    url?: string
  ): AppError {
    const error: AppError = {
      id: this.generateErrorId(),
      type,
      severity,
      message,
      translationKey,
      httpStatus,
      userMessage: this.i18n.translate(translationKey || 'error.500'),
      details: {
        ...details,
        url,
        timestamp: new Date().toISOString()
      },
      timestamp: new Date(),
      context
    };

    this.addError(error);
    this.logError(error);

    return error;
  }

  /**
   * Añade un error a la lista
   */
  private addError(error: AppError): void {
    const errors = this.errors$.value;

    // Limitar el número de errores almacenados
    if (errors.length >= this.MAX_ERRORS) {
      errors.shift();
    }

    errors.push(error);
    this.errors$.next([...errors]);
    this.lastError$.next(error);
  }

  /**
   * Limpia errores
   */
  clearErrors(): void {
    this.errors$.next([]);
    this.lastError$.next(null);
  }

  /**
   * Limpia el último error
   */
  clearLastError(): void {
    this.lastError$.next(null);
  }

  /**
   * Limpia un error específico por ID
   */
  clearError(errorId: string): void {
    const errors = this.errors$.value.filter(e => e.id !== errorId);
    this.errors$.next([...errors]);

    if (this.lastError$.value?.id === errorId) {
      this.lastError$.next(errors[errors.length - 1] || null);
    }
  }

  /**
   * Genera un ID único para el error
   */
  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Registra el error en consola con nivel apropiado
   */
  private logError(error: AppError): void {
    const logData = {
      id: error.id,
      type: error.type,
      message: error.message,
      context: error.context,
      timestamp: error.timestamp
    };

    switch (error.severity) {
      case ErrorSeverity.INFO:
        console.info('[INFO]', logData);
        break;
      case ErrorSeverity.WARNING:
        console.warn('[WARNING]', logData);
        break;
      case ErrorSeverity.ERROR:
        console.error('[ERROR]', logData);
        break;
      case ErrorSeverity.CRITICAL:
        console.error('[CRITICAL]', logData);
        // Aquí puedes enviar a un servicio de logging externo
        this.sendToRemoteLogger(error);
        break;
    }
  }

  /**
   * Envía errores críticos a un servicio de logging remoto
   * (Implementar según tu backend)
   */
  private sendToRemoteLogger(error: AppError): void {
    // TODO: Implementar envío a servidor de logs
    console.log('Sending critical error to remote logger:', error);
  }

  /**
   * Obtiene un mensaje de error amigable
   */
  getErrorMessage(error: AppError, includeDetails: boolean = false): string {
    let message = error.userMessage;

    if (includeDetails && error.details?.fieldErrors) {
      const fieldErrors = Object.entries(error.details.fieldErrors)
        .map(([field, errors]: [string, any]) => `${field}: ${(errors as string[]).join(', ')}`)
        .join('\n');
      message += `\n\n${fieldErrors}`;
    }

    return message;
  }

  /**
   * Obtiene errores de un tipo específico
   */
  getErrorsByType(type: ErrorType): AppError[] {
    return this.errors$.value.filter(e => e.type === type);
  }

  /**
   * Obtiene errores de una severidad específica
   */
  getErrorsBySeverity(severity: ErrorSeverity): AppError[] {
    return this.errors$.value.filter(e => e.severity === severity);
  }

  /**
   * Verifica si hay errores críticos
   */
  hasCriticalErrors(): boolean {
    return this.errors$.value.some(e => e.severity === ErrorSeverity.CRITICAL);
  }

  /**
   * Obtiene estadísticas de errores
   */
  getErrorStats() {
    const errors = this.errors$.value;
    return {
      total: errors.length,
      byType: this.groupBy(errors, 'type'),
      bySeverity: this.groupBy(errors, 'severity'),
      byContext: this.groupBy(errors, 'context')
    };
  }

  /**
   * Agrupa errores por una propiedad
   */
  private groupBy(errors: AppError[], property: keyof AppError): { [key: string]: number } {
    return errors.reduce(
      (acc, error) => {
        const key = String(error[property]);
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      },
      {} as { [key: string]: number }
    );
  }
}

