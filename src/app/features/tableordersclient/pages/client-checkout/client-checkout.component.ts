import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ClientService } from '../../../../core/services/client.service';
import { CreateClientOrderRequest, Order } from '../../../../core/dtos/client.dto';
import { I18nService } from '../../../../core/services/i18n.service';

@Component({
  selector: 'app-client-checkout',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
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
          notes: ''
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

  submitOrder(): void {
    if (this.checkoutForm.invalid) {
      this.errorMessage = this.i18n.translate('client.errors.invalidPayment');
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = null;

    // Mapear cartItems al formato que espera el backend
    const request: CreateClientOrderRequest = {
      products: this.cartItems.map(item => ({
        productId: item.id,
        quantity: item.quantity,
        itemQuantityOverrides: {} // Por ahora vacío, puede ser llenado si hay receta
      }))
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

