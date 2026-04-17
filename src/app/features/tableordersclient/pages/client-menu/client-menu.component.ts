import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ClientService } from '../../../../core/services/client.service';
import { MenuItem } from '../../../../core/dtos/client.dto';
import { I18nService } from '../../../../core/services/i18n.service';

@Component({
  selector: 'app-client-menu',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './client-menu.component.html',
  styleUrls: ['./client-menu.component.scss']
})
export class ClientMenuComponent implements OnInit, OnDestroy {
  menuItems: MenuItem[] = [];
  filteredItems: MenuItem[] = [];
  categories: any[] = [];
  selectedCategory: string | null = null;
  isLoading = true;
  errorMessage: string | null = null;
  tableNumber: number | null = null;
  cart: Map<number, { item: MenuItem; quantity: number }> = new Map();

  private destroy$ = new Subject<void>();

  constructor(
    private clientService: ClientService,
    private router: Router,
    public i18n: I18nService
  ) {}

  ngOnInit(): void {
    // Verificar que hay sesión activa
    if (!this.clientService.getCurrentSession()) {
      this.router.navigate(['/client']);
      return;
    }

    this.tableNumber = this.clientService.getCurrentTable();
    this.loadMenu();
    this.loadCategories();
    this.loadCart();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadMenu(): void {
    console.log('🔵 [ClientMenuComponent] Iniciando carga de menú (endpoint público)...');
    this.clientService.getMenu()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          // El endpoint público retorna un array directo o respuesta paginada
          const items = Array.isArray(response)
            ? response
            : (response.content || response.data || []);
          console.log('✅ [ClientMenuComponent] Menú recibido:', items.length, 'productos');
          this.menuItems = items;
          this.filteredItems = items;
          this.isLoading = false;
          console.log('✅ [ClientMenuComponent] Menú cargado completamente');
        },
        error: (error: any) => {
          console.error('❌ [ClientMenuComponent] Error cargando menú:', error);
          this.errorMessage = this.i18n.translate('client.errors.menuLoadFailed');
          this.isLoading = false;
          console.log('❌ [ClientMenuComponent] isLoading = false, errorMessage mostrado');
        }
      });
  }

  private loadCategories(): void {
    this.clientService.getMenuCategories()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          this.categories = response.data || [];
        },
        error: (error: any) => {
          console.error('Error loading categories:', error);
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

  filterByCategory(categoryName: string | null): void {
    this.selectedCategory = categoryName;
    if (!categoryName) {
      this.filteredItems = this.menuItems;
    } else {
      // Filtrar por nombre de categoría si está disponible
      this.filteredItems = this.menuItems;
    }
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
    this.clientService.closeSession();
    this.router.navigate(['/client']);
  }
}

