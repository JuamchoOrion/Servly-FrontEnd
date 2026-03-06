import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';

/**
 * AuthInterceptor
 * Intercepta todas las solicitudes HTTP para:
 * 1. Adjuntar el access token en headers
 * 2. Enviar/recibir cookies (withCredentials: true)
 * 3. Manejar refresh automático cuando el token expira (401)
 * 4. Redirigir a login si ambos tokens están inválidos
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const token = authService.getAccessToken();

  // Adjuntar token + withCredentials en todas las requests
  const authReq = token
    ? req.clone({
        withCredentials: true,
        setHeaders: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
    : req.clone({
        withCredentials: true,
        setHeaders: {
          'Content-Type': 'application/json'
        }
      });

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {

      if (error.status === 401) {

        // No hacer refresh si la solicitud ya es al endpoint de refresh
        if (req.url.includes('/api/auth/refresh')) {
          authService.logout().subscribe({
            next: () => router.navigate(['/login']),
            error: () => {
              sessionStorage.clear();
              router.navigate(['/login']);
            }
          });
          return throwError(() => new Error('Token expirado'));
        }

        const refreshToken = authService.getRefreshToken();

        if (refreshToken) {
          return authService.refreshToken(refreshToken).pipe(
            switchMap(() => {
              // Reintentar la request original con el nuevo token
              // también con withCredentials
              const newToken = authService.getAccessToken();
              const retryReq = req.clone({
                withCredentials: true,
                setHeaders: {
                  Authorization: `Bearer ${newToken}`,
                  'Content-Type': 'application/json'
                }
              });
              return next(retryReq);
            }),
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
          router.navigate(['/login']);
          return throwError(() => new Error('Sesión expirada'));
        }
      }

      return throwError(() => error);
    })
  );
};
