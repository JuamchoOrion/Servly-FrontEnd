import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormControl, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';

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
  stockPercent: number;
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
   * Carga el inventario desde el backend
   */
  private loadInventory(): void {
    this.isLoading = true;

    this.http.get<ItemStockDTO[]>('/api/staff/inventory')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (items) => {
          this.inventoryItems = items;
          this.calculateLowStockCount();
          this.isLoading = false;
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('Error al cargar inventario:', error);
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
   * Obtiene los items con stock bajo (<= 5)
   */
  get lowStockItems(): ItemStockDTO[] {
    if (!this.inventoryItems) return [];
    return this.inventoryItems.filter(item => item.quantity <= 5);
  }

  /**
   * Calcula la cantidad de items con stock bajo
   */
  private calculateLowStockCount(): void {
    if (!this.inventoryItems) {
      this.lowStockCount = 0;
      return;
    }
    this.lowStockCount = this.inventoryItems.filter(item => item.quantity <= 5).length;
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
   * Obtiene el porcentaje de stock para la barra visual
   */
  getStockPercentage(quantity: number): number {
    const maxStock = 100;
    return Math.min((quantity / maxStock) * 100, 100);
  }

  /**
   * Obtiene el texto del nivel de stock
   */
  getStockLevelText(quantity: number): string {
    if (quantity <= 5) return 'Stock Bajo';
    if (quantity <= 15) return 'Stock Medio';
    return 'Stock Óptimo';
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
}
