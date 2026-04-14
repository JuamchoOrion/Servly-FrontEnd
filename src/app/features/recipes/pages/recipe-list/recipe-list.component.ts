import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ProductService } from '../../../../core/services/product.service';
import { Recipe } from '../../../../core/dtos/product.dto';
import { I18nService } from '../../../../core/services/i18n.service';

@Component({
  selector: 'app-recipe-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './recipe-list.component.html',
  styleUrls: ['./recipe-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RecipeListComponent implements OnInit, OnDestroy {
  recipes: Recipe[] = [];
  isLoading = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;
  currentPage = 0;
  pageSize = 10;

  private destroy$ = new Subject<void>();

  constructor(
    private productService: ProductService,
    public i18n: I18nService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadRecipes();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Carga todas las recetas
   */
  private loadRecipes(): void {
    this.isLoading = true;
    this.errorMessage = null;
    this.cdr.markForCheck();

    this.productService.recipes$
      .pipe(takeUntil(this.destroy$))
      .subscribe((recipes: Recipe[]) => {
        this.recipes = recipes;
        this.isLoading = false;
        this.cdr.markForCheck();
      });

    // Si el cache está vacío, cargar del servidor
    if (this.recipes.length === 0) {
      this.productService.getRecipes()
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (recipes: Recipe[]) => {
            this.recipes = recipes;
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
  }

  /**
   * Elimina una receta
   */
  deleteRecipe(recipe: Recipe): void {
    const message = `¿Estás seguro de que deseas eliminar la receta "${recipe.name}"?`;
    if (!confirm(message)) {
      return;
    }

    this.productService.deleteRecipe(recipe.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.successMessage = this.i18n.translate('recipes.deletedSuccess');
          this.recipes = this.recipes.filter(r => r.id !== recipe.id);
          this.cdr.markForCheck();
          setTimeout(() => {
            this.successMessage = null;
            this.cdr.markForCheck();
          }, 3000);
        },
        error: (error: any) => {
          this.errorMessage = this.i18n.translate('recipes.errors.deleteFailed');
          this.cdr.markForCheck();
        }
      });
  }

  /**
   * Recarga la lista
   */
  refresh(): void {
    this.loadRecipes();
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
}

