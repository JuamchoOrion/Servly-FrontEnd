import { Component, OnInit, OnDestroy, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormControl, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
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
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private cdr: ChangeDetectorRef
  ) {
    this.initializeForm();
    // Exponer el callback globalmente para reCAPTCHA
    (window as any).onRecaptchaResolved = this.onRecaptchaResolved.bind(this);
  }

  ngOnInit(): void {
    this.loadRecaptchaScript();
    this.setupRateLimitListener();
    this.availableLanguages = this.i18n.getSupportedLanguages();
    this.checkOAuth2Error();
  }

  /**
   * Verifica si hay errores de OAuth2 en los query params
   */
  private checkOAuth2Error(): void {
    this.activatedRoute.queryParams.subscribe(params => {
      const error = params['error'];
      if (error) {
        console.log('🔵 [LoginComponent] Error OAuth2 detectado:', error);
        this.handleOAuth2ErrorFromParams(error);
      }
    });
  }

  /**
   * Maneja errores OAuth2 provenientes de los query params
   */
  private handleOAuth2ErrorFromParams(error: string): void {
    const errorMessages: Record<string, string> = {
      'oauth2_failed': 'Error en la autenticación con Google',
      'missing_tokens': 'No se recibieron los tokens de autenticación',
      'missing_email': 'No se recibió el email del usuario',
      'user_not_found': 'Usuario no encontrado en el sistema',
      'access_denied': 'Acceso denegado por Google',
      'invalid_token': 'Token de autenticación inválido'
    };

    this.loginError = errorMessages[error] || 'Error en la autenticación con Google';
    console.log('🔵 [LoginComponent] Error mostrado al usuario:', this.loginError);

    // Limpiar el query param después de mostrar el error
    this.router.navigate(['/login'], { replaceUrl: true });
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

      // Realizar login
      this.authService.login(email, password, this.recaptchaToken).subscribe({
        next: (response) => {
          console.log('═══════════════════════════════════════════════════════════');
          console.log('🔵 [Login] Autenticación exitosa');
          console.log('🔵 [Login] Response:', response);

          this.isLoading = false;
          this.loginSuccess = this.i18n.translate('success.login');

          // Limpiar intentos fallidos
          this.rateLimitService.clearFailedAttempts();
          // 🔐 Inicializar CSRF después del login
          this.securityService.initCsrf();

          // Resetear token reCAPTCHA
          this.recaptchaToken = null;
          if (window.grecaptcha) {
            window.grecaptcha.reset();
          }

          // Redirigir según el flujo
          setTimeout(() => {
            console.log('🔵 [Login] Preparando redirección...');

            // Verificar si debe cambiar contraseña (primer login)
            if (response.mustChangePassword) {
              console.log('🔵 [Login] mustChangePassword=true, redirigiendo a force-password-change');
              // El token temporal ya se guardó en el servicio
              this.router.navigate(['/auth/force-password-change']);
              return;
            }

            // Login normal - guardar tokens y ejecutar redirección por rol
            console.log('🔵 [Login] Guardando tokens...');

            // El authService ya guardó los tokens en el método login()
            // Ahora ejecutar redirección basada en rol
            const userRole = response.role?.toUpperCase();
            console.log('🔵 [Login] Rol detectado:', userRole);
            console.log('🔵 [Login] Ejecutando redirección por rol');

            // Usar el método centralizado de redirección por rol
            this.authService.redirectUserByRole(userRole);

            console.log('═══════════════════════════════════════════════════════════');
          }, 1500);
        },
        error: (error) => {
          console.log('═══════════════════════════════════════════════════════════');
          console.log('🔴 [Login] ERROR en login');
          console.log('🔴 [Login] error.status:', error?.status);
          console.log('🔴 [Login] error.error:', error?.error);
          console.log('🔴 [Login] error.is2faRequired:', error?.is2faRequired);
          console.log('🔴 [Login] error.message:', error?.message);

          // Caso especial: 2FA requerido - redirigir inmediatamente
          if (error?.is2faRequired) {
            console.log('🔵 2FA detectado, preparando redirección...');
            this.isLoading = false;
            console.log('🔵 isLoading establecido a false');
            console.log('🔵 Navegando a /auth/verify-2fa');
            // Pequeño delay para asegurar que el UI se actualice
            setTimeout(() => {
              console.log('🔵 Ejecutando router.navigate...');
              this.router.navigate(['/auth/verify-2fa']).then(
                (success) => console.log('🔵 Navegación exitosa:', success),
                (err) => console.error('🔵 Error en navegación:', err)
              );
            }, 100);
            return;
          }

          console.log('🔴 [Login] Antes de setear isLoading = false');
          this.isLoading = false;
          console.log('🔴 [Login] isLoading después de setear:', this.isLoading);

          // Registrar intento fallido para rate limiting
          this.rateLimitService.recordFailedAttempt('/api/auth/login');

          // Manejar error con granularidad
          console.log('🔴 [Login] Llamando a handleLoginError...');
          const errorMessage = this.handleLoginError(error);
          console.log('🔴 [Login] errorMessage obtenido:', errorMessage);

          this.loginError = errorMessage;
          console.log('🔴 [Login] loginError seteado:', this.loginError);

          // Forzar detección de cambios
          this.cdr.detectChanges();

          // Resetear reCAPTCHA
          this.recaptchaToken = null;
          if (window.grecaptcha) {
            window.grecaptcha.reset();
          }

          console.log('═══════════════════════════════════════════════════════════');
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
