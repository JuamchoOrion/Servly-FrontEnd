import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormControl, Validators } from '@angular/forms';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

// DTOs
interface InventoryDTO {
  id: number;
  itemStockList: ItemStockDTO[];
}

interface ItemStockDTO {
  id: number;
  quantity: number;
  supplier: string;
  itemId: number;
  inventoryId: number;
}

interface ItemDTO {
  id: number;
  name: string;
  description: string;
  unitOfMeasurement: string;
  expirationDays: number | null;
  category?: string;
}

interface ItemStockCreateRequest {
  quantity: number;
  supplier: string;
  itemId: number;
}

interface ItemCreateRequest {
  name: string;
  description: string;
  unitOfMeasurement: string;
  expirationDays: number | null;
}

@Component({
  selector: 'app-inventory',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, RouterLinkActive],
  templateUrl: './Inventory.html',
  styleUrls: ['./inventory.scss']
})
export class InventoryComponent implements OnInit {
  inventory: InventoryDTO | null = null;
  items: ItemDTO[] = [];
  isLoading = false;
  isSubmitting = false;
  showModal = false;
  isEditing = false;
  formError: string | null = null;
  editingItemStockId: number | null = null;

  // Filtro de bajo stock
  showLowStockOnly = false;
  lowStockCount = 0;

  // Dropdown de navegación
  dropdownOpen: string | null = null;

  itemForm!: FormGroup;

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef
  ) {
    this.initializeForm();
  }

  ngOnInit(): void {
    this.loadInventory();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Inicializa el formulario
   */
  private initializeForm(): void {
    this.itemForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      description: ['', [Validators.maxLength(500)]],
      category: ['', []],
      unitOfMeasurement: ['', [Validators.required]],
      expirationDays: [null, [Validators.min(0), Validators.max(3650)]],
      quantity: [null, [Validators.required, Validators.min(0)]],
      supplier: ['', [Validators.required, Validators.maxLength(200)]]
    });
  }

  /**
   * Carga el inventario (simulado - reemplazar con servicio real)
   */
  private loadInventory(): void {
    this.isLoading = true;

    // TODO: Reemplazar con llamada al servicio real
    // this.inventoryService.getInventory().pipe(takeUntil(this.destroy$)).subscribe(...)

    setTimeout(() => {
      // Datos simulados para desarrollo
      this.items = [
        { id: 1, name: 'Harina de Trigo', description: 'Harina refinada para panadería', unitOfMeasurement: 'kg', expirationDays: 180, category: 'granos' },
        { id: 2, name: 'Azúcar Blanca', description: 'Azúcar refinada', unitOfMeasurement: 'kg', expirationDays: 730, category: 'granos' },
        { id: 3, name: 'Leche Entera', description: 'Leche fresca pasteurizada', unitOfMeasurement: 'l', expirationDays: 7, category: 'lacteos' },
        { id: 4, name: 'Huevos', description: 'Huevos frescos de gallina', unitOfMeasurement: 'unit', expirationDays: 21, category: 'lacteos' },
        { id: 5, name: 'Mantequilla', description: 'Mantequilla sin sal', unitOfMeasurement: 'g', expirationDays: 90, category: 'lacteos' }
      ];

      this.inventory = {
        id: 1,
        itemStockList: [
          { id: 1, quantity: 50, supplier: 'Distribuidora Central', itemId: 1, inventoryId: 1 },
          { id: 2, quantity: 3, supplier: 'Distribuidora Central', itemId: 2, inventoryId: 1 },
          { id: 3, quantity: 20, supplier: 'Lácteos del Valle', itemId: 3, inventoryId: 1 },
          { id: 4, quantity: 8, supplier: 'Granja El Sol', itemId: 4, inventoryId: 1 },
          { id: 5, quantity: 15, supplier: 'Lácteos del Valle', itemId: 5, inventoryId: 1 }
        ]
      };

      this.calculateLowStockCount();
      this.isLoading = false;
      this.cdr.detectChanges();
    }, 1000);
  }

  /**
   * Obtiene el control del nombre
   */
  get nameControl(): FormControl {
    return this.itemForm.get('name') as FormControl;
  }

  /**
   * Obtiene el control de descripción
   */
  get descriptionControl(): FormControl {
    return this.itemForm.get('description') as FormControl;
  }

  /**
   * Obtiene el control de unidad de medida
   */
  get unitControl(): FormControl {
    return this.itemForm.get('unitOfMeasurement') as FormControl;
  }

  /**
   * Obtiene el control de días de expiración
   */
  get expirationControl(): FormControl {
    return this.itemForm.get('expirationDays') as FormControl;
  }

  /**
   * Obtiene el control de cantidad
   */
  get quantityControl(): FormControl {
    return this.itemForm.get('quantity') as FormControl;
  }

  /**
   * Obtiene el control de proveedor
   */
  get supplierControl(): FormControl {
    return this.itemForm.get('supplier') as FormControl;
  }

  /**
   * Getter para los items a mostrar (filtrados o todos)
   */
  get displayItems(): ItemStockDTO[] {
    if (!this.inventory?.itemStockList) return [];

    if (this.showLowStockOnly) {
      return this.lowStockItems;
    }

    return this.inventory.itemStockList;
  }

  /**
   * Obtiene los items con stock bajo (<= 5)
   */
  get lowStockItems(): ItemStockDTO[] {
    if (!this.inventory?.itemStockList) return [];
    return this.inventory.itemStockList.filter(item => item.quantity <= 5);
  }

  /**
   * Calcula la cantidad de items con stock bajo
   */
  private calculateLowStockCount(): void {
    if (!this.inventory?.itemStockList) {
      this.lowStockCount = 0;
      return;
    }
    this.lowStockCount = this.inventory.itemStockList.filter(item => item.quantity <= 5).length;
  }

  /**
   * Alterna el filtro de bajo stock
   */
  toggleLowStockFilter(): void {
    this.showLowStockOnly = !this.showLowStockOnly;
    this.cdr.detectChanges();
  }

  /**
   * Alterna el dropdown de navegación
   */
  toggleDropdown(menu: string): void {
    this.dropdownOpen = this.dropdownOpen === menu ? null : menu;
  }

  /**
   * Obtiene el nombre del item por ID
   */
  getItemName(itemId: number): string {
    const item = this.items.find(i => i.id === itemId);
    return item?.name || 'Item no encontrado';
  }

  /**
   * Obtiene la descripción del item por ID
   */
  getItemDescription(itemId: number): string {
    const item = this.items.find(i => i.id === itemId);
    return item?.description || '';
  }

  /**
   * Obtiene la unidad de medida del item por ID
   */
  getItemUnit(itemId: number): string {
    const item = this.items.find(i => i.id === itemId);
    return item?.unitOfMeasurement || '';
  }

  /**
   * Obtiene los días de expiración del item por ID
   */
  getItemExpirationDays(itemId: number): number | null {
    const item = this.items.find(i => i.id === itemId);
    return item?.expirationDays || null;
  }

  /**
   * Obtiene la categoría del item por ID
   */
  getItemCategory(itemId: number): string {
    const item = this.items.find(i => i.id === itemId);
    return item?.category || '';
  }

  /**
   * Obtiene el nombre formateado del proveedor
   */
  getSupplierName(supplier: string): string {
    return supplier || 'N/A';
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
      return 'Máximo 100 caracteres';
    }
    return '';
  }

  /**
   * Mensaje de error de unidad
   */
  getUnitError(): string {
    if (this.unitControl.hasError('required')) {
      return 'La unidad de medida es requerida';
    }
    return '';
  }

  /**
   * Mensaje de error de cantidad
   */
  getQuantityError(): string {
    if (this.quantityControl.hasError('required')) {
      return 'La cantidad es requerida';
    }
    if (this.quantityControl.hasError('min')) {
      return 'La cantidad no puede ser negativa';
    }
    return '';
  }

  /**
   * Mensaje de error de expiración
   */
  getExpirationError(): string {
    if (this.expirationControl.hasError('min')) {
      return 'Los días no pueden ser negativos';
    }
    if (this.expirationControl.hasError('max')) {
      return 'Máximo 3650 días';
    }
    return '';
  }

  /**
   * Mensaje de error de proveedor
   */
  getSupplierError(): string {
    if (this.supplierControl.hasError('required')) {
      return 'El proveedor es requerido';
    }
    return '';
  }

  /**
   * Abre el modal para crear nuevo item
   */
  openCreateModal(): void {
    this.isEditing = false;
    this.editingItemStockId = null;
    this.formError = null;
    this.itemForm.reset();
    this.showModal = true;
  }

  /**
   * Abre el modal para editar item
   */
  editItem(itemStock: ItemStockDTO): void {
    this.isEditing = true;
    this.editingItemStockId = itemStock.id;
    this.formError = null;

    const item = this.items.find(i => i.id === itemStock.itemId);

    this.itemForm.patchValue({
      name: item?.name || '',
      description: item?.description || '',
      unitOfMeasurement: item?.unitOfMeasurement || '',
      expirationDays: item?.expirationDays || null,
      quantity: itemStock.quantity,
      supplier: itemStock.supplier
    });

    this.showModal = true;
  }

  /**
   * Cierra el modal
   */
  closeModal(): void {
    this.showModal = false;
    this.isEditing = false;
    this.editingItemStockId = null;
    this.formError = null;
    this.itemForm.reset();
  }

  /**
   * Abre el modal para nueva categoría
   */
  openCategoryModal(): void {
    console.log('Abrir modal de nueva categoría');
    // TODO: Implementar modal de categoría
  }

  /**
   * Elimina un item del inventario
   */
  deleteItem(itemStock: ItemStockDTO): void {
    const itemName = this.getItemName(itemStock.itemId);

    if (confirm(`¿Estás seguro de eliminar "${itemName}" del inventario?`)) {
      // TODO: Implementar eliminación con servicio real
      // this.inventoryService.deleteItemStock(itemStock.id).pipe(takeUntil(this.destroy$)).subscribe(...)

      if (this.inventory) {
        this.inventory.itemStockList = this.inventory.itemStockList.filter(
          is => is.id !== itemStock.id
        );
      }
    }
  }

  /**
   * Envía el formulario (crear o actualizar)
   */
  onSubmit(): void {
    if (this.itemForm.invalid) {
      Object.keys(this.itemForm.controls).forEach(key => {
        this.itemForm.get(key)?.markAsTouched();
      });
      return;
    }

    try {
      this.isSubmitting = true;
      this.formError = null;

      const formValue = this.itemForm.value;

      if (this.isEditing && this.editingItemStockId) {
        // Actualizar item existente
        // TODO: Implementar actualización con servicio real
        // this.inventoryService.updateItemStock(this.editingItemStockId, request).pipe(...)

        console.log('Actualizando item:', formValue);

        setTimeout(() => {
          this.isSubmitting = false;
          this.closeModal();
          // Recargar inventario
          this.loadInventory();
        }, 500);

      } else {
        // Crear nuevo item
        // TODO: Implementar creación con servicio real
        // this.inventoryService.createItem(itemRequest).pipe(...)
        // this.inventoryService.createItemStock(stockRequest).pipe(...)

        console.log('Creando nuevo item:', formValue);

        setTimeout(() => {
          this.isSubmitting = false;
          this.closeModal();
          // Recargar inventario
          this.loadInventory();
        }, 500);
      }
    } catch (error: any) {
      this.isSubmitting = false;
      this.formError = error.message || 'Error al procesar la solicitud';
      console.error('Error:', error);
    }
  }
}
