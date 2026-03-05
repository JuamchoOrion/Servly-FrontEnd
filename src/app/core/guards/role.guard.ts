import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const roleGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Los roles permitidos se definen en cada ruta
  const allowedRoles: string[] = route.data['roles'] ?? [];
  const userRoles: string[] = authService.getCurrentUserRoles();

  const hasRole = allowedRoles.some(role => userRoles.includes(role));

  if (hasRole) return true;

  router.navigate(['/unauthorized']);
  return false;
};
