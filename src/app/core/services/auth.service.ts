import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
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

  constructor(
    private http: HttpClient,
    private router: Router
  ) {
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
   *
   * Logging detallado:
   * - Inicio del refresh
   * - Token utilizado
   * - Respuesta del servidor
   * - Actualización de tokens
   */
  refreshToken(refreshToken?: string): Observable<LoginResponseDTO> {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('🔵 [RefreshToken] INICIANDO REFRESH DE TOKEN');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('🔵 [RefreshToken] Timestamp:', new Date().toISOString());

    const token = refreshToken || this.getRefreshToken();
    console.log('🔵 [RefreshToken] Refresh token desde parámetro:', refreshToken ? '✅ SÍ' : '❌ NO');
    console.log('🔵 [RefreshToken] Refresh token desde storage:', this.getRefreshToken() ? '✅ SÍ' : '❌ NO');

    if (!token) {
      console.error('❌ [RefreshToken] No hay refresh token disponible');
      console.log('═══════════════════════════════════════════════════════════');
      return throwError(() => new Error('No refresh token available'));
    }

    console.log('🔵 [RefreshToken] Refresh token (primeros 20 chars):', token.substring(0, 20) + '...');

    const request = { refreshToken: token };
    console.log('🔵 [RefreshToken] Enviando request a:', this.REFRESH_ENDPOINT);

    return this.http.post<LoginResponseDTO>(this.REFRESH_ENDPOINT, request, { withCredentials: true }).pipe(
      tap((response: LoginResponseDTO) => {
        console.log('🔵 [RefreshToken] Respuesta del servidor:', response);

        // Normalizar el token (puede venir como 'token' o 'accessToken')
        const accessToken = response.token || response.accessToken;
        if (!accessToken) {
          console.error('❌ [RefreshToken] No access token en respuesta');
          throw new Error('No access token in response');
        }

        console.log('🔵 [RefreshToken] Access token recibido (primeros 20 chars):', accessToken.substring(0, 20) + '...');
        console.log('🔵 [RefreshToken] Refresh token recibido:', response.refreshToken ? '✅ SÍ (rotado)' : '❌ NO (mismo token)');

        // Actualizar tokens en sessionStorage
        console.log('🔵 [RefreshToken] Actualizando tokens en sessionStorage...');
        this.setTokens(accessToken, response.refreshToken || token);
        console.log('✅ [RefreshToken] Tokens actualizados correctamente');

        // Actualizamos el usuario si cambió
        const updatedUser = {
          email: response.email || '',
          name: response.name || '',
          roles: response.roles || (response.role ? [response.role] : []),
          mustChangePassword: response.mustChangePassword || false
        };
        console.log('🔵 [RefreshToken] Actualizando datos del usuario:', updatedUser);
        this.setCurrentUser(updatedUser);
        console.log('✅ [RefreshToken] Usuario actualizado');

        console.log('✅ [RefreshToken] REFRESH COMPLETADO EXITOSAMENTE');
        console.log('═══════════════════════════════════════════════════════════');
      }),
      catchError(error => {
        console.error('❌ [RefreshToken] Error en refresh:', error);
        console.log('🔵 [RefreshToken] Ejecutando logout...');
        this.logout();
        console.log('═══════════════════════════════════════════════════════════');
        return this.handleError(error);
      })
    );
  }

  /**
   * Realiza logout limpiando sesión
   *
   * @returns Observable<void>
   *
   * Logging detallado:
   * - Inicio del logout
   * - Limpieza de sessionStorage
   * - Actualización de estado
   */
  logout(): Observable<void> {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('🔵 [Logout] INICIANDO LOGOUT');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('🔵 [Logout] Timestamp:', new Date().toISOString());
    console.log('🔵 [Logout] Usuario actual:', this.getCurrentUser());
    console.log('🔵 [Logout] Enviando request a:', this.LOGOUT_ENDPOINT);

    return this.http.post<void>(this.LOGOUT_ENDPOINT, {}, { withCredentials: true }).pipe(
      tap(() => {
        console.log('🔵 [Logout] Respuesta del servidor: OK');
        console.log('🔵 [Logout] Limpiando sesión local...');
        this.clearSessionInternal();
        console.log('✅ [Logout] Sesión limpiada correctamente');
        console.log('═══════════════════════════════════════════════════════════');
      }),
      catchError((error) => {
        console.error('❌ [Logout] Error en logout del servidor:', error);
        console.log('🔵 [Logout] Limpiando sesión localmente (fallback)...');
        // Si el servidor falla, limpiar sesión localmente de todas formas
        this.clearSessionInternal();
        console.log('✅ [Logout] Sesión limpiada (fallback)');
        console.log('═══════════════════════════════════════════════════════════');
        return throwError(() => new Error('Logout failed'));
      })
    );
  }

  /**
   * Guarda los tokens en sessionStorage
   *
   * @param accessToken Token JWT de acceso
   * @param refreshToken Token JWT de refresco
   *
   * Logging:
   * - Tokens guardados (primeros 20 caracteres)
   * - Keys utilizadas
   * - Verificación post-guardado
   */
  setTokens(accessToken: string, refreshToken: string): void {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('🔵 [TokenStorage] setTokens() llamado');
    console.log('  - accessToken (primeros 30 chars):', accessToken.substring(0, 30) + '...');
    console.log('  - refreshToken (primeros 30 chars):', refreshToken.substring(0, 30) + '...');
    console.log('  - TOKEN_KEY:', this.TOKEN_KEY);
    console.log('  - REFRESH_TOKEN_KEY:', this.REFRESH_TOKEN_KEY);

    // Guardar tokens
    sessionStorage.setItem(this.TOKEN_KEY, accessToken);
    sessionStorage.setItem(this.REFRESH_TOKEN_KEY, refreshToken);

    // VERIFICAR INMEDIATAMENTE QUE SE GUARDARON
    const verifyAccessToken = sessionStorage.getItem(this.TOKEN_KEY);
    const verifyRefreshToken = sessionStorage.getItem(this.REFRESH_TOKEN_KEY);

    console.log('🔵 [TokenStorage] VERIFICACIÓN POST-GUARDADO:');
    console.log('  - accessToken verificado:', verifyAccessToken ? '✅ SÍ' : '❌ NO');
    console.log('  - refreshToken verificado:', verifyRefreshToken ? '✅ SÍ' : '❌ NO');

    if (!verifyAccessToken) {
      console.error('❌ [TokenStorage] ERROR: accessToken NO se guardó en sessionStorage!');
      console.error('  - Valor intentado:', accessToken.substring(0, 30) + '...');
      console.error('  - Key usada:', this.TOKEN_KEY);
      console.error('  - sessionStorage disponible:', typeof sessionStorage !== 'undefined');
    }

    if (!verifyRefreshToken) {
      console.error('❌ [TokenStorage] ERROR: refreshToken NO se guardó en sessionStorage!');
      console.error('  - Valor intentado:', refreshToken.substring(0, 30) + '...');
      console.error('  - Key usada:', this.REFRESH_TOKEN_KEY);
    }

    console.log('✅ [TokenStorage] Tokens guardados en sessionStorage');
    console.log('═══════════════════════════════════════════════════════════');
  }

  /**
   * Obtiene el token de acceso actual
   *
   * @returns Token JWT o null si no existe
   */
  getAccessToken(): string | null {
    const token = sessionStorage.getItem(this.TOKEN_KEY);
    console.log('🔵 [TokenStorage] getAccessToken():', token ? `✅ SÍ (${token.substring(0, 20)}...)` : '❌ NO');
    return token;
  }

  /**
   * Obtiene el refresh token actual
   *
   * @returns Refresh token o null si no existe
   */
  getRefreshToken(): string | null {
    const token = sessionStorage.getItem(this.REFRESH_TOKEN_KEY);
    console.log('🔵 [TokenStorage] getRefreshToken():', token ? `✅ SÍ (${token.substring(0, 20)}...)` : '❌ NO');
    return token;
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
    console.log('🔵 [Auth] setCurrentUser() llamado - Usuario:', user);
  }

  /**
   * Decodifica un JWT y extrae el payload
   *
   * @param token JWT token
   * @returns Payload decodificado o null si es inválido
   *
   * Logging:
   * - Token recibido
   * - Decodificación del JWT
   * - Payload extraído
   */
  decodeJwtToken(token: string): any {
    console.log('🔵 [Auth] Token recibido para decodificación');

    try {
      // Un token JWT tiene 3 partes separadas por puntos: header.payload.signature
      const parts = token.split('.');

      if (parts.length !== 3) {
        console.error('❌ [Auth] Token JWT inválido: no tiene 3 partes');
        return null;
      }

      // La parte del payload es la segunda (índice 1)
      const payload = parts[1];
      console.log('🔵 [Auth] Decodificando JWT (payload)...');

      // Decodificar base64url a base64 estándar
      const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');

      // Decodificar base64
      const decoded = atob(base64);
      console.log('🔵 [Auth] JWT decodificado:', decoded);

      // Parsear JSON
      const payloadObj = JSON.parse(decoded);
      console.log('🔵 [Auth] Payload parseado:', payloadObj);

      return payloadObj;
    } catch (error) {
      console.error('❌ [Auth] Error decodificando JWT:', error);
      return null;
    }
  }

  /**
   * Extrae el rol del token JWT
   *
   * @param token JWT token
   * @returns Rol del usuario o null si no se encuentra
   *
   * Busca el rol en los siguientes campos (por orden):
   * - role
   * - roles (array, toma el primero)
   * - authorities (array, toma el primero)
   * - http://schemas.microsoft.com/ws/2008/06/identity/claims/role (claim de Azure AD)
   */
  extractRoleFromToken(token: string): string | null {
    console.log('🔵 [Auth] extractRoleFromToken() llamado');
    console.log('🔵 [Auth] Token (primeros 30 chars):', token.substring(0, 30) + '...');

    const payload = this.decodeJwtToken(token);

    if (!payload) {
      console.error('❌ [Auth] No se pudo decodificar el payload del token');
      return null;
    }

    console.log('🔵 [Auth] Payload completo del JWT:', JSON.stringify(payload, null, 2));

    let role: string | null = null;

    // Intentar extraer el rol de diferentes campos posibles
    console.log('🔵 [Auth] Buscando rol en campos conocidos...');

    // Campo 1: role (simple)
    if (payload.role) {
      role = payload.role;
      console.log('🔵 [Auth] Rol encontrado en campo "role":', role);
    }
    // Campo 2: roles (array)
    else if (payload.roles && Array.isArray(payload.roles) && payload.roles.length > 0) {
      role = payload.roles[0];
      console.log('🔵 [Auth] Rol encontrado en campo "roles":', role);
    }
    // Campo 3: authorities (array, común en Spring Security)
    else if (payload.authorities && Array.isArray(payload.authorities) && payload.authorities.length > 0) {
      role = payload.authorities[0];
      console.log('🔵 [Auth] Rol encontrado en campo "authorities":', role);
    }
    // Campo 4: Azure AD claim
    else if (payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role']) {
      role = payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'];
      console.log('🔵 [Auth] Rol encontrado en claim de Azure AD');
    }
    // Campo 5: roles como string separado por comas
    else if (payload.roles && typeof payload.roles === 'string' && payload.roles.includes(',')) {
      role = payload.roles.split(',')[0].trim();
      console.log('🔵 [Auth] Rol encontrado en "roles" (string comma-separated):', role);
    }
    // Campo 6: role como string con prefijo ROLE_
    else if (payload.role && typeof payload.role === 'string' && payload.role.startsWith('ROLE_')) {
      role = payload.role.replace('ROLE_', '');
      console.log('🔵 [Auth] Rol encontrado con prefijo ROLE_, extraído:', role);
    }
    // Campo 7: Buscar en claims de Spring Security (formato común)
    else if (payload.claims && payload.claims.role) {
      role = payload.claims.role;
      console.log('🔵 [Auth] Rol encontrado en "claims.role":', role);
    }
    else {
      console.log('🔵 [Auth] Campo "role" no encontrado:', payload.role);
      console.log('🔵 [Auth] Campo "roles" no encontrado:', payload.roles);
      console.log('🔵 [Auth] Campo "authorities" no encontrado:', payload.authorities);
    }

    if (role) {
      console.log('✅ [Auth] Rol detectado:', role.toUpperCase());
      return role.toUpperCase();
    } else {
      console.warn('⚠️ [Auth] Rol no encontrado en token');
      console.log('🔵 [Auth] Campos disponibles en payload:', Object.keys(payload));
      return null;
    }
  }

  /**
   * Determina la ruta de destino según el rol del usuario
   *
   * @param role Rol del usuario
   * @returns Ruta a la que debe ser redirigido
   *
   * Mapeo de roles:
   * - ADMIN → /dashboard
   * - STOREKEEPER → /inventory
   * - KITCHEN → /dashboard
   * - WAITER → /dashboard
   * - CASHIER → /dashboard
   * - DEFAULT → /welcome
   */
  getRouteByRole(role: string): string {
    const normalizedRole = role ? role.toUpperCase() : '';

    console.log('🔵 [Auth] getRouteByRole() llamado con rol:', normalizedRole);

    // Mapa de roles a rutas
    const roleRoutes: Record<string, string> = {
      'ADMIN': '/dashboard',
      'STOREKEEPER': '/inventory',
      'KITCHEN': '/dashboard',
      'WAITER': '/dashboard',
      'CASHIER': '/dashboard'
    };

    const route = roleRoutes[normalizedRole];

    if (route) {
      console.log('🔵 [Auth] Ruta elegida para rol', normalizedRole, ':', route);
      return route;
    } else {
      console.log('🔵 [Auth] Rol', normalizedRole, 'no tiene ruta específica, redirigiendo a /welcome');
      return '/welcome';
    }
  }

  /**
   * Ejecuta la redirección basada en el rol del usuario
   *
   * @param role Rol del usuario (opcional, si no se proporciona se obtiene del usuario actual)
   *
   * Flujo:
   * 1. Obtener rol del usuario
   * 2. Determinar ruta según rol
   * 3. Ejecutar redirección con Router
   *
   * Logs:
   * - Inicio de redirección
   * - Rol actual
   * - Ruta elegida
   * - Redirección ejecutada
   */
  redirectUserByRole(role?: string): void {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('🔵 [Auth] Ejecutando redirección basada en rol');
    console.log('═══════════════════════════════════════════════════════════');

    // Si no se proporciona el rol, obtenerlo del usuario actual
    let userRole = role;

    if (!userRole) {
      const user = this.getCurrentUser();
      if (user && user.roles && user.roles.length > 0) {
        userRole = user.roles[0];
        console.log('🔵 [Auth] Rol obtenido del usuario actual:', userRole);
      } else {
        console.error('❌ [Auth] No se pudo determinar el rol del usuario');
        console.log('🔵 [Auth] Redirigiendo a /welcome por defecto');
        this.router.navigate(['/welcome'], { replaceUrl: true });
        console.log('═══════════════════════════════════════════════════════════');
        return;
      }
    }

    console.log('🔵 [Auth] Rol actual:', userRole);

    // Determinar ruta según rol
    const destinationRoute = this.getRouteByRole(userRole);
    console.log('🔵 [Auth] Redirigiendo a:', destinationRoute);

    // Ejecutar redirección
    this.router.navigate([destinationRoute], {
      replaceUrl: true,
      skipLocationChange: false
    }).then(() => {
      console.log('✅ [Auth] Redirección ejecutada exitosamente a:', destinationRoute);
      console.log('═══════════════════════════════════════════════════════════');
    }).catch(err => {
      console.error('❌ [Auth] Error en redirección:', err);
      console.log('═══════════════════════════════════════════════════════════');
    });
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
   * Limpia toda la sesión del usuario (interno, con logging)
   *
   * Logging:
   * - Keys eliminadas
   * - Estado actualizado
   */
  private clearSessionInternal(): void {
    console.log('🔵 [SessionClear] clearSessionInternal() llamado');
    console.log('  - Eliminando:', this.TOKEN_KEY);
    console.log('  - Eliminando:', this.REFRESH_TOKEN_KEY);
    console.log('  - Eliminando:', this.USER_KEY);
    console.log('  - Eliminando: temp_login_email');
    console.log('  - Eliminando: temp_login_token');

    sessionStorage.removeItem(this.TOKEN_KEY);
    sessionStorage.removeItem(this.REFRESH_TOKEN_KEY);
    sessionStorage.removeItem(this.USER_KEY);
    sessionStorage.removeItem('temp_login_email');
    sessionStorage.removeItem('temp_login_token');

    this.currentUserSubject.next(null);
    this.isAuthenticatedSubject.next(false);

    console.log('✅ [SessionClear] Sesión limpiada - isAuthenticated = false');
  }

  /**
   * Restaura la sesión desde el storage si existe
   *
   * Logging:
   * - Verificación de storage
   * - Sesión restaurada (sí/no)
   */
  private restoreSessionFromStorage(): void {
    console.log('🔵 [SessionRestore] restoreSessionFromStorage() llamado');

    const user = this.getUserFromStorage();
    const token = this.getAccessToken();

    console.log('🔵 [SessionRestore] Usuario en storage:', user ? '✅ SÍ' : '❌ NO');
    console.log('🔵 [SessionRestore] Token en storage:', token ? '✅ SÍ' : '❌ NO');

    if (user && token) {
      console.log('🔵 [SessionRestore] Restaurando sesión...');
      this.currentUserSubject.next(user);
      this.isAuthenticatedSubject.next(true);
      console.log('✅ [SessionRestore] Sesión restaurada - isAuthenticated = true');
    } else {
      console.log('🔵 [SessionRestore] No hay sesión para restaurar');
    }
  }

  /**
   * Obtiene el usuario del storage (interno)
   *
   * Logging:
   * - Usuario encontrado (sí/no)
   * - Datos del usuario (si existe)
   */
  private getUserFromStorage(): CurrentUser | null {
    const userJson = sessionStorage.getItem(this.USER_KEY);
    console.log('🔵 [UserStorage] getUserFromStorage():', userJson ? '✅ SÍ' : '❌ NO');

    if (userJson) {
      try {
        const user = JSON.parse(userJson);
        console.log('🔵 [UserStorage] Usuario:', user);
        return user;
      } catch (e) {
        console.error('❌ [UserStorage] Error parseando usuario:', e);
        return null;
      }
    }
    return null;
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
   *
   * Logging detallado para debugging:
   * - Inicio del flujo
   * - URL de redirección
   * - Estado de la sesión actual
   */
  loginWithGoogle(): void {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('🔵 [Google OAuth2] INICIANDO LOGIN CON GOOGLE');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('🔵 [Google OAuth2] Timestamp:', new Date().toISOString());
    console.log('🔵 [Google OAuth2] Estado actual de autenticación:', this.isAuthenticated());
    console.log('🔵 [Google OAuth2] Usuario actual:', this.getCurrentUser());

    const url = `${this.API_URL}/oauth2/authorize/google`;
    console.log('🔵 [Google OAuth2] URL de autorización:', url);
    console.log('🔵 [Google OAuth2] Redirigiendo al usuario...');

    // Guardar estado pre-login para posible recuperación
    sessionStorage.setItem('oauth2_pre_login_state', JSON.stringify({
      timestamp: new Date().toISOString(),
      hadUser: !!this.getCurrentUser(),
      hadToken: !!this.getAccessToken()
    }));

    console.log('🔵 [Google OAuth2] Estado pre-login guardado en sessionStorage');
    console.log('═══════════════════════════════════════════════════════════');

    window.location.href = url;
  }

  /**
   * Procesa el callback de OAuth2 con Google
   * Este método es llamado desde el OAuth2CallbackComponent
   *
   * @param params Query parameters del callback
   * @returns Objeto con el resultado del procesamiento
   *
   * Parámetros esperados:
   * - accessToken: Token JWT de acceso
   * - refreshToken: Token JWT de refresco
   * - email: Email del usuario
   * - name: Nombre del usuario
   * - role: Rol del usuario
   * - error: (opcional) Código de error
   */
  processGoogleCallback(params: { [key: string]: any }): {
    success: boolean;
    error?: string;
    user?: CurrentUser;
  } {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('🔵 [Google OAuth2] PROCESANDO CALLBACK');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('🔵 [Google OAuth2] Timestamp:', new Date().toISOString());
    console.log('🔵 [Google OAuth2] Query params recibidos:', params);

    // 1. Verificar si hay error
    const error = params['error'];
    if (error) {
      console.error('❌ [Google OAuth2] Error en callback:', error);
      console.log('═══════════════════════════════════════════════════════════');
      return { success: false, error };
    }

    // 2. Extraer parámetros
    const accessToken = params['accessToken'];
    const refreshToken = params['refreshToken'];
    const email = params['email'];
    const name = params['name'];
    const role = params['role'];

    console.log('🔵 [Google OAuth2] Extrayendo parámetros:');
    console.log('  - accessToken:', accessToken ? '✅ PRESENTE (' + accessToken.substring(0, 20) + '...)' : '❌ AUSENTE');
    console.log('  - refreshToken:', refreshToken ? '✅ PRESENTE (' + refreshToken.substring(0, 20) + '...)' : '❌ AUSENTE');
    console.log('  - email:', email || '❌ AUSENTE');
    console.log('  - name:', name || '❌ AUSENTE');
    console.log('  - role:', role || '❌ AUSENTE');

    // 3. Validar tokens requeridos
    if (!accessToken || !refreshToken) {
      console.error('❌ [Google OAuth2] TOKENS FALTANTES');
      console.error('  - accessToken:', accessToken ? 'presente' : 'FALTANTE');
      console.error('  - refreshToken:', refreshToken ? 'presente' : 'FALTANTE');
      console.log('═══════════════════════════════════════════════════════════');
      return { success: false, error: 'missing_tokens' };
    }

    // 4. Validar email requerido
    if (!email) {
      console.error('❌ [Google OAuth2] EMAIL FALTANTE');
      console.log('═══════════════════════════════════════════════════════════');
      return { success: false, error: 'missing_email' };
    }

    // 5. Guardar tokens
    console.log('🔵 [Google OAuth2] Guardando tokens en sessionStorage...');
    this.setTokens(accessToken, refreshToken);
    console.log('✅ [Google OAuth2] Tokens guardados correctamente');

    // 6. Determinar el rol del usuario
    let userRole = role ? role.toUpperCase() : null;

    console.log('🔵 [Google OAuth2] === DIAGNÓSTICO DE ROL ===');
    console.log('🔵 [Google OAuth2] role desde params:', role);
    console.log('🔵 [Google OAuth2] role.toUpperCase():', role ? role.toUpperCase() : 'null');
    console.log('🔵 [Google OAuth2] userRole inicial:', userRole);

    // Si el rol no viene en los query params, intentar extraerlo del token JWT
    if (!userRole) {
      console.log('🔵 [Google OAuth2] Rol no viene en query params, intentando extraer del token JWT...');
      const roleFromToken = this.extractRoleFromToken(accessToken);
      if (roleFromToken) {
        userRole = roleFromToken;
        console.log('✅ [Google OAuth2] Rol extraído del token JWT:', userRole);
      } else {
        console.warn('⚠️ [Google OAuth2] No se pudo extraer rol del token, usando USER por defecto');
        userRole = 'USER';
      }
    } else {
      console.log('✅ [Google OAuth2] Rol recibido del backend:', userRole);
    }

    console.log('🔵 [Google OAuth2] userRole final:', userRole);
    console.log('🔵 [Google OAuth2] ============================');

    const userName = name || email.split('@')[0];

    const user: CurrentUser = {
      email: email,
      name: userName,
      roles: [userRole],
      mustChangePassword: false
    };

    console.log('🔵 [Google OAuth2] Guardando datos del usuario:', user);
    this.setCurrentUser(user);
    console.log('✅ [Google OAuth2] Usuario guardado correctamente');

    // 7. Actualizar estado de autenticación
    this.isAuthenticatedSubject.next(true);
    console.log('✅ [Google OAuth2] Estado de autenticación actualizado: isAuthenticated = true');

    // 8. Limpiar estado pre-login
    sessionStorage.removeItem('oauth2_pre_login_state');
    console.log('🔵 [Google OAuth2] Estado pre-login eliminado');

    console.log('✅ [Google OAuth2] CALLBACK PROCESADO EXITOSAMENTE');
    console.log('🔵 [Google OAuth2] Usuario autenticado:', user);
    console.log('═══════════════════════════════════════════════════════════');

    return { success: true, user };
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
