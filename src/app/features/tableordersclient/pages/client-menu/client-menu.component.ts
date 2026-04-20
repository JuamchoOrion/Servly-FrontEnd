import { Component, OnInit, OnDestroy, NgZone, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ClientService } from '../../../../core/services/client.service';
import { MenuItem } from '../../../../core/dtos/client.dto';
import { I18nService } from '../../../../core/services/i18n.service';
import { AccessibilityService, type AccessibilitySettings } from '../../../../shared/services/accessibility.service';
import { AccessibilityMenuComponent } from '../../../../shared/components/accessibility-menu/accessibility-menu.component';
import { ClientNavbarComponent } from '../../../../shared/components/client-navbar/client-navbar.component';
import { FooterComponent } from '../../../../shared/components/footer/footer.component';

@Component({
  selector: 'app-client-menu',
  standalone: true,
  imports: [CommonModule, AccessibilityMenuComponent, ClientNavbarComponent, FooterComponent],
  templateUrl: './client-menu.component.html',
  styleUrls: ['./client-menu.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ClientMenuComponent implements OnInit, OnDestroy {
   menuItems: MenuItem[] = [];
   filteredItems: MenuItem[] = [];
   paginatedItems: MenuItem[] = [];
   categories: any[] = [];
   selectedCategory: number | null = null;
   isLoading = true;
   errorMessage: string | null = null;
   tableNumber: number | null = null;
   cart: Map<number, { item: MenuItem; quantity: number }> = new Map();

   // Pagination properties
   currentPage = 1;
   itemsPerPage = 9; // 3x3 grid
   totalPages = 1;
   pageNumbers: number[] = [];

   // Accessibility
   accessibilitySettings: AccessibilitySettings = {
     darkMode: false,
     fontSize: 'medium',
     highContrast: false,
     reduceMotion: false
   };


   private destroy$ = new Subject<void>();

   constructor(
     private clientService: ClientService,
     private router: Router,
     public i18n: I18nService,
     private ngZone: NgZone,
     private cdr: ChangeDetectorRef,
     private accessibilityService: AccessibilityService
   ) {}

      ngOnInit(): void {
       // Verificar que hay sesión activa
       if (!this.clientService.getCurrentSession()) {
         this.router.navigate(['/client']);
         return;
       }

        this.tableNumber = this.clientService.getCurrentTable();

        // Suscribirse a cambios de accesibilidad
        this.accessibilityService.settings$
          .pipe(takeUntil(this.destroy$))
          .subscribe(settings => {
            this.accessibilitySettings = settings;
            this.cdr.markForCheck();
          });

        this.loadCategories();
        this.loadMenu();
        this.loadCart();

        // Marcar para detección de cambios inicial
        this.cdr.markForCheck();

        // ✅ Timeout de seguridad: si después de 5 segundos aún está cargando, forzar a descargar
        setTimeout(() => {
          this.ngZone.run(() => {
            if (this.isLoading && this.menuItems.length === 0 && !this.errorMessage) {
              console.warn('⚠️ [ClientMenuComponent] Timeout de carga - forzando descargar');
              this.isLoading = false;
              this.errorMessage = 'Timeout al cargar el menú. Por favor, recarga la página.';
              this.cdr.markForCheck(); // ✅ Cambio: markForCheck en lugar de detectChanges
            }
          });
        }, 5000);
     }

   ngOnDestroy(): void {
     this.destroy$.next();
     this.destroy$.complete();
   }

    private loadCategories(): void {
      console.log('🔵 [ClientMenuComponent] Cargando categorías...');
      this.clientService.getCategories()
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response: any[]) => {
            this.ngZone.run(() => {
              this.categories = response.filter(cat => cat.active !== false); // Filtrar solo activas
              console.log('✅ [ClientMenuComponent] Categorías cargadas:', this.categories.length);
              this.cdr.markForCheck();
            });
          },
          error: (error: any) => {
            this.ngZone.run(() => {
              console.error('❌ [ClientMenuComponent] Error cargando categorías:', error);
              this.categories = [];
              this.cdr.markForCheck();
            });
          }
        });
    }

     private loadMenu(): void {
      console.log('🔵 [ClientMenuComponent] Iniciando carga de menú (endpoint público)...');
      this.clientService.getMenu()
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response: any) => {
            this.ngZone.run(() => {
              try {
                // El endpoint público retorna un array directo o respuesta paginada
                const items = Array.isArray(response)
                  ? response
                  : (response.content || response.data || []);
                console.log('✅ [ClientMenuComponent] Menú recibido:', items.length, 'productos');
                console.log('✅ [ClientMenuComponent] Items:', items);

                // Asegurarse que cada item tiene un precio
                this.menuItems = items.map((item: any) => ({
                  ...item,
                  price: item.price || item.basePrice || 0  // Normalizar precio
                }));

                this.filteredItems = [...this.menuItems];
                this.updatePagination();
                console.log('✅ [ClientMenuComponent] Menú normalizado y cargado');
                this.isLoading = false;
                this.cdr.markForCheck(); // ✅ Cambio: markForCheck en lugar de detectChanges
                console.log('✅ [ClientMenuComponent] Menú cargado completamente');
              } catch (parseError) {
                console.error('❌ [ClientMenuComponent] Error procesando menú:', parseError);
                this.errorMessage = 'Error al procesar el menú';
                this.isLoading = false;
                this.cdr.markForCheck(); // ✅ Cambio: markForCheck en lugar de detectChanges
              }
            });
          },
          error: (error: any) => {
            this.ngZone.run(() => {
              console.error('❌ [ClientMenuComponent] Error cargando menú:', error);
              this.errorMessage = this.i18n.translate('client.errors.menuLoadFailed');
              this.isLoading = false;
              this.cdr.markForCheck(); // ✅ Cambio: markForCheck en lugar de detectChanges
              console.log('❌ [ClientMenuComponent] isLoading = false, errorMessage mostrado');
            });
          }
        });
    }

   private loadCart(): void {
    const cartStr = sessionStorage.getItem('clientCart');
    if (cartStr) {
      try {
        const cartArray = JSON.parse(cartStr);
        cartArray.forEach((item: any) => {
          this.cart.set(item.id, item);
        });
      } catch (error) {
        console.error('Error loading cart:', error);
      }
    }
  }

  private saveCart(): void {
    const cartArray = Array.from(this.cart.values());
    sessionStorage.setItem('clientCart', JSON.stringify(cartArray));
  }

    filterByCategory(categoryId: number | null): void {
      this.selectedCategory = categoryId;
      if (!categoryId) {
        // Mostrar todos los items
        this.filteredItems = [...this.menuItems];
      } else {
        // Filtrar por categoryId
        this.filteredItems = this.menuItems.filter(item => item.categoryId === categoryId);
      }
      // Resetear a primera página cuando se filtra
      this.currentPage = 1;
      this.updatePagination();
      console.log('🔵 [ClientMenuComponent] Filtrado por categoría:', categoryId, 'Items:', this.filteredItems.length);
      this.cdr.markForCheck();
    }

  addToCart(item: MenuItem): void {
    const existing = this.cart.get(item.id);
    if (existing) {
      existing.quantity += 1;
    } else {
      this.cart.set(item.id, { item, quantity: 1 });
    }
    this.saveCart();
  }

  removeFromCart(itemId: number): void {
    this.cart.delete(itemId);
    this.saveCart();
  }

  updateQuantity(itemId: number, quantity: number): void {
    if (quantity <= 0) {
      this.removeFromCart(itemId);
    } else {
      const item = this.cart.get(itemId);
      if (item) {
        item.quantity = quantity;
        this.saveCart();
      }
    }
  }

  getCartTotal(): number {
    let total = 0;
    this.cart.forEach(item => {
      const price = item.item.basePrice || item.item.price || 0;
      total += price * item.quantity;
    });
    return total;
  }

  getCartCount(): number {
    let count = 0;
    this.cart.forEach(item => {
      count += item.quantity;
    });
    return count;
  }

  goToCheckout(): void {
    if (this.cart.size === 0) {
      this.errorMessage = this.i18n.translate('client.errors.emptyCart');
      return;
    }
    this.router.navigate(['/client/checkout']);
  }

   viewOrders(): void {
     this.router.navigate(['/client/orders']);
   }

    logout(): void {
      console.log('🔵 [ClientMenuComponent] Cerrando sesión...');
      this.clientService.closeSessionOnServer()
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.ngZone.run(() => {
              console.log('✅ [ClientMenuComponent] Sesión cerrada');
              this.router.navigate(['/client']);
            });
          },
          error: (error: any) => {
            this.ngZone.run(() => {
              console.error('❌ [ClientMenuComponent] Error al cerrar sesión:', error);
              // Redirigir de todas formas
              this.router.navigate(['/client']);
            });
          }
        });
    }

    /**
     * Actualiza la paginación basada en los items filtrados
     */
    private updatePagination(): void {
      this.totalPages = Math.ceil(this.filteredItems.length / this.itemsPerPage);
      if (this.totalPages < 1) {
        this.totalPages = 1;
      }
      this.calculatePageNumbers();
      this.updatePagedItems();
    }

    /**
     * Calcula los números de página a mostrar
     */
    private calculatePageNumbers(): void {
      const pages: number[] = [];
      const maxVisiblePages = 5;

      if (this.totalPages <= maxVisiblePages) {
        for (let i = 1; i <= this.totalPages; i++) {
          pages.push(i);
        }
      } else {
        const halfVisible = Math.floor(maxVisiblePages / 2);
        let start = this.currentPage - halfVisible;
        let end = this.currentPage + halfVisible;

        if (start < 1) {
          start = 1;
          end = maxVisiblePages;
        }
        if (end > this.totalPages) {
          end = this.totalPages;
          start = Math.max(1, end - maxVisiblePages + 1);
        }

        if (start > 1) {
          pages.push(1);
          if (start > 2) {
            pages.push(-1); // -1 indica "..."
          }
        }

        for (let i = start; i <= end; i++) {
          pages.push(i);
        }

        if (end < this.totalPages) {
          if (end < this.totalPages - 1) {
            pages.push(-1); // -1 indica "..."
          }
          pages.push(this.totalPages);
        }
      }

      this.pageNumbers = pages;
    }

    /**
     * Actualiza los items de la página actual
     */
    private updatePagedItems(): void {
      const start = (this.currentPage - 1) * this.itemsPerPage;
      const end = start + this.itemsPerPage;
      this.paginatedItems = this.filteredItems.slice(start, end);
      this.cdr.markForCheck();
    }

    /**
     * Va a una página específica
     */
    goToPage(pageNumber: number): void {
      if (pageNumber >= 1 && pageNumber <= this.totalPages) {
        this.currentPage = pageNumber;
        this.calculatePageNumbers();
        this.updatePagedItems();
        // Scroll al inicio de los items con accesibilidad
        const itemsSection = document.querySelector('.items-grid');
        if (itemsSection) {
          itemsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    }

    /**
     * Va a la página anterior
     */
    previousPage(): void {
      if (this.currentPage > 1) {
        this.goToPage(this.currentPage - 1);
      }
    }

    /**
     * Va a la siguiente página
     */
    nextPage(): void {
      if (this.currentPage < this.totalPages) {
        this.goToPage(this.currentPage + 1);
      }
    }

    /**
     * Verifica si es la primera página
     */
    isFirstPage(): boolean {
      return this.currentPage === 1;
    }

    /**
     * Verifica si es la última página
     */
    isLastPage(): boolean {
      return this.currentPage === this.totalPages;
    }
}

