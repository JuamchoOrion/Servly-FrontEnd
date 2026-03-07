import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormControl, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
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
  recaptchaSiteKey = environment.recaptcha.siteKey;
  private recaptchaToken: string | null = null;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.initializeForm();
    // Exponer el callback globalmente para reCAPTCHA
    (window as any).onRecaptchaResolved = this.onRecaptchaResolved.bind(this);
  }

  ngOnInit(): void {
    this.loadRecaptchaScript();
  }

  /**
   * Login con Google OAuth2
   * Redirige al backend para iniciar el flujo OAuth2
   */
  loginWithGoogle(): void {
    this.authService.loginWithGoogle();
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
   * Callback cuando reCAPTCHA se resuelve exitosamente
   */
  onRecaptchaResolved(token: string): void {
    this.recaptchaToken = token;
    console.log('🔵 reCAPTCHA token obtenido:', token ? 'OK' : 'NULL');
  }

  /**
   * Obtiene el control de la contraseña
   */
  get passwordControl(): FormControl {
    return this.loginForm.get('password') as FormControl;
  }

  /**
   * Mensaje de error de email
   */
  getEmailError(): string {
    if (this.emailControl.hasError('required')) {
      return 'El correo es requerido';
    }
    if (this.emailControl.hasError('email')) {
      return 'Correo inválido';
    }
    return '';
  }

  /**
   * Mensaje de error de contraseña
   */
  getPasswordError(): string {
    if (this.passwordControl.hasError('required')) {
      return 'La contraseña es requerida';
    }
    if (this.passwordControl.hasError('minlength')) {
      return 'Mínimo 6 caracteres';
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
   * Envía el formulario
   */
  async onSubmit(): Promise<void> {
    if (this.loginForm.invalid) {
      Object.keys(this.loginForm.controls).forEach(key => {
        this.loginForm.get(key)?.markAsTouched();
      });
      return;
    }

    if (!this.recaptchaToken) {
      this.loginError = 'Por favor, completa el reCAPTCHA';
      return;
    }

    try {
      this.isLoading = true;
      this.loginError = null;

      const { email, password } = this.loginForm.value;

      // Llamar al servicio de autenticación con token fresco
      this.authService
        .login(email, password, this.recaptchaToken)
        .subscribe({
          next: (response) => {
            console.log('Login exitoso:', response);
            // Resetear token después del login exitoso
            this.recaptchaToken = null;
            if (window.grecaptcha) {
              window.grecaptcha.reset();
            }
            // Redirigir después de 1 segundo
            setTimeout(() => {
              this.router.navigate(['/dashboard']);
            }, 1000);
          },
          error: (error) => {
            this.isLoading = false;
            this.loginError = error.message || 'Error al iniciar sesión';
            console.error('Login error:', error);
            // Resetear reCAPTCHA para intentar de nuevo
            this.recaptchaToken = null;
            if (window.grecaptcha) {
              window.grecaptcha.reset();
            }
          }
        });
    } catch (error: any) {
      this.isLoading = false;
      this.loginError = error.message || 'Error al procesar el login';
      console.error('Error:', error);
      // Resetear reCAPTCHA
      this.recaptchaToken = null;
      if (window.grecaptcha) {
        window.grecaptcha.reset();
      }
    }
  }

  ngOnDestroy(): void {
    // Limpieza
  }
}
