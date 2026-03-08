import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormControl, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { SecurityService } from '../../../../core/services/security.service';
import { RateLimitService } from '../../../../core/services/rate-limit.service';
import { ErrorHandlingService } from '../../../../core/services/error-handling.service';
import { I18nService } from '../../../../core/services/i18n.service';
import { environment } from '../../../../../enviroments/enviroment';

declare global {
  interface Window {
    grecaptcha: any;
  }
}

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrls: ['./login.scss']
})
export class LoginComponent implements OnInit, OnDestroy {
  @ViewChild('recaptchaContainer') recaptchaContainer!: ElementRef;

  loginForm!: FormGroup;
  isLoading = false;
  showPassword = false;
  loginError: string | null = null;
  loginSuccess: string | null = null;
  recaptchaSiteKey = environment.recaptcha.siteKey;
  isRateLimited = false;
  remainingAttempts = 0;
  lockoutTimeRemaining = 0;
  availableLanguages: Array<{ code: string; name: string }> = [];

  private recaptchaToken: string | null = null;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private securityService: SecurityService,
    private rateLimitService: RateLimitService,
    private errorHandlingService: ErrorHandlingService,
    public i18n: I18nService,
    private router: Router
  ) {
    this.initializeForm();
    // Exponer el callback globalmente para reCAPTCHA
    (window as any).onRecaptchaResolved = this.onRecaptchaResolved.bind(this);
  }

  ngOnInit(): void {
    this.loadRecaptchaScript();
    this.setupRateLimitListener();
    this.availableLanguages = this.i18n.getSupportedLanguages();
  }

  /**
   * Configura el listener de rate limit
   */
  private setupRateLimitListener(): void {
    this.rateLimitService.isLockedOut$().subscribe(isLocked => {
      this.isRateLimited = isLocked;
    });

    this.rateLimitService.getRemainingTime$().subscribe(seconds => {
      this.lockoutTimeRemaining = seconds;
    });
  }

  /**
   * Login con Google OAuth2
   */
  loginWithGoogle(): void {
    if (this.isRateLimited) {
      this.showRateLimitError();
      return;
    }
    this.authService.loginWithGoogle();
  }

  /**
   * Cambia el idioma de la aplicación
   */
  onLanguageChange(language: string): void {
    this.i18n.setLanguage(language as any);
  }

  /**
   * Inicializa el formulario
   */
  private initializeForm(): void {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  /**
   * Carga el script de reCAPTCHA
   */
  private loadRecaptchaScript(): void {
    if (typeof window !== 'undefined' && !window.grecaptcha) {
      const script = document.createElement('script');
      script.src = 'https://www.google.com/recaptcha/api.js';
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
  }

  /**
   * Obtiene el control del email
   */
  get emailControl(): FormControl {
    return this.loginForm.get('email') as FormControl;
  }

  /**
   * Callback cuando reCAPTCHA se resuelve
   */
  onRecaptchaResolved(token: string): void {
    this.recaptchaToken = token;
    console.log('🔵 reCAPTCHA token obtenido');
  }

  /**
   * Obtiene el control de la contraseña
   */
  get passwordControl(): FormControl {
    return this.loginForm.get('password') as FormControl;
  }

  /**
   * Mensaje de error de email con i18n
   */
  getEmailError(): string {
    if (this.emailControl.hasError('required')) {
      return this.i18n.translate('validation.email.required');
    }
    if (this.emailControl.hasError('email')) {
      return this.i18n.translate('validation.email.invalid');
    }
    return '';
  }

  /**
   * Mensaje de error de contraseña con i18n
   */
  getPasswordError(): string {
    if (this.passwordControl.hasError('required')) {
      return this.i18n.translate('validation.password.required');
    }
    if (this.passwordControl.hasError('minlength')) {
      return this.i18n.translate('validation.password.minLength');
    }
    return '';
  }

  /**
   * Toggle de visibilidad de contraseña
   */
  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  /**
   * Muestra error de rate limit
   */
  private showRateLimitError(): void {
    const remaining = this.rateLimitService.getLockoutTimeRemaining();
    this.loginError = this.i18n.translate('rateLimit.message', {
      remaining: remaining
    });
  }

  /**
   * Envía el formulario
   */
  async onSubmit(): Promise<void> {
    // Verificar si está bloqueado por rate limit
    if (this.rateLimitService.isLocked()) {
      this.showRateLimitError();
      return;
    }

    // Validar formulario
    if (this.loginForm.invalid) {
      Object.keys(this.loginForm.controls).forEach(key => {
        this.loginForm.get(key)?.markAsTouched();
      });
      return;
    }

    // Verificar reCAPTCHA
    if (!this.recaptchaToken) {
      this.loginError = this.i18n.translate('validation.recaptcha');
      return;
    }

    try {
      this.isLoading = true;
      this.loginError = null;
      this.loginSuccess = null;

      const { email, password } = this.loginForm.value;

      // Validar email y contraseña con SecurityService
      if (!this.securityService.validateEmail(email)) {
        this.loginError = this.i18n.translate('validation.email.invalid');
        this.isLoading = false;
        return;
      }

      const passwordValidation = this.securityService.validatePassword(password);
      if (!passwordValidation.isValid) {
        this.loginError = passwordValidation.errors[0];
        this.isLoading = false;
        return;
      }

      console.log('🔵 Login Component: Llamando a authService.login...');

      // Realizar login
      this.authService.login(email, password, this.recaptchaToken).subscribe({
        next: (response: any) => {
          console.log('🔵 Login Component: Login response:', response);

          // Verificar si es respuesta 2FA (mensaje sin tokens)
          const is2FA = response.message && response.message.includes('2FA');

          if (is2FA) {
            // Primer login - redirigir a 2FA
            console.log('🔵 Login Component: 2FA requerido, redirigiendo...');
            sessionStorage.setItem('pendingEmail', email);
            this.loginSuccess = this.i18n.translate('success.login');
            this.isLoading = false;

            setTimeout(() => {
              this.router.navigate(['/auth/verify-2fa'], {
                queryParams: { email: email }
              });
            }, 1000);
          } else {
            // Login normal con tokens
            console.log('🔵 Login Component: Login exitoso con tokens');
            this.loginSuccess = this.i18n.translate('success.login');

            // Limpiar intentos fallidos
            this.rateLimitService.clearFailedAttempts();

            // Resetear token reCAPTCHA
            this.recaptchaToken = null;
            if (window.grecaptcha) {
              window.grecaptcha.reset();
            }

            // Redirigir al PERFIL del usuario
            console.log('🔵 Login Component: Redirigiendo a /profile...');
            this.isLoading = false;
            this.router.navigate(['/profile']);
          }
        },
        error: (error) => {
          console.error('❌ Login Component: Error en login:', error);
          this.isLoading = false;

          // Registrar intento fallido para rate limiting
          this.rateLimitService.recordFailedAttempt('/api/auth/login');

          // Manejar error con granularidad
          const errorMessage = this.handleLoginError(error);
          this.loginError = errorMessage;

          // Resetear reCAPTCHA
          this.recaptchaToken = null;
          if (window.grecaptcha) {
            window.grecaptcha.reset();
          }
        }
      });
    } catch (error: any) {
      this.isLoading = false;
      const appError = this.errorHandlingService.handleNetworkError(
        error,
        '/api/auth/login',
        'login'
      );
      this.loginError = appError.userMessage;
      this.recaptchaToken = null;
      if (window.grecaptcha) {
        window.grecaptcha.reset();
      }
    }
  }

  /**
   * Maneja errores de login con granularidad
   */
  private handleLoginError(error: any): string {
    const status = error.status || 0;
    const body = error.error || {};

    const appError = this.errorHandlingService.handleHttpError(
      status,
      body,
      '/api/auth/login',
      'login'
    );

    return appError.userMessage;
  }

  ngOnDestroy(): void {
    // Limpieza
  }
}
