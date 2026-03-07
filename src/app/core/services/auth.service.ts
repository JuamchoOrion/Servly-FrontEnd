import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { environment } from '../../../enviroments/enviroment';
import { LoginRequestDTO } from '../dtos/login-request.dto';
import { LoginResponseDTO, ErrorResponseDTO } from '../dtos/login-response.dto';
import { throwError } from 'rxjs';

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
      tap((response: LoginResponseDTO) => {
        // Normalizar el token (puede venir como 'token' o 'accessToken')
        const accessToken = response.token || response.accessToken;
        if (!accessToken) {
          throw new Error('No access token in response');
        }

        // Guardar tokens en sessionStorage
        this.setTokens(accessToken, response.refreshToken);
        // Guardar usuario actual
        this.setCurrentUser({
          email: response.email,
          name: response.name,
          roles: response.roles || (response.role ? [response.role] : []),
          mustChangePassword: response.mustChangePassword
        });
        // Actualizar estado
        this.isAuthenticatedSubject.next(true);
      }),
      catchError(error => this.handleError(error))
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
        this.setTokens(accessToken, response.refreshToken);
        // Actualizamos el usuario si cambió
        this.setCurrentUser({
          email: response.email,
          name: response.name,
          roles: response.roles || (response.role ? [response.role] : []),
          mustChangePassword: response.mustChangePassword
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
      tap(() => this.clearSession()),
      catchError(() => {
        // Si el servidor falla, limpiar sesión localmente de todas formas
        this.clearSession();
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
   * Limpia toda la sesión del usuario
   */
  private clearSession(): void {
    sessionStorage.removeItem(this.TOKEN_KEY);
    sessionStorage.removeItem(this.REFRESH_TOKEN_KEY);
    sessionStorage.removeItem(this.USER_KEY);
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
}
