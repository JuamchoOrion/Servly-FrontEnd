import { HttpInterceptorFn, HttpErrorResponse, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';

/**
 * AuthInterceptor
 * Intercepta todas las solicitudes HTTP para:
 * 1. Enviar cookies con credenciales (withCredentials: true)
 * 2. Adjuntar el access token en headers (Authorization: Bearer)
 * 3. Manejar refresh automático cuando la cookie expira (401)
 * 4. Redirigir a login si la sesión expiró
 *
 * NOTA: No establece Content-Type para FormData (multipart/form-data)
 *       El navegador lo añade automáticamente con el boundary correcto
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const excludedUrls = ['/oauth2/', '/login/oauth2/'];
  const isExcluded = excludedUrls.some(url => req.url.includes(url));
  if (isExcluded) {
    return next(req);
  }

  const token = authService.getAccessToken();
  const isFormData = req.body instanceof FormData;

  // Headers base
  const headers: { [key: string]: string } = {};

  // Añadir token si existe
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // No establecer Content-Type para FormData (el navegador lo hace automáticamente)
  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }

  // Adjuntar token + withCredentials en todas las requests
  const authReq = req.clone({
    withCredentials: true,
    setHeaders: headers
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
              const newToken = authService.getAccessToken();
              const retryHeaders: { [key: string]: string } = {};

              if (newToken) {
                retryHeaders['Authorization'] = `Bearer ${newToken}`;
              }

              if (!(req.body instanceof FormData)) {
                retryHeaders['Content-Type'] = 'application/json';
              }

              const retryReq = req.clone({
                withCredentials: true,
                setHeaders: retryHeaders
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
