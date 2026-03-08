import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * AdminGuard
 * Protege rutas que requieren rol de ADMINISTRADOR
 * Verifica que el usuario tenga el rol 'ADMIN'
 */
export const adminGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const user = authService.getCurrentUser();
  const userRoles = authService.getCurrentUserRoles();

  console.log('🔵 AdminGuard: user =', user);
  console.log('🔵 AdminGuard: userRoles =', userRoles);
  console.log('🔵 AdminGuard: hasRole(ADMIN) =', authService.hasRole('ADMIN'));

  if (user && authService.hasRole('ADMIN')) {
    console.log('✅ AdminGuard: Usuario es ADMIN, permitiendo acceso');
    return true;
  }

  // No es admin → redirigir a unauthorized
  console.log('❌ AdminGuard: Usuario NO es ADMIN, redirigiendo a unauthorized');
  router.navigate(['/unauthorized']);
  return false;
};
