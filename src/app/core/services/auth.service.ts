import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError, of } from 'rxjs';
import { tap, catchError, switchMap } from 'rxjs/operators';
import { environment } from '../../../enviroments/enviroment';
import { LoginRequestDTO } from '../dtos/login-request.dto';
import { LoginResponseDTO, ErrorResponseDTO } from '../dtos/login-response.dto';

/**
 * Error especial para 2FA requerido
 */
interface TwoFactorRequiredError {
  status: number;
  is2faRequired: boolean;
  message: string;
}

/**
 * Modelo de usuario actual
 */
export interface CurrentUser {
  email: string;
  name: string;
  roles: string[];
  mustChangePassword: boolean;
}

/**
 * AuthService
 * Servicio centralizado para autenticación y gestión de sesión
 * Maneja login, refresh de tokens, logout usando cookies HttpOnly
 */
@Injectable({ providedIn: 'root' })
export class AuthService {

  // URLs base
  private readonly API_URL = environment.apiUrl;
  private readonly AUTH_ENDPOINT = `${this.API_URL}${environment.auth.endpoints.login}`;
  private readonly REFRESH_ENDPOINT = `${this.API_URL}${environment.auth.endpoints.refresh}`;
  private readonly LOGOUT_ENDPOINT = `${this.API_URL}${environment.auth.endpoints.logout}`;

  // Storage keys
  private readonly TOKEN_KEY = environment.auth.tokenKey;
  private readonly REFRESH_TOKEN_KEY = environment.auth.refreshTokenKey;
  private readonly USER_KEY = environment.auth.userKey;

  // BehaviorSubjects para reactividad
  private currentUserSubject = new BehaviorSubject<CurrentUser | null>(this.getUserFromStorage());
  public currentUser$ = this.currentUserSubject.asObservable();

  private isAuthenticatedSubject = new BehaviorSubject<boolean>(!!this.getUserFromStorage());
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

  constructor(private http: HttpClient) {
    this.restoreSessionFromStorage();
  }

  /**
   * Realiza login con email, contraseña y token de reCAPTCHA
   *
   * @param email Email del usuario
   * @param password Contraseña del usuario
   * @param recaptchaToken Token de reCAPTCHA v3 de Google
   * @returns Observable<LoginResponseDTO> con tokens, usuario y roles
   *
   * Posibles errores:
   * - 400: reCAPTCHA inválido
   * - 401: Credenciales incorrectas
   * - 403: Cuenta deshabilitada
   * - 422: Validación fallida
   * - 429: Demasiados intentos (rate limit)
   * - 500: Error del servidor
   */
  login(email: string, password: string, recaptchaToken: string): Observable<LoginResponseDTO> {
    const request: LoginRequestDTO = {
      email,
      password,
      recaptchaToken
    };

    return this.http.post<LoginResponseDTO>(this.AUTH_ENDPOINT, request, { withCredentials: true }).pipe(
      switchMap((response: LoginResponseDTO) => {
        console.log('🔵 Login response:', response);
        console.log('🔵 response.message:', response.message);
        console.log('🔵 response.tempToken:', response.tempToken);
        console.log('🔵 response.requiresTwoFactor:', response.requiresTwoFactor);

        // CASO 1: El backend indica que requiere 2FA (con tempToken o flag)
        if (response.tempToken || response.requiresTwoFactor) {
          console.log('🔵 CASO 1: 2FA con tempToken/flag');
          // Guardar token temporal
          if (response.tempToken) {
            this.setTempToken(response.tempToken);
          }
          // Guardar información del usuario si viene
          if (response.email) {
            this.setCurrentUser({
              email: response.email,
              name: response.name || '',
              roles: response.roles || (response.role ? [response.role] : []),
              mustChangePassword: response.mustChangePassword || false
            });
          }
          // Retornar error especial para redirigir a 2FA
          return throwError(() => ({
            status: 401,
            is2faRequired: true,
            tempToken: response.tempToken,
            message: response.message || 'Verificación en 2 pasos requerida'
          }));
        }

        // CASO 2: Mensaje de 2FA sin tempToken (backend alternativo)
        const msg = response.message || '';
        console.log('🔵 Verificando si es mensaje de 2FA:', msg);
        const is2faMessage = msg.includes('2 pasos') || msg.includes('2FA') || msg.includes('código') || msg.includes('Verificación');
        console.log('🔵 is2faMessage:', is2faMessage);

        if (response.message && is2faMessage) {
          console.log('🔵 CASO 2: 2FA solo con mensaje');
          // Guardar email del login para usar en verify-2fa
          sessionStorage.setItem('temp_login_email', email);

          const user = this.getCurrentUser();
          console.log('🔵 user antes de actualizar:', user);
          if (user) {
            this.setCurrentUser({
              ...user,
              mustChangePassword: true
            });
          } else {
            // Si no hay usuario, crear uno temporal con el email del login
            console.log('🔵 Creando usuario temporal con email del login');
            this.setCurrentUser({
              email: email,
              name: '',
              roles: [],
              mustChangePassword: false
            });
          }
          return throwError(() => ({
            status: 401,
            is2faRequired: true,
            message: response.message,
            email: email // Pasar email del login
          }));
        }

        // Normalizar el token (puede venir como 'token' o 'accessToken')
        let accessToken = response.token || response.accessToken;

        // CASO 3: Usuario debe cambiar contraseña (primer login)
        if (response.mustChangePassword) {
          console.log('🔵 CASO 3: mustChangePassword=true');
          // Guardar token temporal si existe
          if (accessToken) {
            this.setTempToken(accessToken);
          }
          // Guardar información del usuario
          this.setCurrentUser({
            email: response.email || '',
            name: response.name || '',
            roles: response.roles || (response.role ? [response.role] : []),
            mustChangePassword: true
          });
          // Retornar respuesta para que el componente decida
          return of(response);
        }

        // CASO 4: Login normal - guardar tokens y usuario
        if (!accessToken) {
          console.error('❌ CASO 4: No access token in response:', response);
          return throwError(() => new Error('No access token in response'));
        }

        console.log('🔵 CASO 5: Login exitoso');
        // Guardar tokens en sessionStorage
        this.setTokens(accessToken, response.refreshToken || '');
        // Guardar usuario actual
        this.setCurrentUser({
          email: response.email || '',
          name: response.name || '',
          roles: response.roles || (response.role ? [response.role] : []),
          mustChangePassword: response.mustChangePassword || false
        });
        // Actualizar estado
        this.isAuthenticatedSubject.next(true);

        return of(response);
      }),
      catchError(error => {
        console.log('🔵 catchError:', error);
        // Manejar caso especial: 2FA requerido
        if (error?.is2faRequired) {
          console.log('🔵 2FA capturado - redirigiendo');
          // Propagar el error especial
          return throwError(() => error);
        }
        return this.handleError(error);
      })
    );
  }

  /**
   * Refresca el token de acceso usando el refresh token
   * Se llama automáticamente cuando el token expira
   *
   * @param refreshToken Token de refresco (opcional, se obtiene de storage)
   * @returns Observable<LoginResponseDTO> con nuevo access token
   */
  refreshToken(refreshToken?: string): Observable<LoginResponseDTO> {
    const token = refreshToken || this.getRefreshToken();

    if (!token) {
      return throwError(() => new Error('No refresh token available'));
    }

    const request = { refreshToken: token };

    return this.http.post<LoginResponseDTO>(this.REFRESH_ENDPOINT, request, { withCredentials: true }).pipe(
      tap((response: LoginResponseDTO) => {
        // Normalizar el token (puede venir como 'token' o 'accessToken')
        const accessToken = response.token || response.accessToken;
        if (!accessToken) {
          throw new Error('No access token in response');
        }

        // Actualizar tokens en sessionStorage
        this.setTokens(accessToken, response.refreshToken || '');
        // Actualizamos el usuario si cambió
        this.setCurrentUser({
          email: response.email || '',
          name: response.name || '',
          roles: response.roles || (response.role ? [response.role] : []),
          mustChangePassword: response.mustChangePassword || false
        });
      }),
      catchError(error => {
        this.logout();
        return this.handleError(error);
      })
    );
  }

  /**
   * Realiza logout limpiando sesión
   *
   * @returns Observable<void>
   */
  logout(): Observable<void> {
    return this.http.post<void>(this.LOGOUT_ENDPOINT, {}, { withCredentials: true }).pipe(
      tap(() => this.clearSessionInternal()),
      catchError(() => {
        // Si el servidor falla, limpiar sesión localmente de todas formas
        this.clearSessionInternal();
        return throwError(() => new Error('Logout failed'));
      })
    );
  }

  /**
   * Guarda los tokens en sessionStorage
   *
   * @param accessToken Token JWT de acceso
   * @param refreshToken Token JWT de refresco
   */
  setTokens(accessToken: string, refreshToken: string): void {
    sessionStorage.setItem(this.TOKEN_KEY, accessToken);
    sessionStorage.setItem(this.REFRESH_TOKEN_KEY, refreshToken);
  }

  /**
   * Obtiene el token de acceso actual
   *
   * @returns Token JWT o null si no existe
   */
  getAccessToken(): string | null {
    return sessionStorage.getItem(this.TOKEN_KEY);
  }

  /**
   * Obtiene el refresh token actual
   *
   * @returns Refresh token o null si no existe
   */
  getRefreshToken(): string | null {
    return sessionStorage.getItem(this.REFRESH_TOKEN_KEY);
  }

  /**
   * Obtiene el usuario autenticado actual (síncrono, desde state)
   *
   * @returns Usuario actual o null
   */
  getCurrentUser(): CurrentUser | null {
    return this.currentUserSubject.value;
  }

  /**
   * Verifica si el usuario está autenticado localmente
   *
   * @returns true si tiene usuario en storage
   */
  isAuthenticated(): boolean {
    return !!this.currentUserSubject.value;
  }

  /**
   * Obtiene los roles del usuario actual
   *
   * @returns Array de roles (ej: ['ADMIN', 'STAFF'])
   */
  getCurrentUserRoles(): string[] {
    return this.currentUserSubject.value?.roles || [];
  }

  /**
   * Verifica si el usuario tiene un rol específico
   *
   * @param role Rol a verificar (ej: 'ADMIN')
   * @returns true si el usuario tiene el rol
   */
  hasRole(role: string): boolean {
    return this.getCurrentUserRoles().includes(role);
  }

  /**
   * Verifica si el usuario tiene alguno de los roles especificados
   *
   * @param roles Array de roles
   * @returns true si el usuario tiene al menos uno de los roles
   */
  hasAnyRole(...roles: string[]): boolean {
    return roles.some(role => this.hasRole(role));
  }

  /**
   * Guarda el usuario actual en state y storage
   *
   * @param user Datos del usuario
   */
  setCurrentUser(user: CurrentUser): void {
    this.currentUserSubject.next(user);
    sessionStorage.setItem(this.USER_KEY, JSON.stringify(user));
  }

  /**
   * Limpia toda la sesión del usuario (público para usar en logout forzado)
   */
  clearSession(): void {
    sessionStorage.removeItem(this.TOKEN_KEY);
    sessionStorage.removeItem(this.REFRESH_TOKEN_KEY);
    sessionStorage.removeItem(this.USER_KEY);
    sessionStorage.removeItem('temp_login_email');
    sessionStorage.removeItem('temp_login_token');
    this.currentUserSubject.next(null);
    this.isAuthenticatedSubject.next(false);
  }

  /**
   * Limpia toda la sesión del usuario
   */
  private clearSessionInternal(): void {
    sessionStorage.removeItem(this.TOKEN_KEY);
    sessionStorage.removeItem(this.REFRESH_TOKEN_KEY);
    sessionStorage.removeItem(this.USER_KEY);
    sessionStorage.removeItem('temp_login_email');
    sessionStorage.removeItem('temp_login_token');
    this.currentUserSubject.next(null);
    this.isAuthenticatedSubject.next(false);
  }

  /**
   * Restaura la sesión desde el storage si existe
   */
  private restoreSessionFromStorage(): void {
    const user = this.getUserFromStorage();
    const token = this.getAccessToken();
    if (user && token) {
      this.currentUserSubject.next(user);
      this.isAuthenticatedSubject.next(true);
    }
  }

  /**
   * Obtiene el usuario del storage
   */
  private getUserFromStorage(): CurrentUser | null {
    const userJson = sessionStorage.getItem(this.USER_KEY);
    return userJson ? JSON.parse(userJson) : null;
  }

  /**
   * Maneja errores HTTP y proporciona mensajes claros
   */
  private handleError(error: any) {
    let errorMessage = 'Error desconocido';

    if (error.error instanceof ErrorEvent) {
      // Error del cliente
      errorMessage = error.error.message;
    } else {
      // Error del servidor
      const status = error.status;
      const body = error.error;

      switch (status) {
        case 400:
          errorMessage = body?.message || 'reCAPTCHA inválido o validación fallida';
          break;
        case 401:
          errorMessage = 'Email o contraseña incorrectos';
          break;
        case 403:
          errorMessage = 'Cuenta deshabilitada. Contacta con administración';
          break;
        case 422:
          errorMessage = body?.message || 'Datos de entrada inválidos';
          break;
        case 429:
          errorMessage = 'Demasiados intentos. Intenta más tarde';
          break;
        case 500:
          errorMessage = 'Error del servidor. Intenta más tarde';
          break;
        default:
          errorMessage = body?.message || 'Error al procesar la solicitud';
      }
    }

    console.error('Auth error:', error);
    return throwError(() => new Error(errorMessage));
  }

  /**
   * Login con Google OAuth2
   * Inicia el flujo OAuth2 redirigiendo al backend
   *
   * El backend se encarga de:
   * 1. Redirigir a Google para autenticación
   * 2. Recibir el callback con el código de autorización
   * 3. Intercambiar el código por tokens
   * 4. Redirigir al frontend con los tokens
   */
  loginWithGoogle(): void {
    const url = `${this.API_URL}/oauth2/authorize/google`;
    console.log('🔵 Iniciando login con Google...');
    console.log('🔵 URL:', `${this.API_URL}/oauth2/authorize/google`);
    window.location.href = url;
  }

  /**
   * Paso 2: Verifica el código 2FA
   *
   * @param code Código de 6 dígitos
   * @param email Email del usuario (opcional, se usa si no hay tempToken)
   * @returns Observable<LoginResponseDTO> con tokens actualizados
   *
   * Posibles errores:
   * - 401: Código inválido
   * - 403: Token expirado
   * - 500: Error del servidor
   */
  verify2fa(code: string, email?: string): Observable<LoginResponseDTO> {
    // Usar tempToken preferiblemente
    const tempToken = this.getTempToken();

    const headers: any = {
      'Content-Type': 'application/json'
    };

    const body: any = { code };

    // Si hay tempToken, usarlo para autenticación
    if (tempToken) {
      headers['Authorization'] = `Bearer ${tempToken}`;
      console.log('🔵 verify2fa: usando tempToken');
    } else if (email) {
      // Si no hay tempToken, enviar email (flujo alternativo)
      body.email = email;
      console.log('🔵 verify2fa: usando email');
    } else {
      console.error('❌ verify2fa: no hay tempToken ni email');
      return throwError(() => new Error('No tempToken or email available'));
    }

    return this.http.post<LoginResponseDTO>(
      `${this.API_URL}/api/auth/verify-2fa`,
      body,
      {
        headers,
        withCredentials: true
      }
    ).pipe(
      tap((response: LoginResponseDTO) => {
        console.log('🔵 verify2fa response:', response);
        console.log('🔵 mustChangePassword:', response.mustChangePassword);

        const accessToken = response.token || response.accessToken;

        // Si debe cambiar contraseña, guardar token temporal para usar en force-password-change
        if (response.mustChangePassword && accessToken) {
          console.log('🔵 mustChangePassword=true, guardando accessToken como tempToken');
          this.setTempToken(accessToken);
        } else if (accessToken) {
          // Login normal - guardar tokens
          this.setTokens(accessToken, response.refreshToken || '');
          this.clearTempToken();
        }

        this.setCurrentUser({
          email: response.email || '',
          name: response.name || '',
          roles: response.roles || (response.role ? [response.role] : []),
          mustChangePassword: response.mustChangePassword || false
        });
        this.isAuthenticatedSubject.next(true);
      }),
      catchError(error => this.handleError(error))
    );
  }

  /**
   * Paso 3: Cambio forzado de contraseña (primer login)
   *
   * @param temporaryPassword Contraseña temporal recibida por email
   * @param newPassword Nueva contraseña del usuario
   * @param email Email del usuario (opcional, se usa si no hay token)
   * @returns Observable<LoginResponseDTO> con tokens actualizados
   *
   * Posibles errores:
   * - 400: Contraseña débil o inválida
   * - 401: Contraseña temporal incorrecta
   * - 403: Token expirado
   * - 409: Misma contraseña
   * - 500: Error del servidor
   */
  forcePasswordChange(temporaryPassword: string, newPassword: string, email?: string): Observable<LoginResponseDTO> {
    // Usar tempToken preferiblemente (flujo después de 2FA)
    const tempToken = this.getTempToken();
    const accessToken = this.getAccessToken();

    const headers: any = {
      'Content-Type': 'application/json'
    };

    const body: any = {
      currentPassword: temporaryPassword,  // El backend espera 'currentPassword'
      newPassword
    };

    // Si hay tempToken, usarlo (flujo normal después de 2FA)
    if (tempToken) {
      headers['Authorization'] = `Bearer ${tempToken}`;
      console.log('🔵 forcePasswordChange: usando tempToken');
    } else if (accessToken) {
      // Si no, usar accessToken (flujo alternativo)
      headers['Authorization'] = `Bearer ${accessToken}`;
      console.log('🔵 forcePasswordChange: usando accessToken');
    } else {
      console.error('❌ forcePasswordChange: no hay token disponible');
    }

    // Si hay email, enviarlo (para cuando no hay token)
    if (email) {
      body.email = email;
    }

    return this.http.post<LoginResponseDTO>(
      `${this.API_URL}/api/auth/force-password-change`,
      body,
      {
        headers,
        withCredentials: true
      }
    ).pipe(
      tap((response: LoginResponseDTO) => {
        console.log('🔵 forcePasswordChange response:', response);
        // Actualizar usuario - ya no debe cambiar contraseña
        this.setCurrentUser({
          email: response.email || '',
          name: response.name || '',
          roles: response.roles || (response.role ? [response.role] : []),
          mustChangePassword: false
        });
      }),
      catchError(error => {
        console.log('🔵 forcePasswordChange error:', error);
        console.log('🔵 error.status:', error.status);
        console.log('🔵 error.error:', error.error);
        console.log('🔵 error.error.message:', error.error?.message);
        console.log('🔵 error.error.errors:', error.error?.errors);
        return this.handleError(error);
      })
    );
  }

  /**
   * Guarda el token temporal para el flujo de primer login
   * Se usa entre el paso 1 y 2
   */
  setTempToken(token: string): void {
    sessionStorage.setItem('temp_login_token', token);
  }

  /**
   * Obtiene el token temporal
   */
  getTempToken(): string | null {
    return sessionStorage.getItem('temp_login_token');
  }

  /**
   * Limpia el token temporal
   */
  clearTempToken(): void {
    sessionStorage.removeItem('temp_login_token');
  }
}
