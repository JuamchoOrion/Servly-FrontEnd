import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError, of } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';

/**
 * AuthInterceptor
 * Intercepta todas las solicitudes HTTP para:
 * 1. Adjuntar el access token en headers
 * 2. Manejar refresh automático cuando el token expira (401)
 * 3. Redirigir a login si ambos tokens están inválidos
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Obtener el access token
  const token = authService.getAccessToken();

  // Adjuntar token a la solicitud si existe
  const authReq = token
    ? req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
    : req.clone({
        setHeaders: {
          'Content-Type': 'application/json'
        }
      });

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      // Si recibe 401 (Unauthorized)
      if (error.status === 401) {
        // No hacer refresh si la solicitud es al endpoint de refresh mismo
        if (req.url.includes('/api/auth/refresh')) {
          authService.logout().subscribe({
            next: () => router.navigate(['/login']),
            error: () => {
              // Si logout falla, limpiar sesión localmente
              sessionStorage.clear();
              router.navigate(['/login']);
            }
          });
          return throwError(() => new Error('Token expirado'));
        }

        // Intentar obtener un nuevo access token con el refresh token
        const refreshToken = authService.getRefreshToken();

        if (refreshToken) {
          return authService.refreshToken(refreshToken).pipe(
            // Si el refresh es exitoso, reintentar la solicitud original
            switchMap((response) => {
              const newToken = authService.getAccessToken();
              const retryReq = req.clone({
                setHeaders: {
                  Authorization: `Bearer ${newToken}`,
                  'Content-Type': 'application/json'
                }
              });
              return next(retryReq);
            }),
            // Si el refresh falla, hacer logout
            catchError((refreshError) => {
              authService.logout().subscribe({
                next: () => router.navigate(['/login']),
                error: () => {
                  sessionStorage.clear();
                  router.navigate(['/login']);
                }
              });
              return throwError(() => refreshError || new Error('Sesión expirada'));
            })
          );
        } else {
          // Sin refresh token, ir a login
          router.navigate(['/login']);
          return throwError(() => new Error('Sesión expirada'));
        }
      }

      // Para otros errores HTTP, dejar que se propaguen
      return throwError(() => error);
    })
  );
};

