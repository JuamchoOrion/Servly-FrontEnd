import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject, BehaviorSubject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ItemService, CreateItemRequest, UpdateItemRequest, ItemResponse, PaginatedItemResponse } from '../../core/services/item.service';
import { ItemCategoryService } from '../../core/services/item-category.service';
import { AuthService } from '../../core/services/auth.service';
import { I18nService } from '../../core/services/i18n.service';
import { ItemCategoryResponse } from '../../core/dtos/category.dto';

@Component({
  selector: 'app-items',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './items.html',
  styleUrls: ['./items.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ItemsComponent implements OnInit, OnDestroy {
  // Data
  private itemsSubject = new BehaviorSubject<ItemResponse[]>([]);
  items$ = this.itemsSubject.asObservable();

  get items(): ItemResponse[] {
    return this.itemsSubject.value;
  }

  set items(value: ItemResponse[]) {
    this.itemsSubject.next(value);
    this.cdr.markForCheck();
  }

  categories: ItemCategoryResponse[] = [];

  // Pagination
  currentPage = 0;
  pageSize = 10;
  totalElements = 0;
  totalPages = 0;
  isLastPage = false;

  // State
  isLoading = false;
  isFormVisible = false;
  isEditMode = false;
  selectedItemId: number | null = null;
  successMessage: string | null = null;
  errorMessage: string | null = null;

  // Form
  itemForm!: FormGroup;

  // Permissions
  isAdmin = false;
  isStorekeeper = false;

  // Cleanup
  private destroy$ = new Subject<void>();

  constructor(
    private itemService: ItemService,
    private categoryService: ItemCategoryService,
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
    this.loadItems();

    this.items$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.cdr.markForCheck();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private checkUserPermissions(): void {
    const user = this.authService.getCurrentUser();
    if (user) {
      this.isAdmin = user.roles.includes('ADMIN');
      this.isStorekeeper = user.roles.includes('STOREKEEPER');
    }
  }

  private initializeForm(): void {
    this.itemForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      description: ['', [Validators.required, Validators.minLength(5)]],
      unitOfMeasurement: ['', [Validators.required]],
      expirationDays: [0, [Validators.required, Validators.min(1)]],
      category: ['', [Validators.required]],
      idealStock: [0, [Validators.required, Validators.min(1)]]
    });
  }

  loadItems(): void {
    this.isLoading = true;
    this.errorMessage = null;
    this.cdr.markForCheck();

    this.itemService.getItemsPaginated(this.currentPage, this.pageSize)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: PaginatedItemResponse) => {
          this.ngZone.run(() => {
            this.items = [...(response.content || [])];
            this.currentPage = response.pageNumber;
            this.pageSize = response.pageSize;
            this.totalElements = response.totalElements;
            this.totalPages = response.totalPages;
            this.isLastPage = response.isLast;
            console.log('Items paginados cargados:', this.items);
            this.isLoading = false;
            this.cdr.markForCheck();
          });
        },
        error: (error: any) => {
          this.ngZone.run(() => {
            this.items = [];
            this.errorMessage = 'Error al cargar items. Por favor, intenta nuevamente.';
            console.error('Error loading items:', error);
            this.isLoading = false;
            this.cdr.markForCheck();
          });
        }
      });
  }

  private loadCategories(): void {
    this.categoryService.getAllCategories()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (categories) => {
          this.ngZone.run(() => {
            this.categories = categories.filter(cat => cat.active);
            console.log('Categorías cargadas:', this.categories);
            this.cdr.markForCheck();
          });
        },
        error: (error) => {
          this.ngZone.run(() => {
            console.error('Error loading categories:', error);
            this.categories = [];
            this.cdr.markForCheck();
          });
        }
      });
  }

  openCreateForm(): void {
    this.isEditMode = false;
    this.selectedItemId = null;
    this.itemForm.reset();
    this.isFormVisible = true;
    this.errorMessage = null;
    this.cdr.markForCheck();
  }

  openEditForm(item: ItemResponse): void {
    if (!this.canModify()) return;

    this.isEditMode = true;
    this.selectedItemId = item.id;
    this.itemForm.patchValue({
      name: item.name,
      description: item.description,
      unitOfMeasurement: item.unitOfMeasurement,
      expirationDays: item.expirationDays,
      category: item.category,
      idealStock: item.idealStock
    });
    this.isFormVisible = true;
    this.errorMessage = null;
    this.cdr.markForCheck();
  }

  closeForm(): void {
    this.isFormVisible = false;
    this.itemForm.reset();
    this.selectedItemId = null;
    this.isEditMode = false;
    this.cdr.markForCheck();
  }

  submitForm(): void {
    if (this.itemForm.invalid) {
      this.errorMessage = 'Por favor completa todos los campos requeridos';
      this.cdr.markForCheck();
      return;
    }

    if (this.isEditMode && this.selectedItemId) {
      this.updateItem();
    } else {
      this.createItem();
    }
  }

  private createItem(): void {
    const request: CreateItemRequest = this.itemForm.value;
    this.isLoading = true;
    this.cdr.markForCheck();

    this.itemService.createItem(request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (newItem: ItemResponse) => {
          this.ngZone.run(() => {
            this.items = [...this.items, newItem];
            this.successMessage = 'Item creado exitosamente';
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
            this.errorMessage = error.error?.message || 'Error al crear item';
            console.error('Error creating item:', error);
            this.isLoading = false;
            this.cdr.markForCheck();
          });
        }
      });
  }

  private updateItem(): void {
    if (!this.selectedItemId) return;

    const request: UpdateItemRequest = this.itemForm.value;
    this.isLoading = true;
    this.cdr.markForCheck();

    this.itemService.updateItem(this.selectedItemId, request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updatedItem: ItemResponse) => {
          this.ngZone.run(() => {
            this.items = this.items.map(i => i.id === this.selectedItemId ? updatedItem : i);
            this.successMessage = 'Item actualizado exitosamente';
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
            this.errorMessage = error.error?.message || 'Error al actualizar item';
            console.error('Error updating item:', error);
            this.isLoading = false;
            this.cdr.markForCheck();
          });
        }
      });
  }

  deleteItem(item: ItemResponse): void {
    if (!this.canModify()) return;

    const confirmed = confirm(`¿Estás seguro de que deseas eliminar el item "${item.name}"?`);
    if (!confirmed) return;

    this.itemService.deleteItem(item.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.ngZone.run(() => {
            this.items = this.items.filter(i => i.id !== item.id);
            this.successMessage = 'Item eliminado exitosamente';
            this.cdr.markForCheck();
            setTimeout(() => {
              this.successMessage = null;
              this.cdr.markForCheck();
            }, 3000);
          });
        },
        error: (error: any) => {
          this.ngZone.run(() => {
            this.errorMessage = error.error?.message || 'Error al eliminar item';
            console.error('Error deleting item:', error);
            this.cdr.markForCheck();
          });
        }
      });
  }

  canEdit(): boolean {
    return this.isAdmin || this.isStorekeeper;
  }

  canModify(): boolean {
    return this.canEdit();
  }

  getCategoryName(categoryId: string): string {
    if (!categoryId) return 'Sin categoría';

    // Intentar encontrar por ID como string o número
    const category = this.categories.find(cat =>
      cat.id.toString() === categoryId ||
      cat.id === parseInt(categoryId, 10)
    );

    return category ? category.name : `Categoría ID: ${categoryId}`;
  }


  // Método para refrescar datos
  refreshData(): void {
    this.currentPage = 0;
    this.loadCategories();
    this.loadItems();
  }

  // Métodos de Paginación
  nextPage(): void {
    if (!this.isLastPage && this.currentPage < this.totalPages - 1) {
      this.currentPage++;
      this.loadItems();
    }
  }

  previousPage(): void {
    if (this.currentPage > 0) {
      this.currentPage--;
      this.loadItems();
    }
  }

  goToPage(pageNumber: number): void {
    if (pageNumber >= 0 && pageNumber < this.totalPages) {
      this.currentPage = pageNumber;
      this.loadItems();
    }
  }

  changePageSize(newSize: string | number): void {
    const size = typeof newSize === 'string' ? parseInt(newSize, 10) : newSize;
    this.pageSize = size;
    this.currentPage = 0; // Resetear a primera página
    this.loadItems();
  }

  get pageNumbers(): number[] {
    const pages: number[] = [];
    const maxVisiblePages = 5; // Mostrar máximo 5 páginas

    if (this.totalPages <= maxVisiblePages) {
      // Si hay pocas páginas, mostrar todas
      for (let i = 0; i < this.totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Si hay muchas páginas, mostrar un rango alrededor de la actual
      const halfVisible = Math.floor(maxVisiblePages / 2);
      let start = this.currentPage - halfVisible;
      let end = this.currentPage + halfVisible;

      // Ajustar los límites
      if (start < 0) {
        start = 0;
        end = maxVisiblePages - 1;
      } else if (end >= this.totalPages) {
        end = this.totalPages - 1;
        start = end - maxVisiblePages + 1;
      }

      // Agregar primera página si no está visible
      if (start > 0) {
        pages.push(0);
        if (start > 1) {
          pages.push(-1); // -1 indica "..."
        }
      }

      // Agregar páginas del rango
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      // Agregar última página si no está visible
      if (end < this.totalPages - 1) {
        if (end < this.totalPages - 2) {
          pages.push(-1); // -1 indica "..."
        }
        pages.push(this.totalPages - 1);
      }
    }

    return pages;
  }
}

