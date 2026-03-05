import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { IonCard, IonInput, IonLabel } from '@ionic/angular/standalone';
import { trigger, transition, style, animate } from '@angular/animations';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AuthService } from '../../../../core/services/auth.service';
import { environment } from '../../../../../enviroments/enviroment';

declare global {
  interface Window {
    grecaptcha: any;
  }
}

/**
 * LoginComponent
 * Componente de login para empleados de Servly
 *
 * Características:
 * - Validación reactiva
 * - Integración con reCAPTCHA v3
 * - Manejo de errores del backend
 * - Tokens JWT con refresh automático
 * - Diseño premium restaurant
 * - Accesibilidad WCAG AA+
 */
@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    IonCard,
    IonInput,
    IonLabel
  ],
  templateUrl: './login.html',
  styleUrls: ['./login.scss'],
  animations: [
    trigger('fadeInUp', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(20px)' }),
        animate('600ms cubic-bezier(0.34, 1.56, 0.64, 1)', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ])
  ]
})
export class LoginComponent implements OnInit, OnDestroy {

  // Formulario reactivo
  loginForm!: FormGroup;

  // Estados de UI
  isLoading = false;
  showPassword = false;
  loginError: string | null = null;
  loginSuccess = false;  // ← AGREGAR: para mostrar pantalla de éxito
  successUserName: string = '';  // ← AGREGAR: nombre del usuario que se logueó
  recaptchaToken: string | null = null;

  // reCAPTCHA
  recaptchaSiteKey = environment.recaptcha.siteKey;
  recaptchaEnabled = environment.recaptcha.enabled;

  // Cleanup
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.initializeForm();
  }

  ngOnInit(): void {
    // Cargar script de reCAPTCHA si está habilitado
    if (this.recaptchaEnabled) {
      this.loadRecaptchaScript();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Inicializa el formulario con validadores
   */
  private initializeForm(): void {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  /**
   * Carga el script de reCAPTCHA de Google
   */
  private loadRecaptchaScript(): void {
    if (!window.grecaptcha) {
      const script = document.createElement('script');
      script.src = 'https://www.google.com/recaptcha/api.js';
      script.async = true;
      script.defer = true;
      // Callback global para reCAPTCHA v2
      (window as any).onRecaptchaLoad = () => {
        console.log('reCAPTCHA cargado correctamente');
      };
      document.head.appendChild(script);
    }
  }

  /**
   * Obtiene el token de reCAPTCHA v2 (desde el widget)
   */
  private getRecaptchaToken(): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.recaptchaEnabled) {
        resolve(''); // Token vacío si está deshabilitado
        return;
      }

      if (!window.grecaptcha) {
        reject(new Error('reCAPTCHA no está cargado'));
        return;
      }

      // Para v2, obtener el token del widget
      const recaptchaToken = window.grecaptcha.getResponse();

      if (recaptchaToken) {
        resolve(recaptchaToken);
      } else {
        reject(new Error('Por favor, completa el reCAPTCHA'));
      }
    });
  }

  /**
   * Getters para acceso a los controles
   */
  get emailControl() {
    return this.loginForm.get('email');
  }

  get passwordControl() {
    return this.loginForm.get('password');
  }

  /**
   * Genera mensaje de error para email
   */
  get emailError(): string | null {
    const control = this.emailControl;
    if (control?.hasError('required') && control?.touched) {
      return 'El correo es requerido';
    }
    if (control?.hasError('email') && control?.touched) {
      return 'Ingresa un correo válido';
    }
    return null;
  }

  /**
   * Genera mensaje de error para contraseña
   */
  get passwordError(): string | null {
    const control = this.passwordControl;
    if (control?.hasError('required') && control?.touched) {
      return 'La contraseña es requerida';
    }
    if (control?.hasError('minlength') && control?.touched) {
      return 'La contraseña debe tener mínimo 6 caracteres';
    }
    return null;
  }

  /**
   * Alterna visibilidad de la contraseña
   */
  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  /**
   * Realiza el login llamando al backend
   *
   * Proceso:
   * 1. Validar formulario
   * 2. Obtener token de reCAPTCHA
   * 3. Llamar a AuthService.login()
   * 4. Si éxito: guardar tokens y navegar a dashboard
   * 5. Si error: mostrar mensaje según código de error
   */
  async login(): Promise<void> {
    // Marcar todos los campos como tocados para mostrar errores
    Object.keys(this.loginForm.controls).forEach(key => {
      this.loginForm.get(key)?.markAsTouched();
    });

    // Validar formulario
    if (this.loginForm.invalid) {
      return;
    }

    try {
      this.isLoading = true;
      this.loginError = null;

      // Obtener token de reCAPTCHA
      const recaptchaToken = await this.getRecaptchaToken();

      // Obtener valores del formulario
      const email = this.loginForm.get('email')?.value;
      const password = this.loginForm.get('password')?.value;

      // Llamar al servicio de autenticación
      this.authService
        .login(email, password, recaptchaToken)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            console.log('Login exitoso:', response.email);

            // ✅ Mostrar pantalla de éxito
            this.isLoading = false;
            this.loginSuccess = true;
            this.successUserName = response.name || response.email;

            // Navegar después de 2 segundos
            setTimeout(() => {
              if (response.mustChangePassword) {
                this.router.navigate(['/auth/change-password']);
              } else {
                this.router.navigate(['/dashboard']);
              }
            }, 2000);
          },
          error: (error) => {
            this.isLoading = false;
            this.loginError = error.message || 'Error al iniciar sesión. Intenta nuevamente.';
            console.error('Login error:', error);
          },
          complete: () => {
            this.isLoading = false;
          }
        });

    } catch (error) {
      this.isLoading = false;
      this.loginError = 'Error al obtener token de reCAPTCHA. Intenta nuevamente.';
      console.error('reCAPTCHA error:', error);
    }
  }

  /**
   * Placeholder para login con Google (OAuth)
   * Implementar según tu configuración de Google OAuth
   */
  loginWithGoogle(): void {
    console.log('Implementar Google OAuth');
    // TODO: Implementar Google OAuth
  }
}


