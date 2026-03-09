import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-verify-2fa',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './verify-2fa.component.html',
  styleUrls: ['./verify-2fa.component.scss']
})
export class Verify2faComponent implements OnInit, OnDestroy {

  verifyForm!: FormGroup;
  isLoading = false;
  errorMessage: string | null = null;
  userEmail: string = '';

  // Timer
  timeRemaining: number = 300; // 5 minutos en segundos
  timerInterval: any;
  canResend = false;

  private destroy$ = new Subject<void>();

  @ViewChild('codeInput') codeInput!: ElementRef;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.initializeForm();
  }

  ngOnInit(): void {
    console.log('🔵 verify-2fa ngOnInit');
    // Verificar si hay token temporal
    const tempToken = this.authService.getTempToken();
    console.log('🔵 tempToken:', tempToken);

    // Obtener email del usuario desde el formulario de login o currentUser
    const user = this.authService.getCurrentUser();
    console.log('🔵 currentUser:', user);
    if (user && user.email) {
      this.userEmail = user.email;
    }

    // Si no hay email en currentUser, intentar obtener de sessionStorage
    if (!this.userEmail) {
      const tempEmail = sessionStorage.getItem('temp_login_email');
      if (tempEmail) {
        this.userEmail = tempEmail;
        console.log('🔵 userEmail obtenido de sessionStorage:', this.userEmail);
      }
    }
    console.log('🔵 userEmail:', this.userEmail);

    // Si no hay token temporal ni email, regresar al login
    if (!tempToken && !this.userEmail) {
      console.log('🔵 No hay tempToken ni email, redirigiendo a login');
      this.router.navigate(['/login']);
      return;
    }
    console.log('🔵 Iniciando timer');
    this.startTimer();
  }

  ngOnDestroy(): void {
    this.stopTimer();
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeForm(): void {
    this.verifyForm = this.fb.group({
      code: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(6), Validators.pattern('^[0-9]{6}$')]]
    });
  }

  get codeControl() {
    return this.verifyForm.get('code');
  }

  getCodeError(): string {
    if (this.codeControl?.hasError('required')) {
      return 'Ingrese el código de 6 dígitos';
    }
    if (this.codeControl?.hasError('minlength') || this.codeControl?.hasError('maxlength')) {
      return 'El código debe tener 6 dígitos';
    }
    if (this.codeControl?.hasError('pattern')) {
      return 'El código solo puede contener números';
    }
    return '';
  }

  startTimer(): void {
    this.stopTimer();
    this.timerInterval = setInterval(() => {
      this.timeRemaining--;
      if (this.timeRemaining <= 0) {
        this.stopTimer();
        this.canResend = true;
      }
    }, 1000);
  }

  stopTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  resendCode(): void {
    if (!this.canResend) return;

    this.isLoading = true;
    this.errorMessage = null;

    // Aquí se llamaría al endpoint de reenviar código si existe
    // Por ahora solo reseteamos el timer
    setTimeout(() => {
      this.isLoading = false;
      this.timeRemaining = 300;
      this.canResend = false;
      this.startTimer();
    }, 1000);
  }

  onSubmit(): void {
    if (this.verifyForm.invalid) {
      this.verifyForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.errorMessage = null;

    const code = this.codeControl?.value;

    this.authService.verify2fa(code, this.userEmail)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log('🔵 verify2fa response:', response);
          console.log('🔵 mustChangePassword:', response.mustChangePassword);

          // Limpiar email temporal
          sessionStorage.removeItem('temp_login_email');

          // Verificar si debe cambiar contraseña - REDIRECCIÓN INMEDIATA
          if (response.mustChangePassword) {
            console.log('🔵 mustChangePassword=true, redirigiendo inmediatamente...');
            // No establecer isLoading=false para evitar que el usuario interactúe
            // Redirigir en el mismo tick del event loop
            setTimeout(() => {
              this.router.navigate(['/auth/force-password-change']).then(() => {
                console.log('🔵 Redirección completada');
              });
            }, 0);
            return;
          }

          // Login normal - completar flujo
          this.isLoading = false;
          console.log('🔵 Login completado, redirigiendo...');
          // Login completado, redirigir al dashboard
          const userRole = response.role?.toUpperCase();
          if (userRole === 'STOREKEEPER') {
            this.router.navigate(['/inventory']);
          } else {
            this.router.navigate(['/dashboard']);
          }
        },
        error: (error) => {
          this.isLoading = false;
          if (error.status === 401) {
            this.errorMessage = 'Código de verificación incorrecto';
          } else if (error.status === 403) {
            this.errorMessage = 'Token expirado. Inicie sesión nuevamente';
            setTimeout(() => {
              this.authService.clearTempToken();
              this.router.navigate(['/login']);
            }, 2000);
          } else {
            this.errorMessage = error.message || 'Error al verificar código';
          }
        }
      });
  }

  onCodeInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    // Solo permitir números
    input.value = input.value.replace(/[^0-9]/g, '');
  }
}
