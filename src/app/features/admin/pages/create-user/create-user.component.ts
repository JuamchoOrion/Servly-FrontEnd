import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router } from '@angular/router';
import { AdminService } from '../../../../core/services/admin.service';
import { ROLE_LABELS, UserRole } from '../../../../core/dtos/create-user-request.dto';

@Component({
  selector: 'app-create-user',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './create-user.component.html',
  styleUrls: ['./create-user.component.scss']
})
export class CreateUserComponent implements OnInit {

  createUserForm!: FormGroup;
  isLoading = false;
  successMessage: string | null = null;
  errorMessage: string | null = null;

  // Roles disponibles para el select (NO incluye ADMIN)
  readonly ROLES = Object.entries(ROLE_LABELS).map(([value, label]) => ({ value, label }));

  constructor(
    private fb: FormBuilder,
    private adminService: AdminService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.initializeForm();
  }

  /**
   * Inicializa el formulario con validaciones
   */
  private initializeForm(): void {
    this.createUserForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      name: ['', [Validators.required, Validators.maxLength(100)]],
      lastName: ['', [Validators.required, Validators.maxLength(100)]],
      role: ['', [Validators.required]]
    });
  }

  /**
   * Obtiene el control del email
   */
  get emailControl() {
    return this.createUserForm.get('email');
  }

  /**
   * Obtiene el control del nombre
   */
  get nameControl() {
    return this.createUserForm.get('name');
  }

  /**
   * Obtiene el control del apellido
   */
  get lastNameControl() {
    return this.createUserForm.get('lastName');
  }

  /**
   * Obtiene el control del rol
   */
  get roleControl() {
    return this.createUserForm.get('role');
  }

  /**
   * Mensajes de error para email
   */
  getEmailError(): string {
    if (this.emailControl?.hasError('required')) {
      return 'El email es requerido';
    }
    if (this.emailControl?.hasError('email')) {
      return 'Email inválido';
    }
    if (this.emailControl?.hasError('duplicate')) {
      return 'El email ya está registrado';
    }
    return '';
  }

  /**
   * Mensajes de error para nombre
   */
  getNameError(): string {
    if (this.nameControl?.hasError('required')) {
      return 'El nombre es requerido';
    }
    if (this.nameControl?.hasError('maxlength')) {
      return 'Máximo 100 caracteres';
    }
    return '';
  }

  /**
   * Mensajes de error para apellido
   */
  getLastNameError(): string {
    if (this.lastNameControl?.hasError('required')) {
      return 'El apellido es requerido';
    }
    if (this.lastNameControl?.hasError('maxlength')) {
      return 'Máximo 100 caracteres';
    }
    return '';
  }

  /**
   * Mensajes de error para rol
   */
  getRoleError(): string {
    if (this.roleControl?.hasError('required')) {
      return 'El rol es requerido';
    }
    return '';
  }

  /**
   * Envía el formulario
   */
  onSubmit(): void {
    if (this.createUserForm.invalid) {
      this.createUserForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.successMessage = null;
    this.errorMessage = null;

    const formValue = this.createUserForm.value;

    // El backend genera la contraseña temporal automáticamente
    this.adminService.createUser({
      email: formValue.email,
      name: formValue.name,
      lastName: formValue.lastName,
      role: formValue.role as UserRole
    }).subscribe({
      next: (response) => {
        this.isLoading = false;
        this.successMessage = 'Usuario creado exitosamente';
        this.errorMessage = null;
        this.createUserForm.reset();

        // Redirigir al dashboard después de 2 segundos
        setTimeout(() => {
          this.router.navigate(['/dashboard']);
        }, 2000);
      },
      error: (error) => {
        this.isLoading = false;
        this.successMessage = null;
        this.errorMessage = error.message || 'Error al crear usuario';

        // Marcar email como duplicado si es el error
        if (error.message?.includes('email') || error.message?.includes('registrado')) {
          this.emailControl?.setErrors({ duplicate: true });
        }

        // Marcar errores específicos por campo si vienen del backend
        if (error.message?.includes('role')) {
          this.roleControl?.setErrors({ serverError: error.message });
        }

        console.error('Create user error:', error);
      }
    });
  }

  /**
   * Cancela y regresa al dashboard
   */
  onCancel(): void {
    this.router.navigate(['/dashboard']);
  }
}
