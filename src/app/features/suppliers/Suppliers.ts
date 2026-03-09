import { Component, OnInit, ChangeDetectorRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormControl, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { SupplierService, SupplierDTO, SupplierCreateRequest, MessageResponse, PaginatedSupplierResponse } from '../../core/services/supplier.service';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../enviroments/enviroment';

@Component({
  selector: 'app-suppliers',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
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
  selectedLogoFile: File | null = null;
  logoPreviewUrl: string | null = null;

  // Paginación
  currentPage = 0;
  pageSize = 10;
  totalElements = 0;
  totalPages = 0;
  isLastPage = false;

  supplierForm!: FormGroup;

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef,
    private supplierService: SupplierService,
    private http: HttpClient
  ) {
    this.initializeForm();
  }

  ngOnInit(): void {
    this.loadSuppliers();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.logoPreviewUrl) {
      URL.revokeObjectURL(this.logoPreviewUrl);
    }
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
      logo: [null]
    });
  }

  /**
   * Carga los proveedores desde el backend con paginación
   */
  private loadSuppliers(): void {
    this.isLoading = true;

    const params = new HttpParams()
      .set('page', this.currentPage.toString())
      .set('size', this.pageSize.toString())
      .set('sort', 'id,asc');

    this.http.get<PaginatedSupplierResponse>(`${environment.apiUrl}/api/staff/inventory/suppliers/paginated`, { params, withCredentials: true })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.suppliers = response.content || [];
          this.currentPage = response.pageNumber;
          this.pageSize = response.pageSize;
          this.totalElements = response.totalElements;
          this.totalPages = response.totalPages;
          this.isLastPage = response.last;
          this.isLoading = false;
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('Error al cargar proveedores:', error);
          this.suppliers = [];
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
   * Obtiene el control de logo
   */
  get logoControl(): FormControl {
    return this.supplierForm.get('logo') as FormControl;
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
    this.selectedLogoFile = null;
    this.logoPreviewUrl = null;
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
    this.selectedLogoFile = null;
    this.logoPreviewUrl = supplier.logoUrl;

    this.supplierForm.patchValue({
      name: supplier.name,
      description: supplier.description,
      contactNumber: supplier.contactNumber,
      email: supplier.email
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
    this.selectedLogoFile = null;
    if (this.logoPreviewUrl && !this.logoPreviewUrl.startsWith('http')) {
      URL.revokeObjectURL(this.logoPreviewUrl);
    }
    this.logoPreviewUrl = null;
    this.supplierForm.reset();
  }

  /**
   * Cierra el modal con la tecla Escape
   */
  @HostListener('document:keydown.escape')
  handleEscapeKey(): void {
    if (this.showModal) {
      this.closeModal();
    }
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
   * Maneja la selección de archivo de logo con compresión
   */
  onLogoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];

      // Validar tipo de archivo
      if (!file.type.startsWith('image/')) {
        this.formError = 'El archivo debe ser una imagen';
        return;
      }

      // Validar tamaño original (máx 10MB)
      if (file.size > 10 * 1024 * 1024) {
        this.formError = 'La imagen no debe superar 10MB';
        return;
      }

      this.formError = null;

      // Comprimir imagen
      this.compressImage(file).then((compressedFile) => {
        this.selectedLogoFile = compressedFile;

        // Crear URL de preview
        if (this.logoPreviewUrl && this.logoPreviewUrl.startsWith('blob:')) {
          URL.revokeObjectURL(this.logoPreviewUrl);
        }
        this.logoPreviewUrl = URL.createObjectURL(compressedFile);
        this.cdr.detectChanges();
      }).catch((error) => {
        this.formError = 'Error al comprimir la imagen: ' + error.message;
        console.error('Compression error:', error);
      });
    }
  }

  /**
   * Comprime una imagen usando Canvas API
   * Reduce tamaño a máximo 800x800px y calidad 80%
   */
  private compressImage(file: File): Promise<File> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (event: ProgressEvent<FileReader>) => {
        try {
          const img = new Image();

          img.onload = () => {
            // Crear canvas
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            if (!ctx) {
              reject(new Error('No se pudo obtener el contexto del canvas'));
              return;
            }

            // Calcular nuevas dimensiones (máximo 800x800px)
            let width = img.width;
            let height = img.height;
            const maxDimension = 800;

            if (width > height) {
              if (width > maxDimension) {
                height = Math.round((height * maxDimension) / width);
                width = maxDimension;
              }
            } else {
              if (height > maxDimension) {
                width = Math.round((width * maxDimension) / height);
                height = maxDimension;
              }
            }

            // Establecer dimensiones del canvas
            canvas.width = width;
            canvas.height = height;

            // Dibujar imagen en canvas
            ctx.drawImage(img, 0, 0, width, height);

            // Convertir a blob con compresión (calidad 80%)
            canvas.toBlob(
              (blob) => {
                if (!blob) {
                  reject(new Error('No se pudo crear el blob'));
                  return;
                }

                // Crear nuevo File a partir del blob
                const compressedFile = new File(
                  [blob],
                  file.name,
                  { type: 'image/jpeg', lastModified: Date.now() }
                );

                // Log de compresión
                const originalSize = (file.size / 1024).toFixed(2);
                const compressedSize = (compressedFile.size / 1024).toFixed(2);
                const reduction = (((file.size - compressedFile.size) / file.size) * 100).toFixed(1);

                console.log(
                  `Imagen comprimida: ${originalSize}KB → ${compressedSize}KB (reducción: ${reduction}%)`
                );

                resolve(compressedFile);
              },
              'image/jpeg',
              0.8 // Calidad 80%
            );
          };

          img.onerror = () => {
            reject(new Error('No se pudo cargar la imagen'));
          };

          img.src = event.target?.result as string;
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = () => {
        reject(new Error('Error al leer el archivo'));
      };

      reader.readAsDataURL(file);
    });
  }

  /**
   * Elimina el logo seleccionado
   */
  removeLogo(): void {
    this.selectedLogoFile = null;
    if (this.logoPreviewUrl && this.logoPreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(this.logoPreviewUrl);
    }
    this.logoPreviewUrl = null;
    const logoInput = document.getElementById('logo') as HTMLInputElement;
    if (logoInput) {
      logoInput.value = '';
    }
    this.supplierForm.patchValue({ logo: null });
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
        logo: this.selectedLogoFile
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

  // Métodos de Paginación
  nextPage(): void {
    if (!this.isLastPage) {
      this.currentPage++;
      this.loadSuppliers();
    }
  }

  previousPage(): void {
    if (this.currentPage > 0) {
      this.currentPage--;
      this.loadSuppliers();
    }
  }

  goToPage(pageNumber: number): void {
    if (pageNumber >= 0 && pageNumber < this.totalPages) {
      this.currentPage = pageNumber;
      this.loadSuppliers();
    }
  }

  changePageSize(newSize: string | number): void {
    const size = typeof newSize === 'string' ? parseInt(newSize, 10) : newSize;
    this.pageSize = size;
    this.currentPage = 0;
    this.loadSuppliers();
  }

  get pageNumbers(): number[] {
    const pages: number[] = [];
    const maxVisiblePages = 5;

    if (this.totalPages <= maxVisiblePages) {
      for (let i = 0; i < this.totalPages; i++) {
        pages.push(i);
      }
    } else {
      const halfVisible = Math.floor(maxVisiblePages / 2);
      let start = this.currentPage - halfVisible;
      let end = this.currentPage + halfVisible;

      if (start < 0) {
        start = 0;
        end = maxVisiblePages - 1;
      } else if (end >= this.totalPages) {
        end = this.totalPages - 1;
        start = end - maxVisiblePages + 1;
      }

      if (start > 0) {
        pages.push(0);
        if (start > 1) {
          pages.push(-1);
        }
      }

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (end < this.totalPages - 1) {
        if (end < this.totalPages - 2) {
          pages.push(-1);
        }
        pages.push(this.totalPages - 1);
      }
    }

    return pages;
  }
}
