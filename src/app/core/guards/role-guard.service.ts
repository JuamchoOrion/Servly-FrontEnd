import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Guard simplificado usando inyección de dependencias
 */
export const roleGuard = (requiredRoles: string | string[]): CanActivateFn => {
  return (route: ActivatedRouteSnapshot, state: RouterStateSnapshot) => {
    const authService = inject(AuthService);
    const router = inject(Router);
    const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];

    const user = authService.getCurrentUser();

    if (!user) {
      router.navigate(['/login']);
      return false;
    }

    // Verificar si el usuario tiene alguno de los roles requeridos
    if (authService.hasAnyRole(...roles)) {
      return true;
    }

    // Usuario no tiene permisos
    console.warn(
      `Usuario ${user.email} intentó acceder a recurso protegido que requiere roles: ${roles.join(', ')}`
    );

    // Redirigir a página de acceso denegado
    router.navigate(['/access-denied'], {
      queryParams: { returnUrl: state.url }
    });

    return false;
  };
};

/**
 * Guard para ADMIN
 */
export const adminGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
) => {
  return roleGuard('ADMIN')(route, state);
};

/**
 * Guard para STOREKEEPER
 */
export const storekeeperGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
) => {
  return roleGuard('STOREKEEPER')(route, state);
};

