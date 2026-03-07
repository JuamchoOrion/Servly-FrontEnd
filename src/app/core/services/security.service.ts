import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../../enviroments/enviroment';

/**
 * Servicio de Seguridad
 * Maneja:
 * - CSRF token validation
 * - Input sanitization
 * - Security headers
 */
@Injectable({ providedIn: 'root' })
export class SecurityService {
  private csrfToken$ = new BehaviorSubject<string | null>(null);
  private readonly CSRF_TOKEN_KEY = 'X-CSRF-TOKEN';
  private readonly CSRF_HEADER_NAME = 'X-CSRF-TOKEN';

  constructor(private http: HttpClient) {
    this.initializeCsrfToken();
  }

  /**
   * Obtiene el token CSRF del servidor
   */
  private initializeCsrfToken(): void {
    this.http.get<{ token: string }>(`${environment.apiUrl}/api/security/csrf-token`)
      .subscribe({
        next: (response) => {
          this.csrfToken$.next(response.token);
          sessionStorage.setItem(this.CSRF_TOKEN_KEY, response.token);
        },
        error: (err) => {
          console.warn('No se pudo obtener token CSRF:', err);
          // Generar un token local como fallback
          const localToken = this.generateLocalCsrfToken();
          this.csrfToken$.next(localToken);
          sessionStorage.setItem(this.CSRF_TOKEN_KEY, localToken);
        }
      });
  }

  /**
   * Obtiene el token CSRF actual
   */
  getCsrfToken(): string | null {
    return this.csrfToken$.value || sessionStorage.getItem(this.CSRF_TOKEN_KEY);
  }

  /**
   * Obtiene los headers con CSRF token
   */
  getSecurityHeaders(): HttpHeaders {
    const token = this.getCsrfToken();
    let headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });

    if (token) {
      headers = headers.set(this.CSRF_HEADER_NAME, token);
    }

    return headers;
  }

  /**
   * Sanitiza input para prevenir XSS
   * @param input String a sanitizar
   */
  sanitizeInput(input: string): string {
    const textarea = document.createElement('textarea');
    textarea.textContent = input;
    return textarea.innerHTML;
  }

  /**
   * Valida que un email sea válido
   */
  validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Valida que una contraseña cumpla con estándares de seguridad
   * - Mínimo 6 caracteres
   * - Máximo 128 caracteres
   * - Contiene al menos un número o símbolo especial (recomendado)
   */
  validatePassword(password: string): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!password || password.length < 6) {
      errors.push('Mínimo 6 caracteres');
    }
    if (password.length > 128) {
      errors.push('Máximo 128 caracteres');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Valida JWT localmente (sin verificar firma)
   * Solo valida estructura y expiración
   */
  validateJwt(token: string): {
    isValid: boolean;
    expired: boolean;
    errors: string[];
  } {
    const errors: string[] = [];
    let expired = false;

    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        errors.push('Formato JWT inválido');
        return { isValid: false, expired: false, errors };
      }

      const payload = JSON.parse(atob(parts[1]));

      if (payload.exp) {
        const expirationTime = payload.exp * 1000;
        const now = Date.now();

        if (now > expirationTime) {
          expired = true;
          errors.push('Token expirado');
        }
      }

      return {
        isValid: errors.length === 0,
        expired,
        errors
      };
    } catch (error) {
      errors.push('Error al validar token');
      return { isValid: false, expired: false, errors };
    }
  }

  /**
   * Genera un token CSRF local (fallback)
   */
  private generateLocalCsrfToken(): string {
    return 'csrf_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
  }

  /**
   * Limpia sesión de seguridad
   */
  clearSecuritySession(): void {
    sessionStorage.removeItem(this.CSRF_TOKEN_KEY);
    this.csrfToken$.next(null);
  }
}

