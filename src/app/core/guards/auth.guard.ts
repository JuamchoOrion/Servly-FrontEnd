import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const user = authService.getCurrentUser();
  if (user) {
    // Si debe cambiar contraseña, redirigir a force-password-change
    // Excepto si ya está en esa ruta
    if (user.mustChangePassword) {
      const currentRoute = router.url;
      if (!currentRoute.includes('/auth/force-password-change')) {
        console.log('🔵 Usuario con mustChangePassword=true intentando acceder a:', currentRoute);
        console.log('🔵 Redirigiendo a /auth/force-password-change');
        router.navigate(['/auth/force-password-change']);
        return false;
      }
    }
    return true;
  }

  router.navigate(['/login']);
  return false;
};
