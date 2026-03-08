import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  userName: string = '';
  userRoles: string[] = [];
  isAdmin: boolean = false;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    const user = this.authService.getCurrentUser();
    if (user) {
      this.userName = user.name;
      this.userRoles = user.roles;
      this.isAdmin = this.authService.hasRole('ADMIN');
    }
  }

  /**
   * Navega a crear usuario
   */
  goToCreateUser(): void {
    this.router.navigate(['/admin/users/create']);
  }

  /**
   * Navega a lista de usuarios
   */
  goToUserList(): void {
    this.router.navigate(['/admin/users']);
  }

  /**
   * Navega a métricas
   */
  goToMetrics(): void {
    // TODO: Implementar ruta de métricas
    alert('Funcionalidad de métricas en desarrollo');
  }

  /**
   * Navega al perfil del usuario
   */
  goToProfile(): void {
    this.router.navigate(['/profile']);
  }
}
