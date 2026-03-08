import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AdminService } from '../../../../core/services/admin.service';
import { UserResponse } from '../../../../core/dtos/admin.dto';

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './user-list.component.html',
  styleUrls: ['./user-list.component.scss']
})
export class UserListComponent implements OnInit {

  users: UserResponse[] = [];
  filteredUsers: UserResponse[] = [];
  isLoading = true;
  errorMessage: string | null = null;

  // Filtros
  searchQuery = '';
  roleFilter = 'ALL';
  statusFilter = 'ALL';

  // Roles disponibles para cambio (NO incluye ADMIN)
  readonly AVAILABLE_ROLES = ['CASHIER', 'WAITER', 'KITCHEN', 'STOREKEEPER'];

  // Rol seleccionado para cambio
  selectedRole: string = '';

  constructor(
    private adminService: AdminService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.isLoading = true;
    this.errorMessage = null;

    this.adminService.getUsers().subscribe({
      next: (users) => {
        console.log('🔵 Usuarios recibidos del backend:', users);
        console.log('🔵 Cantidad de usuarios:', users.length);
        if (users.length > 0) {
          console.log('🔵 Primer usuario:', users[0]);
        }
        this.users = users;
        this.filteredUsers = users;
        this.isLoading = false;
        this.applyFilters();
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = 'Error al cargar usuarios. Intente nuevamente.';
        console.error('❌ Error loading users:', error);
      }
    });
  }

  applyFilters(): void {
    this.filteredUsers = this.users.filter(user => {
      // Filtro por búsqueda
      const searchLower = this.searchQuery.toLowerCase();
      const matchesSearch = !this.searchQuery ||
        user.email.toLowerCase().includes(searchLower) ||
        user.name.toLowerCase().includes(searchLower) ||
        (user.lastName && user.lastName.toLowerCase().includes(searchLower));

      // Filtro por rol
      const matchesRole = this.roleFilter === 'ALL' ||
        user.role === this.roleFilter;

      // Filtro por estado
      const matchesStatus = this.statusFilter === 'ALL' ||
        (this.statusFilter === 'ACTIVE' && user.enabled) ||
        (this.statusFilter === 'INACTIVE' && !user.enabled);

      return matchesSearch && matchesRole && matchesStatus;
    });
  }

  onSearchChange(): void {
    this.applyFilters();
  }

  onFilterChange(): void {
    this.applyFilters();
  }

  viewUser(id: string): void {
    this.router.navigate(['/admin/users', id]);
  }

  editUserRole(id: string): void {
    this.router.navigate(['/admin/users', id]);
  }

  toggleUserStatus(id: string, currentStatus: boolean): void {
    const action = currentStatus ? 'desactivar' : 'activar';

    if (!confirm(`¿Está seguro de que desea ${action} este usuario?`)) {
      return;
    }

    this.adminService.toggleUserStatus(id).subscribe({
      next: (response) => {
        this.loadUsers(); // Recargar lista
      },
      error: (error) => {
        alert('Error al cambiar estado del usuario: ' + (error.error?.message || 'Error desconocido'));
      }
    });
  }

  deleteUser(id: string): void {
    if (!confirm('⚠️ ¿Está SEGURO de que desea eliminar este usuario? Esta acción no se puede deshacer.')) {
      return;
    }

    // Doble confirmación
    if (!confirm('⚠️ ¿Realmente desea eliminar este usuario permanentemente?')) {
      return;
    }

    this.adminService.deleteUser(id).subscribe({
      next: (response) => {
        this.loadUsers(); // Recargar lista
      },
      error: (error) => {
        alert('Error al eliminar usuario: ' + (error.error?.message || 'Error desconocido'));
      }
    });
  }

  /**
   * Cambia el rol al siguiente disponible en la lista
   */
  changeRole(userId: string, currentRole: string): void {
    // Encontrar el índice del rol actual
    const currentIndex = this.AVAILABLE_ROLES.indexOf(currentRole);

    // Si no está en la lista o es ADMIN, usar el primer rol
    if (currentIndex === -1) {
      this.selectedRole = this.AVAILABLE_ROLES[0];
    } else {
      // Ciclar al siguiente rol
      const nextIndex = (currentIndex + 1) % this.AVAILABLE_ROLES.length;
      this.selectedRole = this.AVAILABLE_ROLES[nextIndex];
    }

    // Confirmar con el usuario
    if (!confirm(`¿Cambiar rol a ${this.selectedRole}?`)) {
      return;
    }

    this.adminService.changeUserRole(userId, this.selectedRole).subscribe({
      next: (response) => {
        this.loadUsers(); // Recargar lista
      },
      error: (error) => {
        alert('Error al cambiar rol: ' + (error.message || 'Error desconocido'));
      }
    });
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

  getRoleLabel(role: string): string {
    return role || 'Sin rol';
  }
}
