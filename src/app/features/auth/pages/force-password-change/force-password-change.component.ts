import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';

interface PasswordRequirements {
  minLength: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumber: boolean;
  hasSpecial: boolean;
  allValid: boolean;
}

@Component({
  selector: 'app-force-password-change',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './force-password-change.component.html',
  styleUrls: ['./force-password-change.component.scss']
})
export class ForcePasswordChangeComponent implements OnInit {

  passwordForm!: FormGroup;
  isLoading = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;
  showPassword = false;
  showTempPassword = false;

  passwordRequirements: PasswordRequirements = {
    minLength: false,
    hasUppercase: false,
    hasLowercase: false,
    hasNumber: false,
    hasSpecial: false,
    allValid: false
  };

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.initializeForm();
  }

  ngOnInit(): void {
    // Verificar si hay token temporal o access token
    const tempToken = this.authService.getTempToken();
    const accessToken = this.authService.getAccessToken();

    console.log('🔵 force-password-change ngOnInit');
    console.log('🔵 tempToken:', tempToken);
    console.log('🔵 accessToken:', accessToken);

    if (!tempToken && !accessToken) {
      console.log('🔵 No hay token, redirigiendo a login');
      this.router.navigate(['/login']);
      return;
    }
  }

  private initializeForm(): void {
    this.passwordForm = this.fb.group({
      temporaryPassword: ['', [Validators.required]],
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    }, {
      validators: this.passwordMatchValidator
    });

    // Escuchar cambios en newPassword para validar requisitos
    this.passwordForm.get('newPassword')?.valueChanges.subscribe(value => {
      this.checkPasswordRequirements(value);
    });
  }

  passwordMatchValidator(form: FormGroup) {
    const newPassword = form.get('newPassword')?.value;
    const confirmPassword = form.get('confirmPassword')?.value;
    return newPassword === confirmPassword ? null : { passwordMismatch: true };
  }

  get temporaryPasswordControl() {
    return this.passwordForm.get('temporaryPassword');
  }

  get newPasswordControl() {
    return this.passwordForm.get('newPassword');
  }

  get confirmPasswordControl() {
    return this.passwordForm.get('confirmPassword');
  }

  checkPasswordRequirements(password: string): void {
    if (!password) {
      this.passwordRequirements = {
        minLength: false,
        hasUppercase: false,
        hasLowercase: false,
        hasNumber: false,
        hasSpecial: false,
        allValid: false
      };
      return;
    }

    // Validación local de contraseña (sin depender de SecurityService)
    const errors: string[] = [];
    if (password.length < 6) {
      errors.push('Mínimo 6 caracteres');
    }
    if (password.length > 128) {
      errors.push('Máximo 128 caracteres');
    }

    this.passwordRequirements = {
      minLength: password.length >= 8,
      hasUppercase: /[A-Z]/.test(password),
      hasLowercase: /[a-z]/.test(password),
      hasNumber: /[0-9]/.test(password),
      hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(password),
      allValid: errors.length === 0 && password.length >= 6
    };
  }

  getTempPasswordError(): string {
    if (this.temporaryPasswordControl?.hasError('required')) {
      return 'Ingrese la contraseña temporal recibida por email';
    }
    return '';
  }

  getNewPasswordError(): string {
    if (this.newPasswordControl?.hasError('required')) {
      return 'La nueva contraseña es requerida';
    }
    if (this.newPasswordControl?.hasError('minlength')) {
      return 'Mínimo 6 caracteres';
    }
    return '';
  }

  getConfirmPasswordError(): string {
    if (this.confirmPasswordControl?.hasError('required')) {
      return 'Confirme la nueva contraseña';
    }
    if (this.passwordForm.hasError('passwordMismatch') && this.confirmPasswordControl?.touched) {
      return 'Las contraseñas no coinciden';
    }
    return '';
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  toggleTempPasswordVisibility(): void {
    this.showTempPassword = !this.showTempPassword;
  }

  onSubmit(): void {
    this.errorMessage = null;
    this.successMessage = null;

    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;

    const { temporaryPassword, newPassword } = this.passwordForm.value;
    const user = this.authService.getCurrentUser();
    const email = user?.email || '';

    // Debug: verificar tokens antes de llamar al servicio
    const tempToken = this.authService.getTempToken();
    const accessToken = this.authService.getAccessToken();
    console.log('🔵 force-password-change onSubmit:');
    console.log('  - tempToken:', tempToken ? 'presente' : 'ausente');
    console.log('  - accessToken:', accessToken ? 'presente' : 'ausente');
    console.log('  - email:', email);

    this.authService.forcePasswordChange(temporaryPassword, newPassword, email)
      .subscribe({
        next: (response) => {
          this.isLoading = false;
          this.successMessage = 'Contraseña actualizada exitosamente. Redirigiendo...';

          // Actualizar tokens con los nuevos de la respuesta
          const accessToken = response.token || response.accessToken;
          if (accessToken) {
            this.authService.setTokens(accessToken, response.refreshToken || '');
          }

          // Limpiar token temporal
          this.authService.clearTempToken();

          // Actualizar usuario - ya no debe cambiar contraseña
          this.authService.setCurrentUser({
            email: response.email || '',
            name: response.name || '',
            roles: response.roles || (response.role ? [response.role] : []),
            mustChangePassword: false
          });

          // Redirigir al dashboard
          setTimeout(() => {
            const userRole = response.role?.toUpperCase();
            if (userRole === 'STOREKEEPER') {
              this.router.navigate(['/inventory']);
            } else {
              this.router.navigate(['/dashboard']);
            }
          }, 2000);
        },
        error: (error) => {
          this.isLoading = false;

          if (error.status === 400) {
            this.errorMessage = error.message || 'Contraseña no válida';
          } else if (error.status === 401) {
            this.errorMessage = 'Contraseña temporal incorrecta';
            this.temporaryPasswordControl?.setErrors({ incorrect: true });
          } else if (error.status === 403) {
            this.errorMessage = 'Token expirado. Inicie sesión nuevamente';
            setTimeout(() => {
              this.router.navigate(['/login']);
            }, 2000);
          } else if (error.status === 409) {
            this.errorMessage = 'La nueva contraseña debe ser diferente a la anterior';
          } else {
            this.errorMessage = error.message || 'Error al cambiar la contraseña';
          }
        }
      });
  }
}
