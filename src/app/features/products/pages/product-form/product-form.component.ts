import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, Observable } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ProductService } from '../../../../core/services/product.service';
import { Product, Category, Recipe, ProductFormData, CreateProductRequest } from '../../../../core/dtos/product.dto';
import { I18nService } from '../../../../core/services/i18n.service';

@Component({
  selector: 'app-product-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './product-form.component.html',
  styleUrls: ['./product-form.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProductFormComponent implements OnInit, OnDestroy {
  // Form
  productForm: FormGroup;

  // Data
  categories: Category[] = [];
  recipes: Recipe[] = [];
  product: Product | null = null;

  // State
  isLoading = false;
  isSaving = false;
  isEditMode = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;

  // Image handling
  imageFile: File | null = null;
  imagePreviewUrl: string | null = null;

  private productId: number | null = null;
  private destroy$ = new Subject<void>();

  constructor(
    private productService: ProductService,
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder,
    public i18n: I18nService,
    private cdr: ChangeDetectorRef
  ) {
    this.productForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      description: ['', [Validators.required, Validators.minLength(10)]],
      price: ['', [Validators.required, Validators.min(0.01), Validators.pattern(/^\d+(\.\d{1,2})?$/)]],
      categoryId: ['', Validators.required],
      recipeId: [''],
      active: [true],
      image: ['']
    });
  }

  ngOnInit(): void {
    this.loadCategoriesAndRecipes();
    this.checkIfEditMode();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Carga categorías y recetas
   */
  private loadCategoriesAndRecipes(): void {
    this.productService.categories$
      .pipe(takeUntil(this.destroy$))
      .subscribe((categories: Category[]) => {
        this.categories = categories;
        this.cdr.markForCheck();
      });

    this.productService.recipes$
      .pipe(takeUntil(this.destroy$))
      .subscribe((recipes: Recipe[]) => {
        this.recipes = recipes;
        this.cdr.markForCheck();
      });
  }

  /**
   * Verifica si es modo edición
   */
  private checkIfEditMode(): void {
    this.route.params
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        if (params['id']) {
          this.productId = parseInt(params['id'], 10);
          this.isEditMode = true;
          this.loadProduct(this.productId);
        }
        this.cdr.markForCheck();
      });
  }

  /**
   * Carga los datos del producto en modo edición
   */
  private loadProduct(id: number): void {
    this.isLoading = true;
    this.cdr.markForCheck();

    this.productService.getProductById(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (product: Product) => {
          this.product = product;
          this.productForm.patchValue({
            name: product.name,
            description: product.description,
            price: product.price || product.basePrice,
            categoryId: product.categoryId || '',
            recipeId: product.recipeId || '',
            active: product.active ?? true,
            image: product.imageUrl || product.image || ''
          });

          // Mostrar imagen actual si existe
          if (product.imageUrl || product.image) {
            this.imagePreviewUrl = product.imageUrl || product.image || null;
          }

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
   * Guarda el producto (crear o actualizar)
   */
  saveProduct(): void {
    if (this.productForm.invalid) {
      this.errorMessage = this.i18n.translate('products.errors.invalidForm');
      this.cdr.markForCheck();
      return;
    }

    this.isSaving = true;
    this.errorMessage = null;
    this.successMessage = null;
    this.cdr.markForCheck();

    const formData = this.productForm.value as any;

    const productData = {
      name: formData.name.trim(),
      description: formData.description.trim(),
      price: parseFloat(formData.price.toString()),
      categoryId: parseInt(formData.categoryId.toString()),
      recipeId: formData.recipeId ? parseInt(formData.recipeId.toString()) : undefined,
      active: formData.active
    };

    // Determinar si usar crear con imagen o crear sin imagen
    let operation$: Observable<Product>;

    if (this.isEditMode && this.productId) {
      // Modo edición
      operation$ = this.imageFile
        ? this.productService.updateProductWithImage(this.productId, productData, this.imageFile)
        : this.productService.updateProduct(this.productId, {
            ...productData,
            productCategoryId: productData.categoryId
          });
    } else {
      // Modo creación - siempre usar createProductWithImage para soportar imagen
      operation$ = this.productService.createProductWithImage(productData, this.imageFile || undefined);
    }

    operation$
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (product: Product) => {
          const msgKey = this.isEditMode ? 'products.updateSuccess' : 'products.createSuccess';
          this.successMessage = this.i18n.translate(msgKey);
          this.isSaving = false;
          this.cdr.markForCheck();
          setTimeout(() => {
            this.router.navigate(['/products']);
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
   * Cancela la edición y vuelve a la lista
   */
  cancel(): void {
    this.router.navigate(['/products']);
  }

  /**
   * Obtiene el mensaje de error según el código HTTP
   */
  private getErrorMessage(error: any): string {
    if (error.status === 400) {
      return this.i18n.translate('products.errors.invalidData');
    } else if (error.status === 409) {
      return this.i18n.translate('products.errors.duplicate');
    } else if (error.status === 404) {
      return this.i18n.translate('products.errors.notFound');
    } else {
      return this.i18n.translate('products.errors.saveFailed');
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
   * Obtiene error de validación para un campo
   */
   getFieldError(fieldName: string): string | null {
     const field = this.productForm.get(fieldName);
     if (!field || !field.errors || !field.touched) {
       return null;
     }

     if (field.errors['required']) {
       return this.i18n.translate(`products.validation.${fieldName}Required`);
     }
     if (field.errors['minlength']) {
       const minLength = field.errors['minlength'].requiredLength;
       return this.i18n.translate(`products.validation.${fieldName}Min`, { min: minLength });
     }
     if (field.errors['min']) {
       return this.i18n.translate('products.validation.priceMin');
     }
     if (field.errors['pattern']) {
       return this.i18n.translate('products.validation.priceInvalid');
     }

     return null;
   }

  /**
   * Verifica si un campo es inválido y tocado
   */
  isFieldInvalid(fieldName: string): boolean {
    const field = this.productForm.get(fieldName);
    return !!(field && field.invalid && field.touched);
  }

  /**
   * Elimina espacios en blanco de un campo
   */
  trimField(fieldName: string): void {
    const control = this.productForm.get(fieldName);
    if (control && typeof control.value === 'string') {
      control.setValue(control.value.trim());
    }
  }

  /**
   * Maneja la selección de imagen
   */
  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = input.files;

    if (files && files.length > 0) {
      const file = files[0];

      // Validar tipo de archivo
      if (!file.type.startsWith('image/')) {
        this.errorMessage = this.i18n.translate('products.errors.invalidImageType');
        this.cdr.markForCheck();
        return;
      }

      // Validar tamaño (máximo 10MB)
      const maxSizeInBytes = 10 * 1024 * 1024;
      if (file.size > maxSizeInBytes) {
        this.errorMessage = this.i18n.translate('products.errors.imageTooLarge');
        this.cdr.markForCheck();
        return;
      }

      this.imageFile = file;
      this.errorMessage = null;

      // Crear vista previa
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.imagePreviewUrl = e.target.result;
        this.cdr.markForCheck();
      };
      reader.readAsDataURL(file);
    }
  }

  /**
   * Elimina la imagen seleccionada
   */
  removeImage(): void {
    this.imageFile = null;
    this.imagePreviewUrl = null;
    this.productForm.patchValue({ image: '' });
    this.cdr.markForCheck();
  }

  /**
   * Obtiene la URL de imagen para mostrar (actual o vista previa)
   */
  getImageUrl(): string | null {
    if (this.imagePreviewUrl) {
      return this.imagePreviewUrl;
    }
    if (this.product && this.product.imageUrl) {
      return this.product.imageUrl;
    }
    if (this.product && this.product.image) {
      return this.product.image;
    }
    return null;
  }
}

