import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormControl, Validators } from '@angular/forms';
import { Subject, forkJoin } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { HttpClient, HttpParams } from '@angular/common/http';
import { StockBatch, StockBatchStatus, StockBatchService, CreateBatchRequest } from '../../core/services/stock-batch.service';
import { SupplierService, SupplierDTO } from '../../core/services/supplier.service';

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

  // === Lotes (StockBatch) ===
  expandedItemId: number | null = null;
  itemBatches: Map<number, StockBatch[]> = new Map();
  loadingBatches: Set<number> = new Set();

  // Alertas globales de lotes
  closeToExpireBatches: StockBatch[] = [];
  expiredBatches: StockBatch[] = [];
  showBatchAlerts = true;
  showExpiredSection = false;  // Mostrar/ocultar sección de lotes expirados
  deletingBatchId: number | null = null;  // ID del lote que se está eliminando

  // Modal para crear nuevo lote
  showCreateBatchModal = false;
  creatingBatchForItemId: number | null = null;
  batchForm!: FormGroup;
  suppliers: SupplierDTO[] = [];

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef,
    private http: HttpClient,
    private stockBatchService: StockBatchService,
    private supplierService: SupplierService
  ) {
    this.initializeBatchForm();
  }

  ngOnInit(): void {
    this.loadInventory();
    this.loadBatchAlerts();
    this.loadSuppliers();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }


  /**
   * Inicializa el formulario para crear nuevo lote
   * expiryDate es OPCIONAL - si no se proporciona, el backend lo calcula automáticamente
   */
  private initializeBatchForm(): void {
    this.batchForm = this.fb.group({
      quantity: [1, [Validators.required, Validators.min(1)]],
      supplierId: [null, [Validators.required]],
      batchNumber: ['', [Validators.required, Validators.minLength(3)]],
      expiryDate: [null]  // OPCIONAL - el backend calcula: hoy + item.expirationDays
    });
  }

  /**
   * Carga la lista de proveedores
   */
  private loadSuppliers(): void {
    this.supplierService.getAll()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (suppliers) => {
          this.suppliers = suppliers || [];
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('Error al cargar proveedores:', error);
        }
      });
  }

  /**
   * Carga las alertas de lotes (próximos a expirar y expirados)
   */
  private loadBatchAlerts(): void {
    forkJoin({
      closeToExpire: this.stockBatchService.getCloseToExpire(),
      expired: this.stockBatchService.getExpired()
    }).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ({ closeToExpire, expired }) => {
          this.closeToExpireBatches = closeToExpire || [];
          this.expiredBatches = expired || [];
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('Error al cargar alertas de lotes:', error);
        }
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

  // === NUEVO: Métodos para Lotes ===

  /**
   * Expande/colapsa los lotes de un item
   */
  toggleItemBatches(itemStockId: number): void {
    if (this.expandedItemId === itemStockId) {
      this.expandedItemId = null;
    } else {
      this.expandedItemId = itemStockId;
      this.loadItemBatches(itemStockId);
    }
    this.cdr.detectChanges();
  }

  /**
   * Carga los lotes de un ItemStock específico
   */
  private loadItemBatches(itemStockId: number): void {
    if (this.itemBatches.has(itemStockId) && !this.loadingBatches.has(itemStockId)) {
      return; // Ya cargados
    }

    this.loadingBatches.add(itemStockId);
    this.cdr.detectChanges();

    this.stockBatchService.getByItemStock(itemStockId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (batches) => {
          this.itemBatches.set(itemStockId, batches || []);
          this.loadingBatches.delete(itemStockId);
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error(`Error al cargar lotes del item ${itemStockId}:`, error);
          this.itemBatches.set(itemStockId, []);
          this.loadingBatches.delete(itemStockId);
          this.cdr.detectChanges();
        }
      });
  }

  /**
   * Obtiene los lotes de un item (si están cargados)
   */
  getBatches(itemStockId: number): StockBatch[] {
    return this.itemBatches.get(itemStockId) || [];
  }

  /**
   * Verifica si un item tiene sus lotes expandidos
   */
  isExpanded(itemStockId: number): boolean {
    return this.expandedItemId === itemStockId;
  }

  /**
   * Verifica si los lotes de un item están cargando
   */
  isBatchesLoading(itemStockId: number): boolean {
    return this.loadingBatches.has(itemStockId);
  }

  /**
   * Obtiene la clase CSS según el estado del lote
   */
  getBatchStatusClass(status: StockBatchStatus): string {
    switch (status) {
      case 'EXPIRADO': return 'batch-expired';
      case 'PROXIMO_A_EXPIRAR': return 'batch-warning';
      case 'AGOTADO': return 'batch-depleted';
      default: return 'batch-healthy';
    }
  }

  /**
   * Obtiene el texto del estado del lote
   */
  getBatchStatusText(batch: StockBatch): string {
    return this.stockBatchService.getStatusText(batch.status);
  }

  /**
   * Formatea una fecha ISO a formato legible
   */
  formatDate(dateString: string): string {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }

  /**
   * Obtiene el total de alertas de lotes
   */
  get totalBatchAlerts(): number {
    return this.closeToExpireBatches.length + this.expiredBatches.length;
  }

  /**
   * Cierra las alertas de lotes
   */
  closeBatchAlerts(): void {
    this.showBatchAlerts = false;
    this.cdr.detectChanges();
  }

  /**
   * Alterna la visibilidad de la sección de lotes expirados
   */
  toggleExpiredSection(): void {
    this.showExpiredSection = !this.showExpiredSection;
    this.cdr.detectChanges();
  }

  /**
   * Recarga los lotes expirados desde el backend
   */
  refreshExpiredBatches(): void {
    this.stockBatchService.getExpired()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (batches) => {
          this.expiredBatches = batches || [];
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('Error al recargar lotes expirados:', error);
        }
      });
  }

  /**
   * Elimina un lote expirado
   * DELETE /api/stock-batch/{id}
   */
  deleteExpiredBatch(batch: StockBatch): void {
    if (this.deletingBatchId) return; // Ya hay una eliminación en proceso

    if (!confirm(`¿Estás seguro de eliminar el lote "${batch.batchNumber}"?\n\nEsta acción no se puede deshacer.`)) {
      return;
    }

    this.deletingBatchId = batch.id;
    this.cdr.detectChanges();

    this.stockBatchService.deleteBatch(batch.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          // Eliminar el lote de la lista local
          this.expiredBatches = this.expiredBatches.filter(b => b.id !== batch.id);
          this.deletingBatchId = null;

          // Recargar el inventario para actualizar las cantidades
          this.loadInventory();
          this.cdr.detectChanges();

          console.log(`Lote ${batch.batchNumber} eliminado exitosamente`);
        },
        error: (error) => {
          console.error('Error al eliminar el lote:', error);
          this.deletingBatchId = null;
          this.cdr.detectChanges();
          alert('Error al eliminar el lote. Por favor, intenta nuevamente.');
        }
      });
  }

  // === MÉTODOS PARA CREAR NUEVO LOTE ===

  /**
   * Abre el modal para crear un nuevo lote
   */
  openCreateBatchModal(itemStock: ItemStockDTO): void {
    this.creatingBatchForItemId = itemStock.itemStockId;
    // Generar número de lote sugerido
    const suggestedBatchNumber = this.generateBatchNumber(itemStock.name);
    this.batchForm.reset({
      quantity: 1,
      supplierId: null,
      batchNumber: suggestedBatchNumber,
      expiryDate: null
    });
    this.showCreateBatchModal = true;
    this.cdr.detectChanges();
  }

  /**
   * Genera un número de lote sugerido
   */
  private generateBatchNumber(itemName: string): string {
    const prefix = itemName.substring(0, 3).toUpperCase().replace(/\s/g, '');
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `LOTE-${prefix}-${year}${month}${day}-${random}`;
  }

  /**
   * Cierra el modal de crear lote
   */
  closeCreateBatchModal(): void {
    this.showCreateBatchModal = false;
    this.creatingBatchForItemId = null;
    this.batchForm.reset();
    this.cdr.detectChanges();
  }

  /**
   * Obtiene el ItemStock para el cual se está creando un lote
   */
  getCreatingBatchItemStock(): ItemStockDTO | undefined {
    return this.inventoryItems?.find(is => is.itemStockId === this.creatingBatchForItemId);
  }

  /**
   * Getters para los controles del formulario de lotes
   */
  get batchQuantityControl(): FormControl {
    return this.batchForm.get('quantity') as FormControl;
  }

  get batchSupplierControl(): FormControl {
    return this.batchForm.get('supplierId') as FormControl;
  }

  get batchNumberControl(): FormControl {
    return this.batchForm.get('batchNumber') as FormControl;
  }

  get batchExpiryDateControl(): FormControl {
    return this.batchForm.get('expiryDate') as FormControl;
  }

  /**
   * Obtiene el mensaje de error para cantidad del lote
   */
  getBatchQuantityError(): string {
    if (this.batchQuantityControl.hasError('required')) {
      return 'La cantidad es requerida';
    }
    if (this.batchQuantityControl.hasError('min')) {
      return 'La cantidad mínima es 1';
    }
    return '';
  }

  /**
   * Obtiene el mensaje de error para proveedor
   */
  getBatchSupplierError(): string {
    if (this.batchSupplierControl.hasError('required')) {
      return 'El proveedor es requerido';
    }
    return '';
  }

  /**
   * Obtiene el mensaje de error para número de lote
   */
  getBatchNumberError(): string {
    if (this.batchNumberControl.hasError('required')) {
      return 'El número de lote es requerido';
    }
    if (this.batchNumberControl.hasError('minlength')) {
      return 'Mínimo 3 caracteres';
    }
    return '';
  }

  /**
   * Obtiene el mensaje de error para fecha de expiración
   */
  getBatchExpiryError(): string {
    if (this.batchExpiryDateControl.hasError('required')) {
      return 'La fecha de vencimiento es requerida';
    }
    return '';
  }

  /**
   * Obtiene la fecha mínima para expiración (hoy)
   */
  getMinExpiryDate(): string {
    return new Date().toISOString().split('T')[0];
  }

  /**
   * Envía el formulario para crear un nuevo lote
   * expiryDate es opcional - si no se proporciona, el backend lo calcula automáticamente
   */
  onCreateBatchSubmit(): void {
    if (this.batchForm.invalid || !this.creatingBatchForItemId) {
      this.batchForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;

    // Construir request - expiryDate es opcional
    const request: CreateBatchRequest = {
      itemStockId: this.creatingBatchForItemId,
      quantity: this.batchForm.get('quantity')?.value,
      supplierId: this.batchForm.get('supplierId')?.value,
      batchNumber: this.batchForm.get('batchNumber')?.value
    };

    // Solo incluir expiryDate si el usuario lo proporcionó
    const expiryDate = this.batchForm.get('expiryDate')?.value;
    if (expiryDate) {
      request.expiryDate = expiryDate;
    }

    this.stockBatchService.createBatch(request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (newBatch) => {
          console.log('Lote creado:', newBatch);
          // Recargar inventario y lotes
          this.loadInventory();
          this.loadBatchAlerts();
          // Si el item estaba expandido, recargar sus lotes
          if (this.expandedItemId === this.creatingBatchForItemId && this.creatingBatchForItemId !== null) {
            this.itemBatches.delete(this.creatingBatchForItemId);
            this.loadItemBatches(this.creatingBatchForItemId);
          }
          this.closeCreateBatchModal();
          this.isSubmitting = false;
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('Error al crear lote:', error);
          this.isSubmitting = false;
          this.cdr.detectChanges();
        }
      });
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
