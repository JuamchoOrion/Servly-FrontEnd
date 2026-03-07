import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { Subject } from 'rxjs';
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
  styleUrls: ['./item-categories.scss']
})
export class ItemCategoriesComponent implements OnInit, OnDestroy {
  // Data
  categories: ItemCategoryResponse[] = [];

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
    private fb: FormBuilder
  ) {
    this.initializeForm();
  }

  ngOnInit(): void {
    this.checkUserPermissions();
    this.loadCategories();
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
  private loadCategories(): void {
    this.isLoading = true;
    this.itemCategoryService.getAllCategories()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (categories: ItemCategoryResponse[]) => {
          this.categories = categories;
          this.isLoading = false;
        },
        error: (error: any) => {
          this.errorMessage = 'Error al cargar categorías';
          console.error('Error loading categories:', error);
          this.isLoading = false;
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
  }

  /**
   * Cerrar formulario
   */
  closeForm(): void {
    this.isFormVisible = false;
    this.categoryForm.reset();
    this.selectedCategoryId = null;
    this.isEditMode = false;
  }

  /**
   * Enviar formulario (crear o actualizar)
   */
  submitForm(): void {
    if (this.categoryForm.invalid) {
      this.errorMessage = 'Por favor completa todos los campos requeridos';
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

    this.itemCategoryService.createCategory(request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (newCategory: ItemCategoryResponse) => {
          this.categories.push(newCategory);
          this.successMessage = 'Categoría creada exitosamente';
          this.closeForm();
          this.isLoading = false;
          setTimeout(() => this.successMessage = null, 3000);
        },
        error: (error: any) => {
          this.errorMessage = error.error?.message || 'Error al crear categoría';
          console.error('Error creating category:', error);
          this.isLoading = false;
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

    this.itemCategoryService.updateCategory(this.selectedCategoryId, request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updatedCategory: ItemCategoryResponse) => {
          const index = this.categories.findIndex(c => c.id === this.selectedCategoryId);
          if (index !== -1) {
            this.categories[index] = updatedCategory;
          }
          this.successMessage = 'Categoría actualizada exitosamente';
          this.closeForm();
          this.isLoading = false;
          setTimeout(() => this.successMessage = null, 3000);
        },
        error: (error: any) => {
          this.errorMessage = error.error?.message || 'Error al actualizar categoría';
          console.error('Error updating category:', error);
          this.isLoading = false;
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
          const index = this.categories.findIndex(c => c.id === category.id);
          if (index !== -1) {
            this.categories[index] = updatedCategory;
          }
          this.successMessage = `Categoría ${updatedCategory.active ? 'activada' : 'desactivada'}`;
          setTimeout(() => this.successMessage = null, 3000);
        },
        error: (error: any) => {
          this.errorMessage = error.error?.message || 'Error al cambiar estado de categoría';
          console.error('Error toggling category:', error);
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
          this.categories = this.categories.filter(c => c.id !== category.id);
          this.successMessage = 'Categoría eliminada exitosamente';
          setTimeout(() => this.successMessage = null, 3000);
        },
        error: (error: any) => {
          this.errorMessage = error.error?.message || 'Error al eliminar categoría';
          console.error('Error deleting category:', error);
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

