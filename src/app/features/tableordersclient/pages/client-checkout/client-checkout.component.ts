import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ClientService } from '../../../../core/services/client.service';
import { CreateClientOrderRequest, Order } from '../../../../core/dtos/client.dto';
import { I18nService } from '../../../../core/services/i18n.service';
import { AccessibilityMenuComponent } from '../../../../shared/components/accessibility-menu/accessibility-menu.component';
import { ClientNavbarComponent } from '../../../../shared/components/client-navbar/client-navbar.component';
import { FooterComponent } from '../../../../shared/components/footer/footer.component';
import { ChatbotWidgetComponent } from '../../../../shared/components/chatbot-widget/chatbot-widget.component';

@Component({
  selector: 'app-client-checkout',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, AccessibilityMenuComponent, ClientNavbarComponent, FooterComponent, ChatbotWidgetComponent],
  templateUrl: './client-checkout.component.html',
  styleUrls: ['./client-checkout.component.scss']
})
export class ClientCheckoutComponent implements OnInit, OnDestroy {
  checkoutForm: FormGroup;
  cartItems: any[] = [];
  subtotal = 0;
  tax = 0;
  total = 0;
  isSubmitting = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;

  paymentMethods = [
    { value: 'CASH', label: 'Efectivo', icon: 'payments' },
    { value: 'CARD', label: 'Tarjeta', icon: 'credit_card' },
    { value: 'QR_PAYMENT', label: 'QR', icon: 'qr_code_2' }
  ];

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private clientService: ClientService,
    private router: Router,
    public i18n: I18nService
  ) {
    this.checkoutForm = this.fb.group({
      paymentMethod: ['CASH', Validators.required]
    });
  }

  ngOnInit(): void {
    if (!this.clientService.getCurrentSession()) {
      this.router.navigate(['/client']);
      return;
    }

    // Obtener carrito desde sessionStorage o localStorage
    this.loadCart();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadCart(): void {
    const cartStr = sessionStorage.getItem('clientCart');
    if (cartStr) {
      try {
        const cartData = JSON.parse(cartStr);
        this.cartItems = cartData.map((item: any) => ({
          id: item.item?.id || item.id,
          name: item.item?.name || item.name,
          price: item.item?.basePrice || item.item?.price || item.price || 0,
          quantity: item.quantity,
          notes: item.notes || '',
          recipeItems: item.item?.recipe?.itemDetailList || item.item?.recipeItems || [],
          itemOverrides: item.itemOverrides || {} // Cargar overrides guardados en el menú
        }));
        this.calculateTotals();
      } catch (error) {
        console.error('Error loading cart:', error);
        this.router.navigate(['/client/menu']);
      }
    } else {
      this.router.navigate(['/client/menu']);
    }
  }

  private calculateTotals(): void {
    this.subtotal = 0;
    this.cartItems.forEach(item => {
      this.subtotal += item.price * item.quantity;
    });
    this.tax = this.subtotal * 0.15; // 15% tax
    this.total = this.subtotal + this.tax;
  }

  hasOptionalItems(item: any): boolean {
    return item.recipeItems && item.recipeItems.some((ing: any) => ing.isOptional);
  }

  getIngredientId(ingredient: any): number | null {
    return ingredient.item?.id || ingredient.itemId || ingredient.id || null;
  }

  getIngredientQty(itemIndex: number, ingredient: any): number {
    const item = this.cartItems[itemIndex];
    const ingredientId = this.getIngredientId(ingredient);
    if (!ingredientId) return ingredient.quantity || 0;
    
    return item.itemOverrides[ingredientId] !== undefined 
      ? item.itemOverrides[ingredientId] 
      : (ingredient.quantity || 0);
  }

  updateIngredient(itemIndex: number, ingredient: any, delta: number): void {
    const item = this.cartItems[itemIndex];
    const ingredientId = this.getIngredientId(ingredient);
    if (!ingredientId) return;

    const currentQty = this.getIngredientQty(itemIndex, ingredient);
    const newQty = currentQty + delta;

    if (newQty >= ingredient.minQuantity && newQty <= ingredient.maxQuantity) {
      item.itemOverrides[ingredientId] = newQty;
      // Guardar de vuelta al sessionStorage para persistir en recargas
      this.saveCartToStorage();
    }
  }

  saveCartToStorage(): void {
    // Reconstruir el formato del carrito original
    const cartToSave = this.cartItems.map(item => {
      const originalCartData = JSON.parse(sessionStorage.getItem('clientCart') || '[]');
      const originalItem = originalCartData.find((oc: any) => (oc.item?.id || oc.id) === item.id);
      
      return {
        ...originalItem,
        quantity: item.quantity,
        notes: item.notes,
        itemOverrides: item.itemOverrides
      };
    });
    sessionStorage.setItem('clientCart', JSON.stringify(cartToSave));
  }

  submitOrder(): void {
    if (this.checkoutForm.invalid) {
      this.errorMessage = this.i18n.translate('client.errors.invalidPayment');
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = null;

    // Mapear cartItems al formato que espera el backend
    const request: CreateClientOrderRequest = {
      products: this.cartItems.map(item => {
        const overridesToSend: { [key: string]: number } = {};
        let hasOverrides = false;
        
        if (item.recipeItems) {
          item.recipeItems.forEach((ing: any) => {
            if (!ing.isOptional) return; // Solo items opcionales
            
            const ingId = ing.item?.id || ing.itemId || ing.id;
            if (ingId && item.itemOverrides && item.itemOverrides[ingId] !== undefined) {
              const qty = item.itemOverrides[ingId];
              if (qty > 0) { // Un item opcional con quantity 0 = no incluirlo
                overridesToSend[ingId.toString()] = qty;
                hasOverrides = true;
              }
            }
          });
        }

        const requestItem: any = {
          productId: item.id,
          quantity: item.quantity,
          annotations: item.notes || ''
        };
        
        if (hasOverrides) {
          requestItem.itemQuantityOverrides = overridesToSend;
        } else {
          requestItem.itemQuantityOverrides = null;
        }

        return requestItem;
      })
    };

    console.log('🔵 [CheckoutComponent] Enviando orden:', request);

    this.clientService.createOrder(request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (order: Order) => {
          this.isSubmitting = false;
          sessionStorage.removeItem('clientCart');
          this.successMessage = this.i18n.translate('client.checkout.orderCreated');
          console.log('✅ [CheckoutComponent] Orden creada:', order);

          // Esperar 2 segundos antes de navegar para que se vea el mensaje de éxito
          setTimeout(() => {
            console.log('🔵 [CheckoutComponent] Navegando a /client/orders');
            this.router.navigate(['/client/orders']);
          }, 2000);
        },
        error: (error: any) => {
          this.isSubmitting = false;
          console.error('❌ [CheckoutComponent] Error creando orden:', error);

          // Intentar obtener mensaje específico del backend
          let errorMsg = this.i18n.translate('client.errors.orderFailed');

          if (error.error?.message) {
            // Si el backend devuelve un mensaje, usarlo
            errorMsg = error.error.message;
            console.error('❌ [CheckoutComponent] Mensaje del backend:', errorMsg);
          } else if (error.status === 400) {
            // Error de validación
            errorMsg = 'Error al procesar tu pedido. Verifica que haya suficiente inventario.';
          } else if (error.status === 401) {
            // Sesión expirada
            errorMsg = 'Tu sesión ha expirado. Por favor, escanea el QR nuevamente.';
          } else if (error.status === 500) {
            // Error del servidor
            errorMsg = 'Error del servidor. Intenta nuevamente más tarde.';
          }

          this.errorMessage = errorMsg;
        }
      });
  }

  backToMenu(): void {
    this.router.navigate(['/client/menu']);
  }
}

