import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { LoginResponseDTO } from '../../../../core/dtos/login-response.dto';

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
  showCurrentPassword = false;
  showPassword = false;
  showConfirmPassword = false;

  // Password validation pattern: mín 8 chars, 1 mayúscula, 1 minúscula, 1 número
  readonly PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{8,}$/;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.initializeForm();
  }

  private initializeForm(): void {
    this.passwordForm = this.fb.group({
      currentPassword: ['', [Validators.required]],
      newPassword: ['', [
        Validators.required,
        Validators.minLength(8),
        this.passwordValidator.bind(this)
      ]],
      confirmPassword: ['', [Validators.required]]
    }, {
      validators: this.passwordsMatchValidator
    });
  }

  private passwordValidator(control: AbstractControl): ValidationErrors | null {
    const value = control.value;
    if (!value) {
      return null;
    }

    const hasUpperCase = /[A-Z]/.test(value);
    const hasLowerCase = /[a-z]/.test(value);
    const hasNumber = /\d/.test(value);
    const hasMinLength = value.length >= 8;

    const isValid = hasUpperCase && hasLowerCase && hasNumber && hasMinLength;

    return isValid ? null : {
      passwordRequirements: {
        hasUpperCase,
        hasLowerCase,
        hasNumber,
        hasMinLength
      }
    };
  }

  private passwordsMatchValidator(form: FormGroup): ValidationErrors | null {
    const newPassword = form.get('newPassword')?.value;
    const confirmPassword = form.get('confirmPassword')?.value;

    if (newPassword && confirmPassword && newPassword !== confirmPassword) {
      return { passwordsMismatch: true };
    }
    return null;
  }

  get currentPasswordControl() {
    return this.passwordForm.get('currentPassword');
  }

  get newPasswordControl() {
    return this.passwordForm.get('newPassword');
  }

  get confirmPasswordControl() {
    return this.passwordForm.get('confirmPassword');
  }

  getCurrentPasswordError(): string {
    if (this.currentPasswordControl?.hasError('required')) {
      return 'La contraseña actual es requerida';
    }
    return '';
  }

  getNewPasswordError(): string {
    if (this.newPasswordControl?.hasError('required')) {
      return 'La contraseña es requerida';
    }
    if (this.newPasswordControl?.hasError('minlength')) {
      return 'Mínimo 8 caracteres';
    }
    if (this.newPasswordControl?.hasError('passwordRequirements')) {
      const reqs = this.newPasswordControl.getError('passwordRequirements');
      const messages: string[] = [];
      if (!reqs?.hasUpperCase) messages.push('1 mayúscula');
      if (!reqs?.hasLowerCase) messages.push('1 minúscula');
      if (!reqs?.hasNumber) messages.push('1 número');
      return `Debe contener: ${messages.join(', ')}`;
    }
    return '';
  }

  getConfirmPasswordError(): string {
    if (this.confirmPasswordControl?.hasError('required')) {
      return 'La confirmación es requerida';
    }
    if (this.passwordForm.hasError('passwordsMismatch')) {
      return 'Las contraseñas no coinciden';
    }
    return '';
  }

  toggleCurrentPasswordVisibility(): void {
    this.showCurrentPassword = !this.showCurrentPassword;
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  onSubmit(): void {
    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.errorMessage = null;
    this.successMessage = null;

    const currentPassword = this.currentPasswordControl!.value;
    const newPassword = this.newPasswordControl!.value;

    console.log('🔵 ForcePasswordChange submit:', {
      hasCurrentPassword: !!currentPassword,
      newPasswordLength: newPassword?.length,
      hasToken: !!this.authService.getAccessTokenFromStorage()
    });

    this.authService.forcePasswordChange(currentPassword, newPassword).subscribe({
      next: (response: LoginResponseDTO) => {
        this.isLoading = false;
        this.successMessage = '✅ Contraseña actualizada exitosamente. Redirigiendo...';

        // Guardar nuevos tokens - verificar si viene accessToken o token
        const accessToken = (response as any).accessToken || (response as any).token;
        const refreshToken = (response as any).refreshToken;

        if (accessToken && refreshToken) {
          this.authService.setTokens(accessToken, refreshToken);
        }

        // Actualizar usuario
        this.authService.setCurrentUser({
          email: response.email,
          name: response.name || '',
          roles: response.roles || [],
          mustChangePassword: false
        });

        // Redirigir al PERFIL después de 2 segundos para que el usuario vea sus datos
        console.log('🔵 Redirigiendo a /profile...');
        setTimeout(() => {
          this.router.navigate(['/profile']);
        }, 2000);
      },
      error: (error: any) => {
        this.isLoading = false;
        this.errorMessage = error.message || 'Error al cambiar contraseña. Intente nuevamente.';
      }
    });
  }
}
