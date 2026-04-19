import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ProductService } from '../../../../core/services/product.service';
import { Category } from '../../../../core/dtos/product.dto';
import { AuthService } from '../../../../core/services/auth.service';
import { I18nService } from '../../../../core/services/i18n.service';

@Component({
  selector: 'app-category-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './category-list.component.html',
  styleUrls: ['./category-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CategoryListComponent implements OnInit, OnDestroy {
  categories: Category[] = [];
  isLoading = true;
  isAdmin = false;
  searchText = '';
  errorMessage: string | null = null;
  successMessage: string | null = null;

  // Paginación
  currentPage = 1;
  itemsPerPage = 10;
  Math = Math; // Exponer Math al template

  private destroy$ = new Subject<void>();

  constructor(
    private productService: ProductService,
    private authService: AuthService,
    public i18n: I18nService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.checkAdminRole();
    this.loadCategories();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private checkAdminRole(): void {
    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        this.isAdmin = user?.roles?.includes('ADMIN') ?? false;
        this.cdr.markForCheck();
      });
  }

  private loadCategories(): void {
    this.isLoading = true;
    this.productService.getCategories()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (categories: Category[]) => {
          this.categories = categories;
          this.currentPage = 1;
          this.isLoading = false;
          this.cdr.markForCheck();
        },
        error: (error: any) => {
          this.errorMessage = this.i18n.translate('categories.errors.loadFailed');
          this.isLoading = false;
          this.cdr.markForCheck();
        }
      });
  }

  createCategory(): void {
    this.router.navigate(['/product-categories/new']);
  }

  editCategory(id: number): void {
    this.router.navigate([`/product-categories/${id}/edit`]);
  }

  deleteCategory(category: Category): void {
    if (confirm(`¿Estás seguro de que deseas eliminar la categoría "${category.name}"?`)) {
      this.productService.deleteCategory(category.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.successMessage = `Categoría "${category.name}" eliminada correctamente`;
            this.loadCategories();
            this.cdr.markForCheck();
          },
          error: (error: any) => {
            this.errorMessage = 'Error al eliminar la categoría';
            this.cdr.markForCheck();
          }
        });
    }
  }

  getFilteredCategories(): Category[] {
    return this.categories.filter(c =>
      c.name.toLowerCase().includes(this.searchText.toLowerCase()) ||
      c.description.toLowerCase().includes(this.searchText.toLowerCase())
    );
  }

  getPaginatedCategories(): Category[] {
    const filtered = this.getFilteredCategories();
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    return filtered.slice(startIndex, endIndex);
  }

  getTotalPages(): number {
    return Math.ceil(this.getFilteredCategories().length / this.itemsPerPage);
  }

  goToPage(page: number): void {
    const maxPage = this.getTotalPages();
    if (page >= 1 && page <= maxPage) {
      this.currentPage = page;
      this.cdr.markForCheck();
    }
  }

  nextPage(): void {
    if (this.currentPage < this.getTotalPages()) {
      this.currentPage++;
      this.cdr.markForCheck();
    }
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.cdr.markForCheck();
    }
  }

  getActiveText(active: boolean | undefined): string {
    return (active ?? true) ? 'Activa' : 'Inactiva';
  }

  getFormattedDate(date: string | undefined): string {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('es-ES');
  }

  clearFilters(): void {
    this.searchText = '';
    this.currentPage = 1;
    this.cdr.markForCheck();
  }
}
