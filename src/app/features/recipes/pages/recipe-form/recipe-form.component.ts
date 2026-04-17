import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ProductService } from '../../../../core/services/product.service';
import { Recipe, CreateRecipeRequest, ItemDetail } from '../../../../core/dtos/product.dto';
import { I18nService } from '../../../../core/services/i18n.service';
import { ItemService } from '../../../../core/services/item.service';

interface Item {
  id: number;
  name: string;
  active: boolean;
}

@Component({
  selector: 'app-recipe-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './recipe-form.component.html',
  styleUrls: ['./recipe-form.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RecipeFormComponent implements OnInit, OnDestroy {
  recipeForm: FormGroup;
  recipe: Recipe | null = null;
  items: Item[] = [];
  isCombo = false;

  isLoading = false;
  isSaving = false;
  isEditMode = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;

  private recipeId: number | null = null;
  private destroy$ = new Subject<void>();

  constructor(
    private productService: ProductService,
    private itemService: ItemService,
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder,
    public i18n: I18nService,
    private cdr: ChangeDetectorRef
  ) {
    this.recipeForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      quantity: [1, [Validators.required, Validators.min(1)]],
      description: [''],
      itemDetails: this.fb.array([])
    });
  }

  ngOnInit(): void {
    // Primero cargar items
    this.itemService.getAllItems()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (items: any[]) => {
          this.items = items;
          console.log('📦 Items cargados:', this.items.length, 'items');
          this.cdr.markForCheck();

          // Después verificar si es modo edición
          this.checkIfEditMode();
        },
        error: (error) => {
          console.error('❌ Error cargando items:', error);
          this.checkIfEditMode();
          this.cdr.markForCheck();
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get itemDetailsArray(): FormArray {
    return this.recipeForm.get('itemDetails') as FormArray;
  }


  /**
   * Verifica si es modo edición
   */
  private checkIfEditMode(): void {
    this.route.params
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        if (params['id']) {
          this.recipeId = parseInt(params['id'], 10);
          this.isEditMode = true;
          this.loadRecipe(this.recipeId);
        } else {
          // Modo crear - agregar un item por defecto
          if (this.itemDetailsArray.length === 0) {
            this.addItemDetail();
          }
          this.cdr.markForCheck();
        }
      });
  }

  /**
   * Carga los datos de la receta en modo edición
   */
  private loadRecipe(id: number): void {
    this.isLoading = true;
    this.cdr.markForCheck();

    this.productService.getRecipeById(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (recipe: Recipe) => {
          this.recipe = recipe;
          this.recipeForm.patchValue({
            name: recipe.name,
            quantity: recipe.quantity || 1,
            description: recipe.description || ''
          });

          // Llenar itemDetails
          const itemDetailsArray = this.itemDetailsArray;
          itemDetailsArray.clear();

          // Usar itemDetailList (de la API) o itemDetails (del DTO)
          const items = (recipe as any).itemDetailList || recipe.itemDetails || [];

          console.log('🔍 Items a cargar:', items.length, 'items');

          items.forEach((item: any) => {
            // Extraer el ID del item - puede venir como itemId directo o como item.id (anidado)
            const itemId = item.itemId || (item.item?.id);
            const quantity = item.quantity || 0;

            console.log('📦 Item cargado:', { itemId, quantity, annotation: item.annotation });

            if (itemId) {
              itemDetailsArray.push(this.fb.group({
                itemId: [itemId, Validators.required],
                quantity: [quantity, [Validators.required, Validators.min(0.01)]],
                annotation: [item.annotation || ''],
                isOptional: [item.isOptional || false]
              }));
            }
          });

          console.log('✅ ItemDetailsArray poblado con', itemDetailsArray.length, 'items');
          this.isLoading = false;
          this.cdr.markForCheck();
        },
        error: (error: any) => {
          this.errorMessage = this.i18n.translate('recipes.errors.loadFailed');
          this.isLoading = false;
          this.cdr.markForCheck();
        }
      });
  }

  /**
   * Obtiene el nombre del item por su ID
   */
  getItemName(itemId: number): string {
    const item = this.items.find(i => i.id === itemId);
    return item?.name || 'Sin nombre';
  }

  /**
   * Obtiene el control de un item detail
   */
  getItemControl(index: number): any {
    return this.itemDetailsArray.at(index);
  }

  /**
   * Obtiene el nombre del item del control
   */
  getItemNameFromControl(index: number): string {
    const itemId = this.itemDetailsArray.at(index).get('itemId')?.value;
    return this.getItemName(itemId);
  }

  /**
   * Agrega un nuevo item a la receta
   */
  addItemDetail(): void {
    const itemDetailsArray = this.itemDetailsArray;
    itemDetailsArray.push(this.fb.group({
      itemId: [null, Validators.required],
      quantity: [null, [Validators.required, Validators.min(0.01)]],
      annotation: [''],
      isOptional: [false]
    }));
    this.cdr.markForCheck();
  }

  /**
   * Remueve un item de la receta
   */
  removeItemDetail(index: number): void {
    const itemDetailsArray = this.itemDetailsArray;
    itemDetailsArray.removeAt(index);
    this.cdr.markForCheck();
  }

  /**
   * Guarda la receta
   */
  saveRecipe(): void {
    if (this.recipeForm.invalid) {
      this.errorMessage = this.i18n.translate('recipes.errors.invalidForm');
      this.cdr.markForCheck();
      return;
    }

    // Validar que hay al menos un item
    if (this.itemDetailsArray.length === 0) {
      this.errorMessage = this.i18n.translate('recipes.errors.noItems');
      this.cdr.markForCheck();
      return;
    }

    this.isSaving = true;
    this.errorMessage = null;
    this.successMessage = null;
    this.cdr.markForCheck();

    const formData = this.recipeForm.value;

    const request: CreateRecipeRequest = {
      name: formData.name.trim(),
      quantity: parseInt(formData.quantity.toString()),
      description: formData.description?.trim() || undefined,
      itemDetails: formData.itemDetails
    };

    const operation$ = this.isEditMode && this.recipeId
      ? this.productService.updateRecipe(this.recipeId, request)
      : this.productService.createRecipe(request);

    operation$
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (recipe: Recipe) => {
          const msgKey = this.isEditMode ? 'recipes.updateSuccess' : 'recipes.createSuccess';
          this.successMessage = this.i18n.translate(msgKey);
          this.isSaving = false;
          this.cdr.markForCheck();
          setTimeout(() => {
            this.router.navigate(['/recipes']);
          }, 1500);
        },
        error: (error: any) => {
          this.errorMessage = this.getErrorMessage(error);
          this.isSaving = false;
          this.cdr.markForCheck();
        }
      });
  }

  /**
   * Cancela y vuelve a la lista
   */
  cancelForm(): void {
    this.router.navigate(['/recipes']);
  }

  /**
   * Obtiene mensaje de error según el código HTTP
   */
  private getErrorMessage(error: any): string {
    if (error.status === 400) {
      return this.i18n.translate('recipes.errors.invalidData');
    } else if (error.status === 404) {
      return this.i18n.translate('recipes.errors.notFound');
    } else {
      return this.i18n.translate('recipes.errors.saveFailed');
    }
  }

  /**
   * Cierra mensajes
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
   * Obtiene error de validación
   */
  getFieldError(fieldName: string): string | null {
    const field = this.recipeForm.get(fieldName);
    if (!field || !field.errors || !field.touched) {
      return null;
    }

    if (field.errors['required']) {
      return this.i18n.translate(`recipes.validation.${fieldName}Required`);
    }
    if (field.errors['minlength']) {
      const minLength = field.errors['minlength'].requiredLength;
      return this.i18n.translate(`recipes.validation.${fieldName}Min`, { min: minLength });
    }
    if (field.errors['min']) {
      return this.i18n.translate('recipes.validation.quantityMin');
    }

    return null;
  }

  /**
   * Verifica si un campo es inválido y tocado
   */
  isFieldInvalid(fieldName: string): boolean {
    const field = this.recipeForm.get(fieldName);
    return !!(field && field.invalid && field.touched);
  }
}

