import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import {
  IonCard,
  IonInput,
  IonLabel
} from '@ionic/angular/standalone';
import { trigger, transition, style, animate } from '@angular/animations';
import { LoginRequestDTO } from '../../../../core/dtos';

/**
 * Componente de Login para empleados de Servly
 *
 * Características:
 * - Formulario reactivo con validación
 * - Inputs con validación de email y contraseña
 * - Estados de carga
 * - Integración con Google (simulada)
 * - Diseño premium y responsive
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
export class LoginComponent implements OnInit {
  // Propiedades del formulario
  loginForm!: FormGroup;

  // Estados de UI
  isLoading = false;
  showPassword = false;
  loginError: string | null = null;

  constructor(private fb: FormBuilder) {
    this.initializeForm();
  }

  ngOnInit(): void {
    // Lógica de inicialización si es necesaria
  }

  /**
   * Inicializa el formulario reactivo con validadores
   */
  private initializeForm(): void {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  /**
   * Getter para el control de email
   */
  get emailControl() {
    return this.loginForm.get('email');
  }

  /**
   * Getter para el control de contraseña
   */
  get passwordControl() {
    return this.loginForm.get('password');
  }

  /**
   * Genera mensaje de error para el campo email
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
   * Genera mensaje de error para el campo contraseña
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
   * Alterna la visibilidad de la contraseña
   */
  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  /**
   * Simula el proceso de login
   * En producción, esto conectaría con un servicio de autenticación
   */
  login(): void {
    // Marcar todos los campos como tocados para mostrar errores
    Object.keys(this.loginForm.controls).forEach(key => {
      this.loginForm.get(key)?.markAsTouched();
    });

    // Validar que el formulario sea válido antes de proceder
    if (this.loginForm.invalid) {
      return;
    }

    // Iniciar estado de carga
    this.isLoading = true;
    this.loginError = null;

    // Crear objeto DTO con los datos del formulario
    const loginRequest: LoginRequestDTO = {
      email: this.loginForm.get('email')?.value,
      password: this.loginForm.get('password')?.value
    };

    console.log('Login Request DTO:', loginRequest);

    // Simular petición al servidor (2 segundos)
    // En producción: this.authService.login(loginRequest).subscribe(...)
    setTimeout(() => {
      this.isLoading = false;
      console.log('Login simulado completado');
      // En producción: navegar al dashboard o mostrar error
    }, 2000);
  }

  /**
   * Simula el login con Google
   * En producción, esto usaría Google OAuth
   */
  loginWithGoogle(): void {
    this.isLoading = true;
    this.loginError = null;

    console.log('Login con Google');

    // Simular petición al servidor (1.5 segundos)
    // En producción: this.authService.loginWithGoogle().subscribe(...)
    setTimeout(() => {
      this.isLoading = false;
      console.log('Google login simulado completado');
      // En producción: navegar al dashboard o mostrar error
    }, 1500);
  }
}
