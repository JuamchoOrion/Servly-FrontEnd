import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';

/**
 * WelcomeComponent
 *
 * Página de bienvenida para usuarios sin rol específico
 * o cuando no se pudo determinar el rol del usuario
 */
@Component({
  selector: 'app-welcome',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './welcome.component.html',
  styleUrls: ['./welcome.component.scss']
})
export class WelcomeComponent implements OnInit {

  userName: string = '';
  userRoles: string[] = [];

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    console.log('🔵 [Welcome] Componente inicializado');
    this.loadUserData();
  }

  private loadUserData(): void {
    const user = this.authService.getCurrentUser();
    if (user) {
      this.userName = user.name || user.email.split('@')[0];
      this.userRoles = user.roles;
      console.log('🔵 [Welcome] Usuario:', this.userName);
      console.log('🔵 [Welcome] Roles:', this.userRoles);
    } else {
      console.log('🔵 [Welcome] No hay usuario autenticado, redirigiendo a login');
      this.router.navigate(['/login'], { replaceUrl: true });
    }
  }

  goToDashboard(): void {
    console.log('🔵 [Welcome] Navegando al dashboard');
    this.router.navigate(['/dashboard']);
  }

  logout(): void {
    console.log('🔵 [Welcome] Cerrando sesión');
    this.authService.logout().subscribe({
      next: () => {
        console.log('✅ [Welcome] Sesión cerrada, redirigiendo a login');
        this.router.navigate(['/login'], { replaceUrl: true });
      },
      error: (err: HttpErrorResponse) => {
        console.error('❌ [Welcome] Error en logout:', err);
        this.router.navigate(['/login'], { replaceUrl: true });
      }
    });
  }
}
