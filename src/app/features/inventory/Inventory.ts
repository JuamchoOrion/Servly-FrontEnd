import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormControl, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { HttpClient, HttpParams } from '@angular/common/http';

// DTOs - Coincidiendo con el backend
interface ItemStockDTO {
  itemStockId: number;
  name: string;
  description: string;
  category: string;
  quantity: number;
  unitOfMeasurement: string;
  supplierName: string;
  expirationDays: number | null;
  idealStock: number;
}

interface PaginatedInventoryResponse {
  content: ItemStockDTO[];
  pageNumber: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}

@Component({
  selector: 'app-inventory',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './Inventory.html',
  styleUrls: ['./inventory.scss']
})
export class InventoryComponent implements OnInit {
  // Lista plana de items del inventario
  inventoryItems: ItemStockDTO[] = [];
  isLoading = false;
  isSubmitting = false;

  // Paginación
  currentPage = 0;
  pageSize = 10;
  totalElements = 0;
  totalPages = 0;
  isLastPage = false;

  // Filtro de bajo stock
  showLowStockOnly = false;
  lowStockCount = 0;

  // Modal de ajuste de stock
  showStockModal = false;
  stockAction: 'increase' | 'decrease' | null = null;
  adjustingItemStockId: number | null = null;
  stockForm!: FormGroup;

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef,
    private http: HttpClient
  ) {
    this.initializeStockForm();
  }

  ngOnInit(): void {
    this.loadInventory();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Inicializa el formulario de ajuste de stock
   */
  private initializeStockForm(): void {
    this.stockForm = this.fb.group({
      quantity: [1, [Validators.required, Validators.min(1)]]
    });
  }

  /**
   * Carga el inventario desde el backend con paginación
   */
  private loadInventory(): void {
    this.isLoading = true;

    const params = new HttpParams()
      .set('page', this.currentPage.toString())
      .set('size', this.pageSize.toString())
      .set('sort', 'id,asc');

    this.http.get<PaginatedInventoryResponse>('/api/staff/inventory/paginated', { params })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.inventoryItems = response.content || [];
          this.currentPage = response.pageNumber;
          this.pageSize = response.pageSize;
          this.totalElements = response.totalElements;
          this.totalPages = response.totalPages;
          this.isLastPage = response.last;
          this.calculateLowStockCount();
          this.isLoading = false;
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('Error al cargar inventario:', error);
          this.inventoryItems = [];
          this.isLoading = false;
          this.cdr.detectChanges();
        }
      });
  }

  /**
   * Obtiene el control de cantidad del formulario de stock
   */
  get stockQuantityControl(): FormControl {
    return this.stockForm.get('quantity') as FormControl;
  }

  /**
   * Mensaje de error de cantidad del stock
   */
  getStockQuantityError(): string {
    if (this.stockQuantityControl.hasError('required')) {
      return 'La cantidad es requerida';
    }
    if (this.stockQuantityControl.hasError('min')) {
      return 'La cantidad mínima es 1';
    }
    return '';
  }

  /**
   * Getter para los items a mostrar (filtrados o todos)
   */
  get displayItems(): ItemStockDTO[] {
    if (!this.inventoryItems) return [];

    if (this.showLowStockOnly) {
      return this.lowStockItems;
    }

    return this.inventoryItems;
  }

  /**
   * Obtiene los items con stock bajo (<= 60% del stock ideal)
   */
  get lowStockItems(): ItemStockDTO[] {
    if (!this.inventoryItems) return [];
    return this.inventoryItems.filter(item => this.getStockLevel(item.quantity, item.idealStock) === 'low');
  }

  /**
   * Calcula la cantidad de items con stock bajo
   */
  private calculateLowStockCount(): void {
    if (!this.inventoryItems) {
      this.lowStockCount = 0;
      return;
    }
    this.lowStockCount = this.inventoryItems.filter(item => this.getStockLevel(item.quantity, item.idealStock) === 'low').length;
  }

  /**
   * Alterna el filtro de bajo stock
   */
  toggleLowStockFilter(): void {
    this.showLowStockOnly = !this.showLowStockOnly;
    this.cdr.detectChanges();
  }

  /**
   * Obtiene el item stock que se está ajustando
   */
  getAdjustingItemStock(): ItemStockDTO | undefined {
    return this.inventoryItems?.find(is => is.itemStockId === this.adjustingItemStockId);
  }

  /**
   * Obtiene el nivel de stock basado en el stock ideal
   * - Bajo: <= 60% del stock ideal
   * - Suficiente: > 60% y <= 120% del stock ideal
   * - Óptimo: > 120% del stock ideal
   */
  getStockLevel(quantity: number, idealStock: number): 'low' | 'medium' | 'high' {
    if (!idealStock || idealStock <= 0) return 'low';

    const percentage = (quantity / idealStock) * 100;

    if (percentage <= 60) return 'low';
    if (percentage <= 120) return 'medium';
    return 'high';
  }

  /**
   * Obtiene el texto del nivel de stock
   */
  getStockLevelText(quantity: number, idealStock: number): string {
    const level = this.getStockLevel(quantity, idealStock);

    if (level === 'low') return 'Stock Bajo';
    if (level === 'medium') return 'Stock Suficiente';
    return 'Stock Óptimo';
  }

  /**
   * Obtiene el porcentaje de stock para la barra visual (relativo al stock ideal)
   */
  getStockPercentage(quantity: number, idealStock: number): number {
    if (!idealStock || idealStock <= 0) return 0;
    return Math.min((quantity / idealStock) * 100, 100);
  }

  /**
   * Abre el modal para aumentar stock
   */
  openIncreaseStockModal(itemStock: ItemStockDTO): void {
    this.stockAction = 'increase';
    this.adjustingItemStockId = itemStock.itemStockId;
    this.stockForm.reset({ quantity: 1 });
    this.showStockModal = true;
  }

  /**
   * Abre el modal para disminuir stock
   */
  openDecreaseStockModal(itemStock: ItemStockDTO): void {
    this.stockAction = 'decrease';
    this.adjustingItemStockId = itemStock.itemStockId;
    this.stockForm.reset({ quantity: 1 });
    this.showStockModal = true;
  }

  /**
   * Cierra el modal de ajuste de stock
   */
  closeStockModal(): void {
    this.showStockModal = false;
    this.stockAction = null;
    this.adjustingItemStockId = null;
    this.stockForm.reset();
  }

  /**
   * Ajusta el stock (aumentar o disminuir)
   */
  onAdjustStockSubmit(): void {
    if (this.stockForm.invalid) {
      this.stockForm.markAllAsTouched();
      return;
    }

    try {
      this.isSubmitting = true;

      const quantity = this.stockForm.get('quantity')?.value;
      const itemStock = this.getAdjustingItemStock();

      if (!itemStock) {
        this.isSubmitting = false;
        return;
      }

      const itemStockId = itemStock.itemStockId;

      if (this.stockAction === 'increase') {
        // Llamar al endpoint de aumentar stock
        this.http.put(`/api/staff/inventory/${itemStockId}/increase`, null, {
          params: { quantity: quantity.toString() }
        })
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.loadInventory();
            this.closeStockModal();
            this.isSubmitting = false;
          },
          error: (error) => {
            console.error('Error al aumentar stock:', error);
            this.isSubmitting = false;
          }
        });
      } else if (this.stockAction === 'decrease') {
        // Llamar al endpoint de disminuir stock
        this.http.put(`/api/staff/inventory/${itemStockId}/decrease`, null, {
          params: { quantity: quantity.toString() }
        })
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.loadInventory();
            this.closeStockModal();
            this.isSubmitting = false;
          },
          error: (error) => {
            console.error('Error al disminuir stock:', error);
            this.isSubmitting = false;
          }
        });
      }
    } catch (error: any) {
      this.isSubmitting = false;
      console.error('Error al ajustar stock:', error);
    }
  }

  // Métodos de Paginación
  nextPage(): void {
    if (!this.isLastPage) {
      this.currentPage++;
      this.loadInventory();
    }
  }

  previousPage(): void {
    if (this.currentPage > 0) {
      this.currentPage--;
      this.loadInventory();
    }
  }

  goToPage(pageNumber: number): void {
    if (pageNumber >= 0 && pageNumber < this.totalPages) {
      this.currentPage = pageNumber;
      this.loadInventory();
    }
  }

  changePageSize(newSize: string | number): void {
    const size = typeof newSize === 'string' ? parseInt(newSize, 10) : newSize;
    this.pageSize = size;
    this.currentPage = 0;
    this.loadInventory();
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
