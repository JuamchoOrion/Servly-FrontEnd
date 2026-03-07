import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormControl, Validators } from '@angular/forms';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { SupplierService, SupplierDTO, SupplierCreateRequest, MessageResponse } from '../../core/services/supplier.service';

@Component({
  selector: 'app-suppliers',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, RouterLinkActive],
  templateUrl: './Suppliers.html',
  styleUrls: ['./suppliers.scss']
})
export class SuppliersComponent implements OnInit {
  suppliers: SupplierDTO[] = [];
  isLoading = false;
  isSubmitting = false;
  showModal = false;
  isEditing = false;
  formError: string | null = null;
  editingSupplierId: number | null = null;

  // Dropdown de navegación
  dropdownOpen: string | null = null;

  supplierForm!: FormGroup;

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef,
    private supplierService: SupplierService
  ) {
    this.initializeForm();
  }

  ngOnInit(): void {
    this.loadSuppliers();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Inicializa el formulario
   */
  private initializeForm(): void {
    this.supplierForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(200)]],
      description: ['', [Validators.maxLength(500)]],
      contactNumber: ['', [Validators.maxLength(20)]],
      email: ['', [Validators.email, Validators.maxLength(200)]],
      logoUrl: ['', [Validators.maxLength(500)]]
    });
  }

  /**
   * Carga los proveedores desde el backend
   */
  private loadSuppliers(): void {
    this.isLoading = true;

    this.supplierService.getAll()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.suppliers = data;
          this.isLoading = false;
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('Error al cargar proveedores:', error);
          this.isLoading = false;
          this.cdr.detectChanges();
        }
      });
  }

  /**
   * Obtiene el control del nombre
   */
  get nameControl(): FormControl {
    return this.supplierForm.get('name') as FormControl;
  }

  /**
   * Obtiene el control de descripción
   */
  get descriptionControl(): FormControl {
    return this.supplierForm.get('description') as FormControl;
  }

  /**
   * Obtiene el control de número de contacto
   */
  get contactNumberControl(): FormControl {
    return this.supplierForm.get('contactNumber') as FormControl;
  }

  /**
   * Obtiene el control de email
   */
  get emailControl(): FormControl {
    return this.supplierForm.get('email') as FormControl;
  }

  /**
   * Obtiene el control de logo URL
   */
  get logoUrlControl(): FormControl {
    return this.supplierForm.get('logoUrl') as FormControl;
  }

  /**
   * Alterna el dropdown de navegación
   */
  toggleDropdown(menu: string): void {
    this.dropdownOpen = this.dropdownOpen === menu ? null : menu;
  }

  /**
   * Mensaje de error de nombre
   */
  getNameError(): string {
    if (this.nameControl.hasError('required')) {
      return 'El nombre es requerido';
    }
    if (this.nameControl.hasError('minlength')) {
      return 'Mínimo 2 caracteres';
    }
    if (this.nameControl.hasError('maxlength')) {
      return 'Máximo 200 caracteres';
    }
    return '';
  }

  /**
   * Mensaje de error de email
   */
  getEmailError(): string {
    if (this.emailControl.hasError('email')) {
      return 'Email inválido';
    }
    return '';
  }

  /**
   * Abre el modal para crear nuevo proveedor
   */
  openCreateModal(): void {
    this.isEditing = false;
    this.editingSupplierId = null;
    this.formError = null;
    this.supplierForm.reset();
    this.showModal = true;
  }

  /**
   * Abre el modal para editar proveedor
   */
  editSupplier(supplier: SupplierDTO): void {
    this.isEditing = true;
    this.editingSupplierId = supplier.id;
    this.formError = null;

    this.supplierForm.patchValue({
      name: supplier.name,
      description: supplier.description,
      contactNumber: supplier.contactNumber,
      email: supplier.email,
      logoUrl: supplier.logoUrl
    });

    this.showModal = true;
  }

  /**
   * Cierra el modal
   */
  closeModal(): void {
    this.showModal = false;
    this.isEditing = false;
    this.editingSupplierId = null;
    this.formError = null;
    this.supplierForm.reset();
  }

  /**
   * Elimina un proveedor
   */
  deleteSupplier(supplier: SupplierDTO): void {
    if (confirm(`¿Estás seguro de eliminar "${supplier.name}"?`)) {
      this.supplierService.delete(supplier.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.suppliers = this.suppliers.filter(s => s.id !== supplier.id);
          },
          error: (error) => {
            console.error('Error al eliminar proveedor:', error);
          }
        });
    }
  }

  /**
   * Envía el formulario (crear o actualizar)
   */
  onSubmit(): void {
    if (this.supplierForm.invalid) {
      Object.keys(this.supplierForm.controls).forEach(key => {
        this.supplierForm.get(key)?.markAsTouched();
      });
      return;
    }

    try {
      this.isSubmitting = true;
      this.formError = null;

      const formValue = this.supplierForm.value;
      const request: SupplierCreateRequest = {
        name: formValue.name,
        description: formValue.description,
        contactNumber: formValue.contactNumber,
        email: formValue.email,
        logoUrl: formValue.logoUrl
      };

      if (this.isEditing && this.editingSupplierId) {
        // Actualizar proveedor existente
        this.supplierService.update(this.editingSupplierId, request)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.isSubmitting = false;
              this.closeModal();
              this.loadSuppliers();
            },
            error: (error) => {
              this.isSubmitting = false;
              this.formError = error.message || 'Error al actualizar el proveedor';
              console.error('Error:', error);
            }
          });

      } else {
        // Crear nuevo proveedor
        this.supplierService.create(request)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.isSubmitting = false;
              this.closeModal();
              this.loadSuppliers();
            },
            error: (error) => {
              this.isSubmitting = false;
              this.formError = error.message || 'Error al crear el proveedor';
              console.error('Error:', error);
            }
          });
      }
    } catch (error: any) {
      this.isSubmitting = false;
      this.formError = error.message || 'Error al procesar la solicitud';
      console.error('Error:', error);
    }
  }
}
