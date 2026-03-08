import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { AdminService } from '../../core/services/admin.service';
import { UserResponse } from '../../core/dtos/admin.dto';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss']
})
export class ProfileComponent implements OnInit {

  user: UserResponse | null = null;
  isLoading = true;
  errorMessage: string | null = null;

  constructor(
    private authService: AuthService,
    private adminService: AdminService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadProfile();
  }

  loadProfile(): void {
    this.isLoading = true;
    this.errorMessage = null;

    console.log('🔵 Profile: Cargando perfil desde /api/auth/me...');
    console.log('🔵 Profile: Token en sessionStorage:', sessionStorage.getItem('auth_token') ? '✅ EXISTE' : '❌ NO EXISTE');

    this.adminService.getCurrentUser().subscribe({
      next: (user) => {
        console.log('🔵 Profile: Usuario cargado exitosamente:', user);
        console.log('🔵 Profile: user.name =', user.name);
        console.log('🔵 Profile: user.role =', user.role);
        this.user = user;
        this.isLoading = false;
        console.log('🔵 Profile: isLoading = false, mostrando perfil');
      },
      error: (error) => {
        console.error('❌ Profile: Error al cargar perfil:', error);
        console.error('❌ Profile: Status:', error.status);
        console.error('❌ Profile: Error body:', error.error);
        this.isLoading = false;
        this.errorMessage = 'Error al cargar perfil. Intente nuevamente.';

        // Si es 401, redirigir al login
        if (error.status === 401) {
          console.log('🔵 Profile: Usuario no autenticado, redirigiendo a login...');
          this.router.navigate(['/login']);
        }
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/dashboard']);
  }

  getRoleBadgeClass(role: string): string {
    switch (role) {
      case 'ADMIN': return 'badge-admin';
      case 'CASHIER': return 'badge-cashier';
      case 'WAITER': return 'badge-waiter';
      case 'STOREKEEPER': return 'badge-storekeeper';
      case 'KITCHEN': return 'badge-kitchen';
      default: return 'badge-default';
    }
  }

  getUserRole(): string {
    // El backend puede devolver 'role' (string) o 'roles' (array)
    const user = this.user as any;
    if (user?.role) {
      return user.role;
    }
    if (user?.roles && Array.isArray(user.roles) && user.roles.length > 0) {
      return user.roles[0];
    }
    return '';
  }
}
