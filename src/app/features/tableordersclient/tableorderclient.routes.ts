import { Routes } from '@angular/router';
import { ClientWelcomeComponent } from './pages/client-welcome/client-welcome.component';
import { ClientMenuComponent } from './pages/client-menu/client-menu.component';
import { ClientCheckoutComponent } from './pages/client-checkout/client-checkout.component';
import { ClientOrdersComponent } from './pages/client-orders/client-orders.component';

export const TABLE_ORDER_CLIENT_ROUTES: Routes = [
  {
    path: '',
    component: ClientWelcomeComponent
  },
  {
    path: 'menu',
    component: ClientMenuComponent
  },
  {
    path: 'checkout',
    component: ClientCheckoutComponent
  },
  {
    path: 'orders',
    component: ClientOrdersComponent
  }
];

