import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { LoginResponseDTO } from '../../../../core/dtos/login-response.dto';

@Component({
  selector: 'app-verify-2fa',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './verify-2fa.component.html',
  styleUrls: ['./verify-2fa.component.scss']
})
export class Verify2FAComponent implements OnInit {

  verifyForm!: FormGroup;
  isLoading = false;
  errorMessage: string | null = null;
  email: string = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    // Obtener email de los query params o sessionStorage
    this.email = this.route.snapshot.queryParamMap.get('email') ||
                 sessionStorage.getItem('pendingEmail') || '';

    if (!this.email) {
      this.router.navigate(['/login']);
      return;
    }

    this.initializeForm();
  }

  private initializeForm(): void {
    this.verifyForm = this.fb.group({
      code: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(6), Validators.pattern(/^\d+$/)]]
    });
  }

  get codeControl() {
    return this.verifyForm.get('code');
  }

  getCodeError(): string {
    if (this.codeControl?.hasError('required')) {
      return 'El código es requerido';
    }
    if (this.codeControl?.hasError('minlength') || this.codeControl?.hasError('maxlength')) {
      return 'El código debe tener 6 dígitos';
    }
    if (this.codeControl?.hasError('pattern')) {
      return 'El código solo puede contener números';
    }
    return '';
  }

  onSubmit(): void {
    if (this.verifyForm.invalid) {
      this.verifyForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.errorMessage = null;

    this.authService.verify2FA(this.email, this.codeControl!.value).subscribe({
      next: (response: LoginResponseDTO) => {
        this.isLoading = false;

        console.log('🔵 2FA verificado exitosamente:', response);

        // Guardar tokens - verificar si viene accessToken o token
        const accessToken = (response as any).accessToken || (response as any).token;
        const refreshToken = (response as any).refreshToken;

        if (accessToken && refreshToken) {
          this.authService.setTokens(accessToken, refreshToken);
        }

        // Guardar usuario
        this.authService.setCurrentUser({
          email: response.email,
          name: response.name || '',
          roles: response.roles || [],
          mustChangePassword: response.mustChangePassword
        });

        // Verificar si necesita cambiar contraseña (primer login)
        if (response.mustChangePassword) {
          // Primer login - redirigir a force-password-change
          console.log('🔵 Primer login - Redirigiendo a force-password-change...');
          setTimeout(() => {
            this.router.navigate(['/auth/force-password-change']);
          }, 500);
        } else {
          // Login normal después de 2FA - redirigir a profile
          console.log('🔵 Login normal - Redirigiendo a /profile...');
          setTimeout(() => {
            this.router.navigate(['/profile']);
          }, 500);
        }
      },
      error: (error: any) => {
        this.isLoading = false;
        this.errorMessage = error.message || 'Código inválido. Intente nuevamente.';
      }
    });
  }

  resendCode(): void {
    this.authService.resend2FACode(this.email).subscribe({
      next: () => {
        alert('Código reenviado a tu correo electrónico');
      },
      error: (error: any) => {
        alert('Error al reenviar código: ' + (error.message || 'Error desconocido'));
      }
    });
  }
}
