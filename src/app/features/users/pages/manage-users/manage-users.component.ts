import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { UserService } from '../../../../core/services/user.service';
import { AuthService } from '../../../../core/services/auth.service';
import { UserListItem, UpdateRoleDto } from '../../../../core/dtos/user.dto';

interface RoleOption {
  value: 'ADMIN' | 'CASHIER' | 'WAITER' | 'KITCHEN' | 'STOREKEEPER';
  label: string;
}

@Component({
  selector: 'app-manage-users',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './manage-users.component.html',
  styleUrls: ['./manage-users.component.scss']
})
export class ManageUsersComponent implements OnInit {

  users: UserListItem[] = [];
  isLoading = true;
  errorMessage: string | null = null;
  successMessage: string | null = null;

  // Modal de cambio de rol
  showRoleModal = false;
  selectedUser: UserListItem | null = null;
  selectedRole: string = '';
  isSavingRole = false;

  // Modal de confirmación de eliminación
  showDeleteModal = false;
  userToDelete: UserListItem | null = null;
  isDeleting = false;

  readonly roleOptions: RoleOption[] = [
    { value: 'ADMIN', label: 'Administrador' },
    { value: 'CASHIER', label: 'Cajero' },
    { value: 'WAITER', label: 'Mesero' },
    { value: 'KITCHEN', label: 'Cocina' },
    { value: 'STOREKEEPER', label: 'Bodega' }
  ];

  currentUserId: string | null = null;

  constructor(
    private userService: UserService,
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // Verificar que el usuario sea ADMIN
    if (!this.authService.hasRole('ADMIN')) {
      this.router.navigate(['/access-denied']);
      return;
    }

    const currentUser = this.authService.getCurrentUser();
    this.currentUserId = currentUser?.email || null;

    this.loadUsers();
  }

  loadUsers(): void {
    this.isLoading = true;
    this.errorMessage = null;

    this.userService.getUsers().subscribe({
      next: (users) => {
        this.users = users;
        this.isLoading = false;

        // Forzar detección de cambios
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.isLoading = false;

        // Forzar detección de cambios
        this.cdr.detectChanges();

        // El interceptor maneja 401/403 globalmente (logout y redirección)
        // Aquí solo mostramos el mensaje de error para otros casos
        this.errorMessage = error.message || 'Error al cargar usuarios';
      }
    });
  }

  getRoleLabel(role: string): string {
    const option = this.roleOptions.find(r => r.value === role);
    return option ? option.label : role;
  }

  getRoleBadgeClass(role: string): string {
    switch (role) {
      case 'ADMIN': return 'badge-admin';
      case 'STOREKEEPER': return 'badge-storekeeper';
      case 'CASHIER': return 'badge-cashier';
      case 'WAITER': return 'badge-waiter';
      case 'KITCHEN': return 'badge-kitchen';
      default: return 'badge-default';
    }
  }

  openRoleModal(user: UserListItem): void {
    this.selectedUser = user;
    this.selectedRole = user.role;
    this.showRoleModal = true;
    this.isSavingRole = false;
  }

  closeRoleModal(): void {
    this.showRoleModal = false;
    this.selectedUser = null;
    this.selectedRole = '';
    this.isSavingRole = false;
  }

  saveRole(): void {
    if (!this.selectedUser || !this.selectedRole) return;

    this.isSavingRole = true;
    const roleDto: UpdateRoleDto = { role: this.selectedRole as any };

    this.userService.updateRole(this.selectedUser.id, roleDto).subscribe({
      next: () => {
        this.successMessage = 'Rol actualizado exitosamente';
        this.closeRoleModal();
        this.loadUsers();
        setTimeout(() => this.successMessage = null, 3000);
      },
      error: (error) => {
        this.isSavingRole = false;
        if (error.status === 403) {
          this.errorMessage = 'No puedes cambiar tu propio rol de ADMIN';
        } else {
          this.errorMessage = error.message || 'Error al actualizar rol';
        }
        setTimeout(() => this.errorMessage = null, 4000);
      }
    });
  }

  toggleUserStatus(user: UserListItem): void {
    const action = user.enabled ? 'desactivar' : 'activar';
    if (!confirm(`¿Está seguro que desea ${action} este usuario?`)) {
      return;
    }

    this.userService.toggleUser(user.id).subscribe({
      next: () => {
        this.successMessage = `Usuario ${user.enabled ? 'desactivado' : 'activado'} correctamente`;
        this.loadUsers();
        setTimeout(() => this.successMessage = null, 3000);
      },
      error: (error) => {
        if (error.status === 403) {
          this.errorMessage = 'No puedes desactivar tu propia cuenta';
        } else {
          this.errorMessage = error.message || 'Error al cambiar estado';
        }
        setTimeout(() => this.errorMessage = null, 4000);
      }
    });
  }

  openDeleteModal(user: UserListItem): void {
    this.userToDelete = user;
    this.showDeleteModal = true;
    this.isDeleting = false;
  }

  closeDeleteModal(): void {
    this.showDeleteModal = false;
    this.userToDelete = null;
    this.isDeleting = false;
  }

  confirmDelete(): void {
    if (!this.userToDelete) return;

    this.isDeleting = true;

    this.userService.deleteUser(this.userToDelete.id).subscribe({
      next: () => {
        this.successMessage = 'Usuario eliminado correctamente';
        this.closeDeleteModal();
        this.loadUsers();
        setTimeout(() => this.successMessage = null, 3000);
      },
      error: (error) => {
        this.isDeleting = false;
        if (error.status === 403) {
          this.errorMessage = 'No puedes eliminar tu propia cuenta';
        } else {
          this.errorMessage = error.message || 'Error al eliminar usuario';
        }
        setTimeout(() => this.errorMessage = null, 4000);
      }
    });
  }

  isCurrentUser(userId: string): boolean {
    const currentUser = this.authService.getCurrentUser();
    // Comparamos por email ya que el ID puede ser diferente
    return currentUser?.email === this.users.find(u => u.id === userId)?.email;
  }
}
