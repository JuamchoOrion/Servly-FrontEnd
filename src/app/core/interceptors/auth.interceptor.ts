import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';

/**
 * AuthInterceptor
 * Intercepta todas las solicitudes HTTP para:
 * 1. Adjuntar el access token en headers (Authorization: Bearer)
 * 2. Enviar/recibir cookies (withCredentials: true)
 * 3. Manejar refresh automático cuando el token expira (401)
 * 4. Redirigir a login si ambos tokens están inválidos
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
    '/api/auth/refresh'
  ];

  const isExcluded = excludedUrls.some(url => req.url.includes(url));
  if (isExcluded) {
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

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      // Manejar error MustChangePasswordException (403)
      // Redirigir inmediatamente a force-password-change
      if (error.status === 403) {
        const errorMessage = error.error?.message || '';
        if (errorMessage.includes('Debe cambiar su contraseña') ||
            errorMessage.includes('mustChangePassword') ||
            errorMessage.includes('force-password-change')) {
          console.log('🔵 MustChangePasswordException detectada, redirigiendo...');
          router.navigate(['/auth/force-password-change']);
          return throwError(() => error);
        }
      }

      if (error.status === 401) {
        // No hacer refresh si la solicitud ya es al endpoint de refresh
        if (req.url.includes('/api/auth/refresh')) {
          authService.logout().subscribe({
            next: () => router.navigate(['/login']),
            error: () => router.navigate(['/login'])
          });
          return throwError(() => new Error('Token expirado'));
        }

        // Si es tempToken y la petición es a force-password-change, NO redirigir
        // Dejar que el componente maneje el error (contraseña temporal incorrecta)
        const tempToken = authService.getTempToken();
        if (tempToken && req.url.includes('/api/auth/force-password-change')) {
          console.log('🔵 401 en force-password-change, pasando error al componente');
          return throwError(() => error);
        }

        // Para otras peticiones con tempToken, limpiar sesión
        if (tempToken) {
          console.log('🔵 tempToken inválido en otra petición, redirigiendo a login');
          authService.clearSession();
          router.navigate(['/login']);
          return throwError(() => new Error('Token temporal inválido'));
        }

        const refreshToken = authService.getRefreshToken();

        if (refreshToken) {
          return authService.refreshToken(refreshToken).pipe(
            switchMap(() => {
              // Reintentar la request original con el nuevo token
              const newToken = authService.getAccessToken();
              // Mantener el mismo Content-Type que la request original
              const retryReq = req.clone({
                withCredentials: true,
                setHeaders: {
                  Authorization: `Bearer ${newToken}`
                }
              });
              return next(retryReq);
            }),
            catchError((refreshError) => {
              authService.logout().subscribe({
                next: () => router.navigate(['/login']),
                error: () => router.navigate(['/login'])
              });
              return throwError(() => refreshError || new Error('Sesión expirada'));
            })
          );
        } else {
          router.navigate(['/login']);
          return throwError(() => new Error('Sesión expirada'));
        }
      }

      return throwError(() => error);
    })
  );
};
