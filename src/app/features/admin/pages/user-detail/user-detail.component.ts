import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AdminService } from '../../../../core/services/admin.service';
import { UserResponse } from '../../../../core/dtos/admin.dto';

@Component({
  selector: 'app-user-detail',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './user-detail.component.html',
  styleUrls: ['./user-detail.component.scss']
})
export class UserDetailComponent implements OnInit {

  user: UserResponse | null = null;
  isLoading = true;
  errorMessage: string | null = null;
  successMessage: string | null = null;

  // Formulario para cambiar rol
  selectedRole = '';
  isChangingRole = false;

  readonly ROLES = ['ADMIN', 'CASHIER', 'WAITER', 'STOREKEEPER', 'KITCHEN'];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private adminService: AdminService
  ) {}

  ngOnInit(): void {
    const userId = this.route.snapshot.paramMap.get('id');
    if (userId) {
      this.loadUser(userId);
    } else {
      this.errorMessage = 'ID de usuario no válido';
      this.isLoading = false;
    }
  }

  loadUser(id: string): void {
    this.isLoading = true;
    this.errorMessage = null;

    this.adminService.getUserById(id).subscribe({
      next: (user) => {
        this.user = user;
        this.selectedRole = user.role || '';
        this.isLoading = false;
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = 'Error al cargar datos del usuario';
        console.error('Error loading user:', error);
      }
    });
  }

  changeRole(): void {
    if (!this.user || !this.selectedRole) return;

    this.isChangingRole = true;
    this.successMessage = null;
    this.errorMessage = null;

    this.adminService.changeUserRole(this.user.id, this.selectedRole).subscribe({
      next: (response) => {
        this.isChangingRole = false;
        this.successMessage = response.message || 'Rol actualizado correctamente';
        this.loadUser(this.user!.id);
      },
      error: (error) => {
        this.isChangingRole = false;
        this.errorMessage = error.error?.message || 'Error al cambiar rol';
      }
    });
  }

  toggleStatus(): void {
    if (!this.user) return;

    const action = this.user.enabled ? 'desactivar' : 'activar';

    if (!confirm(`¿Está seguro de que desea ${action} este usuario?`)) {
      return;
    }

    this.adminService.toggleUserStatus(this.user.id).subscribe({
      next: (response) => {
        this.successMessage = response.message || 'Estado actualizado correctamente';
        this.loadUser(this.user!.id);
      },
      error: (error) => {
        this.errorMessage = error.error?.message || 'Error al cambiar estado';
      }
    });
  }

  deleteUser(): void {
    if (!this.user) return;

    if (!confirm('⚠️ ¿Está SEGURO de que desea eliminar este usuario? Esta acción no se puede deshacer.')) {
      return;
    }

    this.adminService.deleteUser(this.user.id).subscribe({
      next: (response) => {
        this.router.navigate(['/admin/users']);
      },
      error: (error) => {
        this.errorMessage = error.error?.message || 'Error al eliminar usuario';
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/admin/users']);
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
}
