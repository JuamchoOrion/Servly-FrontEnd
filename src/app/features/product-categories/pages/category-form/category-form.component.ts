import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ProductService } from '../../../../core/services/product.service';
import { Category } from '../../../../core/dtos/product.dto';
import { I18nService } from '../../../../core/services/i18n.service';

@Component({
  selector: 'app-category-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './category-form.component.html',
  styleUrls: ['./category-form.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CategoryFormComponent implements OnInit, OnDestroy {
  categoryForm: FormGroup;
  isLoading = false;
  isSaving = false;
  isEditMode = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;

  private categoryId: number | null = null;
  private destroy$ = new Subject<void>();

  constructor(
    private productService: ProductService,
    private fb: FormBuilder,
    public i18n: I18nService,
    private route: ActivatedRoute,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {
    this.categoryForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      description: ['', [Validators.required, Validators.minLength(10)]],
      active: [true]
    });
  }

  ngOnInit(): void {
    this.checkIfEditMode();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private checkIfEditMode(): void {
    this.route.params
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        if (params['id']) {
          this.isEditMode = true;
          this.categoryId = parseInt(params['id'], 10);
          this.loadCategory(this.categoryId);
        }
      });
  }

  private loadCategory(id: number): void {
    this.isLoading = true;
    this.cdr.markForCheck();

    this.productService.getCategoryById(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (category: Category) => {
          this.categoryForm.patchValue({
            name: category.name,
            description: category.description,
            active: category.active ?? true
          });
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

  saveCategory(): void {
    if (this.categoryForm.invalid) {
      this.errorMessage = this.i18n.translate('categories.errors.invalidForm');
      this.cdr.markForCheck();
      return;
    }

    this.isSaving = true;
    this.errorMessage = null;
    this.successMessage = null;
    this.cdr.markForCheck();

    const formValue = this.categoryForm.value;

    const operation$ = this.isEditMode && this.categoryId
      ? this.productService.updateCategory(this.categoryId, formValue)
      : this.productService.createCategory(formValue);

    operation$
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (category: Category) => {
          const msgKey = this.isEditMode ? 'categories.updateSuccess' : 'categories.createSuccess';
          this.successMessage = this.i18n.translate(msgKey);
          this.isSaving = false;
          this.cdr.markForCheck();
          setTimeout(() => {
            this.router.navigate(['/product-categories']);
          }, 1500);
        },
        error: (error: any) => {
          this.errorMessage = this.getErrorMessage(error);
          this.isSaving = false;
          this.cdr.markForCheck();
        }
      });
  }

  cancel(): void {
    this.router.navigate(['/product-categories']);
  }

  private getErrorMessage(error: any): string {
    if (error?.status === 409) {
      return this.i18n.translate('categories.errors.duplicate');
    }
    if (error?.status === 400) {
      return this.i18n.translate('categories.errors.invalidForm');
    }
    return this.i18n.translate('categories.errors.saveFailed');
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.categoryForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getFieldError(fieldName: string): string | null {
    const field = this.categoryForm.get(fieldName);
    if (!field || !field.errors) return null;

    if (field.errors['required']) {
      return `${fieldName} ${this.i18n.translate('common.isRequired')}`;
    }
    if (field.errors['minlength']) {
      const min = field.errors['minlength'].requiredLength;
      return `${fieldName} ${this.i18n.translate('common.minLength')} ${min}`;
    }

    return null;
  }
}

