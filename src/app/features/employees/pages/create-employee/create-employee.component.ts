import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { EmployeeService } from '../../../../core/services/employee.service';
import { AuthService } from '../../../../core/services/auth.service';
import { CreateEmployeeDto } from '../../../../core/dtos/employee.dto';

interface RoleOption {
  value: 'CASHIER' | 'WAITER' | 'KITCHEN' | 'STOREKEEPER';
  label: string;
}

@Component({
  selector: 'app-create-employee',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './create-employee.component.html',
  styleUrls: ['./create-employee.component.scss']
})
export class CreateEmployeeComponent implements OnInit {

  employeeForm!: FormGroup;
  isLoading = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;

  readonly roleOptions: RoleOption[] = [
    { value: 'CASHIER', label: 'Cajero' },
    { value: 'WAITER', label: 'Mesero' },
    { value: 'KITCHEN', label: 'Cocina' },
    { value: 'STOREKEEPER', label: 'Bodega' }
  ];

  constructor(
    private fb: FormBuilder,
    private employeeService: EmployeeService,
    private authService: AuthService,
    private router: Router
  ) {
    this.initializeForm();
  }

  ngOnInit(): void {
    // Verificar que el usuario sea ADMIN
    if (!this.authService.hasRole('ADMIN')) {
      this.router.navigate(['/access-denied']);
      return;
    }
  }

  private initializeForm(): void {
    this.employeeForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      lastName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      email: ['', [Validators.required, Validators.email]],
      address: ['', [Validators.maxLength(200)]],
      role: ['', [Validators.required]]
    });
  }

  get nameControl() {
    return this.employeeForm.get('name');
  }

  get lastNameControl() {
    return this.employeeForm.get('lastName');
  }

  get emailControl() {
    return this.employeeForm.get('email');
  }

  get addressControl() {
    return this.employeeForm.get('address');
  }

  get roleControl() {
    return this.employeeForm.get('role');
  }

  getFieldError(field: string): string {
    const control = this.employeeForm.get(field);
    if (!control || !control.touched) {
      return '';
    }

    if (control.hasError('required')) {
      return 'Este campo es obligatorio';
    }
    if (control.hasError('email')) {
      return 'Email inválido';
    }
    if (control.hasError('minlength')) {
      return 'Mínimo 2 caracteres';
    }
    if (control.hasError('maxlength')) {
      const maxLength = control.errors?.['maxlength']?.requiredLength || 100;
      return `Máximo ${maxLength} caracteres`;
    }

    return '';
  }

  onSubmit(): void {
    // Resetear mensajes
    this.errorMessage = null;
    this.successMessage = null;

    // Validar formulario
    if (this.employeeForm.invalid) {
      this.employeeForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;

    const formValue = this.employeeForm.value;
    const employeeDto: CreateEmployeeDto = {
      name: formValue.name,
      lastName: formValue.lastName,
      email: formValue.email,
      address: formValue.address || undefined,
      role: formValue.role
    };

    this.employeeService.createEmployee(employeeDto).subscribe({
      next: (response) => {
        this.isLoading = false;
        this.successMessage = 'Empleado creado. Credenciales enviadas al email. El empleado recibirá contraseña temporal y debe cambiarla en su primer login';

        // Limpiar formulario
        this.employeeForm.reset();
        this.employeeForm.markAsUntouched();

        // Redirigir después de mostrar el mensaje
        setTimeout(() => {
          this.router.navigate(['/dashboard']);
        }, 4000);
      },
      error: (error) => {
        this.isLoading = false;

        if (error.status === 403) {
          this.errorMessage = 'No tiene permisos';
          setTimeout(() => {
            this.router.navigate(['/login']);
          }, 2000);
        } else if (error.status === 404) {
          this.errorMessage = 'Usuario no encontrado';
          setTimeout(() => {
            this.router.navigate(['/login']);
          }, 2000);
        } else {
          this.errorMessage = error.message || 'Error al crear el empleado';

          // Mantener datos en formulario para que el usuario pueda corregir
          if (error.status === 409) {
            this.emailControl?.setErrors({ duplicate: true });
            this.emailControl?.markAsTouched();
          }
        }
      }
    });
  }

  onCancel(): void {
    this.router.navigate(['/dashboard']);
  }
}
