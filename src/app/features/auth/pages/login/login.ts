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
    // Esperar a que reCAPTCHA y Google estén disponibles
    setTimeout(() => {
      this.initializeGoogleSignIn();
    }, 800);
  }

  /**
   * Inicializa Google Sign-In
   */
  private initializeGoogleSignIn(): void {
    const google = (window as any).google;

    if (!google) {
      console.warn('Google Identity Services no cargado aún');
      return;
    }

    const clientId = environment.google.clientId;
    if (!clientId || clientId.includes('TU_CLIENT_ID')) {
      console.warn('Google CLIENT_ID no configurado');
      return;
    }

    try {
      // Inicializar Google
      google.accounts.id.initialize({
        client_id: clientId,
        callback: (response: any) => {
          this.handleGoogleResponse(response);
        }
      });

      // Renderizar el botón de Google EN el elemento HTML
      const googleButton = document.getElementById('google-login-button');
      if (googleButton) {
        google.accounts.id.renderButton(googleButton, {
          theme: 'outline',
          size: 'large',
          width: '100%',
          locale: 'es'
        });
      }
    } catch (error) {
      console.error('Error inicializando Google Sign-In:', error);
    }
  }

  /**
   * Login con Google - Simplemente dejar que Google maneje el click
   * El botón renderizado por Google manejará todo automáticamente
   */
  loginWithGoogle(): void {
    // Este método ya no hace nada porque el botón de Google
    // renderizado en initializeGoogleSignIn() maneja todo automáticamente
    // Pero lo mantenemos para compatibilidad con el HTML
  }

  /**
   * Maneja la respuesta del login de Google
   */
  private handleGoogleResponse(response: any): void {
    try {
      if (response.credential) {
        const tokenId = response.credential;

        this.isLoading = true;
        this.loginError = null;

        // Llamar al servicio de autenticación con el token de Google
        this.authService
          .loginWithGoogle(tokenId)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: (response) => {
              console.log('Google login exitoso:', response);
              // Redirigir después de 1 segundo
              setTimeout(() => {
                this.router.navigate(['/dashboard']);
              }, 1000);
            },
            error: (error) => {
              this.isLoading = false;
              this.loginError = error.message || 'Error al iniciar sesión con Google';
              console.error('Google login error:', error);
            }
          });
      } else {
        this.loginError = 'No se pudo obtener el token de Google';
      }
    } catch (error: any) {
      this.isLoading = false;
      this.loginError = 'Error al procesar login de Google';
      console.error('Error:', error);
    }
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

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
