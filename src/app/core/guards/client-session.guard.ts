import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { ClientService } from '../services/client.service';

/**
 * Guard que valida si la sesión de cliente está activa y no expirada
 * Se aplica a todas las rutas bajo /client
 */
@Injectable({
  providedIn: 'root'
})
export class ClientSessionGuard implements CanActivate {
  constructor(
    private clientService: ClientService,
    private router: Router
  ) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    const currentSession = this.clientService.getCurrentSession();

    // Si no hay sesión, ir a /client (formulario manual)
    if (!currentSession) {
      console.log('🔵 [ClientSessionGuard] Sin sesión, redirigiendo a /client');
      this.router.navigate(['/client']);
      return false;
    }

    // Validar si la sesión expiró
    const remainingSeconds = this.clientService.getSessionTimeRemaining();
    if (remainingSeconds <= 0) {
      console.log('⏰ [ClientSessionGuard] Sesión expirada');
      this.clientService.closeSession();
      this.router.navigate(['/client']);
      return false;
    }

    // ⚠️ Si quedan menos de 5 minutos, mostrar aviso
    if (remainingSeconds < 300) {
      console.log(`⚠️  [ClientSessionGuard] Sesión expirará en ${remainingSeconds} segundos`);
    }

    return true;
  }
}

