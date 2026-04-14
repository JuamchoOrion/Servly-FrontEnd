import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, BehaviorSubject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ProductService } from '../../../../core/services/product.service';
import { Product, Category, PaginatedProductResponse } from '../../../../core/dtos/product.dto';
import { AuthService } from '../../../../core/services/auth.service';
import { I18nService } from '../../../../core/services/i18n.service';

@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './product-list.component.html',
  styleUrls: ['./product-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProductListComponent implements OnInit, OnDestroy {
  // Data
  private productsSubject = new BehaviorSubject<Product[]>([]);
  products$ = this.productsSubject.asObservable();

  get products(): Product[] {
    return this.productsSubject.value;
  }

  set products(value: Product[]) {
    this.productsSubject.next(value);
    this.cdr.markForCheck();
  }

  categories: Category[] = [];

  // Filters
  filterForm: FormGroup;
  selectedCategoryId: number | null = null;
  searchText = '';

  // Pagination
  currentPage = 0;
  pageSize = 10;
  totalElements = 0;
  totalPages = 0;
  isLastPage = false;

  // State
  isLoading = false;
  isAdmin = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;

  private destroy$ = new Subject<void>();

  constructor(
    private productService: ProductService,
    private authService: AuthService,
    public i18n: I18nService,
    private router: Router,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef
  ) {
    this.filterForm = this.fb.group({
      categoryId: [null]
    });
  }

  ngOnInit(): void {
    this.loadCategories();
    this.loadProducts();
    this.checkAdminRole();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Carga categorías para el filtro
   */
  private loadCategories(): void {
    this.productService.categories$
      .pipe(takeUntil(this.destroy$))
      .subscribe((categories: Category[]) => {
        this.categories = categories;
        this.cdr.markForCheck();
      });
  }

  /**
   * Carga la lista de productos
   */
  loadProducts(): void {
    this.isLoading = true;
    this.errorMessage = null;
    this.cdr.markForCheck();

    this.productService.getProducts(this.currentPage, this.pageSize)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: PaginatedProductResponse) => {
          this.products = response.content;
          this.totalElements = response.totalElements;
          this.totalPages = response.totalPages;
          this.isLastPage = response.isLast;
          this.isLoading = false;
          this.cdr.markForCheck();
        },
        error: (error: any) => {
          this.errorMessage = this.i18n.translate('products.errors.loadFailed');
          this.isLoading = false;
          this.cdr.markForCheck();
        }
      });
  }

  /**
   * Verifica si el usuario es administrador
   */
  private checkAdminRole(): void {
    const currentUser = this.authService.getCurrentUser();
    this.isAdmin = currentUser?.roles?.includes('ADMIN') ?? false;
    this.cdr.markForCheck();
  }

  /**
   * Filtra por categoría
   */
  filterByCategory(): void {
    this.selectedCategoryId = this.filterForm.get('categoryId')?.value;
    this.currentPage = 0;
    this.loadProducts();
  }

  /**
   * Limpia los filtros
   */
  clearFilters(): void {
    this.filterForm.reset();
    this.selectedCategoryId = null;
    this.searchText = '';
    this.currentPage = 0;
    this.loadProducts();
  }

  /**
   * Busca productos por nombre (lado cliente)
   */
  searchProducts(): void {
    const filtered = this.products.filter(p =>
      p.name.toLowerCase().includes(this.searchText.toLowerCase())
    );
    this.productsSubject.next(filtered);
  }

  /**
   * Navega a crear nuevo producto
   */
  createProduct(): void {
    this.router.navigate(['/products/new']);
  }

  /**
   * Navega a editar un producto
   */
  editProduct(id: number): void {
    this.router.navigate(['/products', id, 'edit']);
  }

  /**
   * Elimina un producto con confirmación
   */
  deleteProduct(product: Product): void {
    if (confirm(this.i18n.translate('products.confirmDelete', { name: product.name }))) {
      this.isLoading = true;
      this.cdr.markForCheck();

      this.productService.deleteProduct(product.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.successMessage = this.i18n.translate('products.deletedSuccess');
            this.loadProducts();
            this.cdr.markForCheck();
          },
          error: (error: any) => {
            this.errorMessage = this.i18n.translate('products.errors.deleteFailed');
            this.isLoading = false;
            this.cdr.markForCheck();
          }
        });
    }
  }

  /**
   * Paginación: siguiente página
   */
  nextPage(): void {
    if (!this.isLastPage) {
      this.currentPage++;
      this.loadProducts();
    }
  }

  /**
   * Paginación: página anterior
   */
  previousPage(): void {
    if (this.currentPage > 0) {
      this.currentPage--;
      this.loadProducts();
    }
  }

  /**
   * Cierra mensajes de error/éxito
   */
  closeMessage(type: 'error' | 'success'): void {
    if (type === 'error') {
      this.errorMessage = null;
    } else {
      this.successMessage = null;
    }
    this.cdr.markForCheck();
  }

  /**
   * Obtiene el nombre de la categoría
   */
  getCategoryName(product: Product): string {
    return product.category || '-';
  }

  /**
   * Obtiene la URL de imagen o una imagen por defecto
   */
  getImageUrl(product: Product): string {
    return product.image || 'assets/images/no-image.png';
  }

  /**
   * Obtiene el texto de estado (Activo/Inactivo)
   */
  getActiveText(active: boolean | undefined): string {
    return (active ?? true) ? this.i18n.translate('common.active') : this.i18n.translate('common.inactive');
  }
}

