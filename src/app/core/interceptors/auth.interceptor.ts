import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';
import { BehaviorSubject, catchError, filter, switchMap, take, throwError } from 'rxjs';
let isRefreshing = false;
const refreshTokenSubject = new BehaviorSubject<string | null>(null);
/**
 * AuthInterceptor
 * Intercepta todas las solicitudes HTTP para:
 * 1. Adjuntar el access token en headers (Authorization: Bearer)
 * 2. Enviar/recibir cookies (withCredentials: true)
 * 3. Manejar refresh automático cuando el token expira (401)
 * 4. Redirigir a login si ambos tokens están inválidos
 *
 * Logging detallado para debugging:
 * - Cada request interceptada
 * - Token adjuntado (sí/no)
 * - Refresh token ejecutado
 * - Errores 401 manejados
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // URLs excluidas (no requieren token)
  const excludedUrls = [
    '/oauth2/',
    '/login/oauth2/',
    '/api/auth/login',
    '/api/auth/verify-2fa',
    '/api/auth/refresh',
  ];

  const isExcluded = excludedUrls.some(url => req.url.includes(url));

  // Logging para requests excluidos
  if (isExcluded) {
    console.log('🔵 [AuthInterceptor] Request EXCLUIDO (no requiere token):', req.method, req.url);
    return next(req.clone({
      withCredentials: true,
      setHeaders: { 'Content-Type': 'application/json' }
    }));
  }

  // Usar tempToken preferiblemente (flujo 2FA -> force-password-change)
  let token = authService.getTempToken();
  if (!token) {
    token = authService.getAccessToken();
  }

  const tokenType = authService.getTempToken() ? 'tempToken' : 'accessToken';
  console.log('🔵 [AuthInterceptor] Request interceptada:', req.method, req.url);
  console.log('🔵 [AuthInterceptor] Token disponible:', token ? `✅ SÍ (${tokenType})` : '❌ NO');

  // Verificar si es FormData (multipart/form-data)
  const isFormData = req.body instanceof FormData;

  // Adjuntar token + withCredentials en todas las requests
  // NO establecer Content-Type para FormData (Angular lo hace automáticamente)
  const authReq = token
    ? req.clone({
        withCredentials: true,
        setHeaders: isFormData
          ? { Authorization: `Bearer ${token}` }
          : {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
      })
    : req.clone({
        withCredentials: true,
        setHeaders: isFormData
          ? {}
          : { 'Content-Type': 'application/json' }
      });

  console.log('🔵 [AuthInterceptor] Request modificada - Authorization header:', token ? 'AGREGADO' : 'NO AGREGADO');

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      console.log('🔵 [AuthInterceptor] Error en request:', req.method, req.url);
      console.log('🔵 [AuthInterceptor] Status:', error.status);
      console.log('🔵 [AuthInterceptor] Error:', error);

      // Manejar error MustChangePasswordException (403)
      // Redirigir inmediatamente a force-password-change
      if (error.status === 403) {
        const errorMessage = error.error?.message || '';
        if (errorMessage.includes('Debe cambiar su contraseña') ||
            errorMessage.includes('mustChangePassword') ||
            errorMessage.includes('force-password-change')) {
          console.log('🔵 [AuthInterceptor] MustChangePasswordException detectada, redirigiendo...');
          router.navigate(['/auth/force-password-change']);
          return throwError(() => error);
        }
      }

      if (error.status === 401) {
        console.log('🔵 [AuthInterceptor] Error 401 - Token posiblemente expirado');
        console.log('🔵 [AuthInterceptor] Request URL:', req.url);

        // Si es el endpoint de login, NO intentar refresh - dejar que el componente maneje el error
        if (req.url.includes('/api/auth/login')) {
          console.log('🔵 [AuthInterceptor] 401 en /login - pasando error al componente');
          console.log('🔵 [AuthInterceptor] Error completo:', error);
          console.log('🔵 [AuthInterceptor] error.error:', error.error);
          return throwError(() => error);
        }

        // No hacer refresh si la solicitud ya es al endpoint de refresh
        if (req.url.includes('/api/auth/refresh')) {
          console.log('🔵 [AuthInterceptor] Request es /refresh - no intentar refresh recursivo');
          authService.logout().subscribe({
            next: () => {
              console.log('🔵 [AuthInterceptor] Logout ejecutado, redirigiendo a /login');
              router.navigate(['/login']);
            },
            error: (err) => {
              console.error('❌ [AuthInterceptor] Error en logout:', err);
              router.navigate(['/login']);
            }
          });
          return throwError(() => new Error('Token expirado'));
        }

        // Si es tempToken y la petición es a force-password-change, NO redirigir
        // Dejar que el componente maneje el error (contraseña temporal incorrecta)
        const tempToken = authService.getTempToken();
        if (tempToken && req.url.includes('/api/auth/force-password-change')) {
          console.log('🔵 [AuthInterceptor] 401 en force-password-change con tempToken, pasando error al componente');
          return throwError(() => error);
        }
        if (window.location.pathname.includes('/oauth2/callback')) {
          console.log('🔵 [AuthInterceptor] OAuth callback en progreso - interceptor omitido');
          return next(req);
        }
        // Para otras peticiones con tempToken, limpiar sesión
        if (tempToken) {
          console.log('🔵 [AuthInterceptor] tempToken inválido en otra petición, redirigiendo a login');
          authService.clearSession();
          router.navigate(['/login']);
          return throwError(() => new Error('Token temporal inválido'));
        }

        const refreshToken = authService.getRefreshToken();
        console.log('🔵 [AuthInterceptor] Refresh token disponible:', refreshToken ? '✅ SÍ' : '❌ NO');

        if (refreshToken) {
          console.log('🔵 [AuthInterceptor] Intentando refresh token...');
          return authService.refreshToken(refreshToken).pipe(
            switchMap(() => {
              console.log('🔵 [AuthInterceptor] Refresh exitoso - obteniendo nuevo token');
              // Reintentar la request original con el nuevo token
              const newToken = authService.getAccessToken();
              console.log('🔵 [AuthInterceptor] Nuevo token obtenido:', newToken ? '✅ SÍ' : '❌ NO');

              // Mantener el mismo Content-Type que la request original
              const retryReq = req.clone({
                withCredentials: true,
                setHeaders: {
                  Authorization: `Bearer ${newToken}`
                }
              });
              console.log('🔵 [AuthInterceptor] Reintentando request con nuevo token');
              return next(retryReq);
            }),
            catchError((refreshError) => {
              console.error('❌ [AuthInterceptor] Refresh fallido:', refreshError);
              authService.logout().subscribe({
                next: () => {
                  console.log('🔵 [AuthInterceptor] Logout después de refresh fallido');
                  router.navigate(['/login']);
                },
                error: (err) => {
                  console.error('❌ [AuthInterceptor] Error en logout:', err);
                  router.navigate(['/login']);
                }
              });
              return throwError(() => refreshError || new Error('Sesión expirada'));
            })
          );
        } else {
          console.log('🔵 [AuthInterceptor] No hay refresh token');

          // 🚨 Evitar romper flujo OAuth
          if (!window.location.pathname.includes('/oauth2/callback')) {
            router.navigate(['/login']);
          }

          return throwError(() => new Error('Sesión expirada'));
        }
      }

      return throwError(() => error);
    })
  );
};
