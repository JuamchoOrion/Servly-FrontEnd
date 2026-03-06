import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormControl, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
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
export class LoginComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('recaptchaContainer') recaptchaContainer!: ElementRef;

  loginForm!: FormGroup;
  isLoading = false;
  showPassword = false;
  loginError: string | null = null;
  recaptchaSiteKey = environment.recaptcha.siteKey;

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.initializeForm();
  }

  ngOnInit(): void {
    this.loadRecaptchaScript();
  }

  ngAfterViewInit(): void {
    // Esperar a que reCAPTCHA esté disponible
    setTimeout(() => {
      this.ensureRecaptchaLoaded();
    }, 500);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
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
   * Asegura que reCAPTCHA esté cargado
   */
  private ensureRecaptchaLoaded(): void {
    let attempts = 0;
    const interval = setInterval(() => {
      if (window.grecaptcha && this.recaptchaContainer) {
        clearInterval(interval);
        console.log('reCAPTCHA cargado correctamente');
      } else if (attempts > 20) {
        clearInterval(interval);
        console.warn('reCAPTCHA no se cargó después de múltiples intentos');
      }
      attempts++;
    }, 100);
  }

  /**
   * Obtiene el control del email
   */
  get emailControl(): FormControl {
    return this.loginForm.get('email') as FormControl;
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
   * Obtiene el token de reCAPTCHA
   */
  private getRecaptchaToken(): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        if (!window.grecaptcha) {
          reject(new Error('reCAPTCHA no está cargado'));
          return;
        }
        const token = window.grecaptcha.getResponse();
        if (token) {
          resolve(token);
        } else {
          reject(new Error('Por favor, completa el reCAPTCHA'));
        }
      } catch (error) {
        reject(error);
      }
    });
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

    try {
      this.isLoading = true;
      this.loginError = null;

      // Obtener token de reCAPTCHA
      const recaptchaToken = await this.getRecaptchaToken();

      const { email, password } = this.loginForm.value;

      // Llamar al servicio de autenticación
      this.authService
        .login(email, password, recaptchaToken)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            console.log('Login exitoso:', response);
            // Redirigir después de 1 segundo
            setTimeout(() => {
              this.router.navigate(['/dashboard']);
            }, 1000);
          },
          error: (error) => {
            this.isLoading = false;
            this.loginError = error.message || 'Error al iniciar sesión';
            console.error('Login error:', error);
          }
        });
    } catch (error: any) {
      this.isLoading = false;
      this.loginError = error.message || 'Error al procesar el login';
      console.error('Error:', error);
    }
  }

  /**
   * Login con Google (placeholder)
   */
  loginWithGoogle(): void {
    console.log('Google login - a implementar');
    // TODO: Implementar Google OAuth
  }
}

