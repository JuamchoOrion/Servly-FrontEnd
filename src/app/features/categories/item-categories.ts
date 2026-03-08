import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { Subject, BehaviorSubject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ItemCategoryService } from '../../core/services/item-category.service';
import { AuthService } from '../../core/services/auth.service';
import { ItemCategoryResponse, CreateItemCategoryRequest, UpdateItemCategoryRequest } from '../../core/dtos/category.dto';
import { I18nService } from '../../core/services/i18n.service';

@Component({
  selector: 'app-item-categories',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, RouterLinkActive],
  templateUrl: './item-categories.html',
  styleUrls: ['./item-categories.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ItemCategoriesComponent implements OnInit, OnDestroy {
  // Data - usando BehaviorSubject para mejor reactividad
  private categoriesSubject = new BehaviorSubject<ItemCategoryResponse[]>([]);
  categories$ = this.categoriesSubject.asObservable();

  get categories(): ItemCategoryResponse[] {
    return this.categoriesSubject.value;
  }

  set categories(value: ItemCategoryResponse[]) {
    this.categoriesSubject.next(value);
    this.cdr.markForCheck();
  }

  // State
  isLoading = false;
  isFormVisible = false;
  isEditMode = false;
  selectedCategoryId: number | null = null;
  successMessage: string | null = null;
  errorMessage: string | null = null;

  // Form
  categoryForm!: FormGroup;

  // Permissions
  isAdmin = false;
  isStorekeeper = false;

  // Cleanup
  private destroy$ = new Subject<void>();

  constructor(
    private itemCategoryService: ItemCategoryService,
    private authService: AuthService,
    public i18n: I18nService,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) {
    this.initializeForm();
  }

  ngOnInit(): void {
    this.checkUserPermissions();
    this.loadCategories();

    // Suscribirse a cambios de categorías para actualizar automáticamente
    this.categories$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.cdr.markForCheck();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Verificar permisos del usuario
   */
  private checkUserPermissions(): void {
    const user = this.authService.getCurrentUser();
    if (user) {
      this.isAdmin = user.roles.includes('ADMIN');
      this.isStorekeeper = user.roles.includes('STOREKEEPER');
    }
  }

  /**
   * Inicializar formulario reactivo
   */
  private initializeForm(): void {
    this.categoryForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(1)]],
      description: ['', [Validators.required, Validators.minLength(1)]]
    });
  }

  /**
   * Cargar todas las categorías
   */
  loadCategories(): void {
    this.isLoading = true;
    this.errorMessage = null;
    this.cdr.markForCheck();

    this.itemCategoryService.getAllCategories()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (categories: ItemCategoryResponse[]) => {
          this.ngZone.run(() => {
            this.categories = [...(categories || [])];
            this.isLoading = false;
            this.cdr.markForCheck();
          });
        },
        error: (error: any) => {
          this.ngZone.run(() => {
            this.categories = [];
            this.errorMessage = 'Error al cargar categorías. Por favor, intenta nuevamente.';
            console.error('Error loading categories:', error);
            this.isLoading = false;
            this.cdr.markForCheck();
          });
        }
      });
  }

  /**
   * Abrir formulario para crear nueva categoría
   */
  openCreateForm(): void {
    this.isEditMode = false;
    this.selectedCategoryId = null;
    this.categoryForm.reset();
    this.isFormVisible = true;
    this.errorMessage = null;
    this.cdr.markForCheck();
  }

  /**
   * Abrir formulario para editar categoría
   */
  openEditForm(category: ItemCategoryResponse): void {
    if (!this.canModify()) return;

    this.isEditMode = true;
    this.selectedCategoryId = category.id;
    this.categoryForm.patchValue({
      name: category.name,
      description: category.description
    });
    this.isFormVisible = true;
    this.errorMessage = null;
    this.cdr.markForCheck();
  }

  /**
   * Cerrar formulario
   */
  closeForm(): void {
    this.isFormVisible = false;
    this.categoryForm.reset();
    this.selectedCategoryId = null;
    this.isEditMode = false;
    this.cdr.markForCheck();
  }

  /**
   * Enviar formulario (crear o actualizar)
   */
  submitForm(): void {
    if (this.categoryForm.invalid) {
      this.errorMessage = 'Por favor completa todos los campos requeridos';
      this.cdr.markForCheck();
      return;
    }

    if (this.isEditMode && this.selectedCategoryId) {
      this.updateCategory();
    } else {
      this.createCategory();
    }
  }

  /**
   * Crear nueva categoría
   */
  private createCategory(): void {
    const request: CreateItemCategoryRequest = this.categoryForm.value;
    this.isLoading = true;
    this.cdr.markForCheck();

    this.itemCategoryService.createCategory(request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (newCategory: ItemCategoryResponse) => {
          this.ngZone.run(() => {
            this.categories = [...this.categories, newCategory];
            this.successMessage = 'Categoría creada exitosamente';
            this.closeForm();
            this.isLoading = false;
            this.cdr.markForCheck();
            setTimeout(() => {
              this.successMessage = null;
              this.cdr.markForCheck();
            }, 3000);
          });
        },
        error: (error: any) => {
          this.ngZone.run(() => {
            this.errorMessage = error.error?.message || 'Error al crear categoría';
            console.error('Error creating category:', error);
            this.isLoading = false;
            this.cdr.markForCheck();
          });
        }
      });
  }

  /**
   * Actualizar categoría existente
   */
  private updateCategory(): void {
    if (!this.selectedCategoryId) return;

    const request: UpdateItemCategoryRequest = this.categoryForm.value;
    this.isLoading = true;
    this.cdr.markForCheck();

    this.itemCategoryService.updateCategory(this.selectedCategoryId, request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updatedCategory: ItemCategoryResponse) => {
          this.ngZone.run(() => {
            this.categories = this.categories.map(c => c.id === this.selectedCategoryId ? updatedCategory : c);
            this.successMessage = 'Categoría actualizada exitosamente';
            this.closeForm();
            this.isLoading = false;
            this.cdr.markForCheck();
            setTimeout(() => {
              this.successMessage = null;
              this.cdr.markForCheck();
            }, 3000);
          });
        },
        error: (error: any) => {
          this.ngZone.run(() => {
            this.errorMessage = error.error?.message || 'Error al actualizar categoría';
            console.error('Error updating category:', error);
            this.isLoading = false;
            this.cdr.markForCheck();
          });
        }
      });
  }

  /**
   * Toggle (activar/desactivar) categoría
   */
  toggleCategory(category: ItemCategoryResponse): void {
    if (!this.canModify()) return;

    this.itemCategoryService.toggleCategory(category.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updatedCategory: ItemCategoryResponse) => {
          this.ngZone.run(() => {
            this.categories = this.categories.map(c => c.id === category.id ? updatedCategory : c);
            this.successMessage = `Categoría ${updatedCategory.active ? 'activada' : 'desactivada'}`;
            this.cdr.markForCheck();
            setTimeout(() => {
              this.successMessage = null;
              this.cdr.markForCheck();
            }, 3000);
          });
        },
        error: (error: any) => {
          this.ngZone.run(() => {
            this.errorMessage = error.error?.message || 'Error al cambiar estado de categoría';
            console.error('Error toggling category:', error);
            this.cdr.markForCheck();
          });
        }
      });
  }

  /**
   * Eliminar categoría con confirmación
   */
  deleteCategory(category: ItemCategoryResponse): void {
    if (!this.canModify()) return;

    const confirmed = confirm(`¿Estás seguro de que deseas eliminar la categoría "${category.name}"?`);
    if (!confirmed) return;

    this.itemCategoryService.deleteCategory(category.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.ngZone.run(() => {
            this.categories = this.categories.filter(c => c.id !== category.id);
            this.successMessage = 'Categoría eliminada exitosamente';
            this.cdr.markForCheck();
            setTimeout(() => {
              this.successMessage = null;
              this.cdr.markForCheck();
            }, 3000);
          });
        },
        error: (error: any) => {
          this.ngZone.run(() => {
            this.errorMessage = error.error?.message || 'Error al eliminar categoría';
            console.error('Error deleting category:', error);
            this.cdr.markForCheck();
          });
        }
      });
  }

  /**
   * Verificar si el usuario puede modificar categorías
   */
  private canModify(): boolean {
    return this.isAdmin || this.isStorekeeper;
  }

  /**
   * Verificar si puede ver opciones de edición
   */
  canEdit(): boolean {
    return this.canModify();
  }

  /**
   * Obtener control del formulario
   */
  get nameControl() {
    return this.categoryForm.get('name');
  }

  get descriptionControl() {
    return this.categoryForm.get('description');
  }
}

