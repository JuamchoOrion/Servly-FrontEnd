import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { UserProfile } from '../../core/dtos/user-profile.dto';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss']
})
export class ProfileComponent implements OnInit {
  profile: UserProfile | null = null;
  isLoading = true;
  errorMessage: string | null = null;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadUserProfile();
  }

  /**
   * Carga el perfil del usuario desde el backend
   */
  private loadUserProfile(): void {
    this.isLoading = true;
    this.errorMessage = null;

    this.authService.getUserProfile().subscribe({
      next: (profile: UserProfile) => {
        this.profile = profile;
        this.isLoading = false;
        console.log('🔵 [ProfileComponent] Perfil cargado exitosamente:', profile);
      },
      error: (error: any) => {
        this.isLoading = false;
        console.error('❌ [ProfileComponent] Error al cargar perfil:', error);

        // El AuthService ya redirige al login en caso de 401/403
        // Aquí manejamos otros errores
        if (error.status !== 401 && error.status !== 403) {
          this.errorMessage = error.message || 'Error al cargar el perfil del usuario';
        }
      }
    });
  }

  /**
   * Obtiene el nombre del rol formateado
   */
  getFormattedRole(role: string): string {
    if (!role) return '';
    return role
      .split('_')
      .map(word => word.charAt(0) + word.slice(1).toLowerCase())
      .join(' ');
  }

  /**
   * Vuelve a la página anterior
   */
  goBack(): void {
    this.router.navigate(['/dashboard']);
  }

  /**
   * Reintentar carga del perfil
   */
  retry(): void {
    this.loadUserProfile();
  }
}
