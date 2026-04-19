import { Routes } from '@angular/router';
import { ClientWelcomeComponent } from './pages/client-welcome/client-welcome.component';
import { ClientMenuComponent } from './pages/client-menu/client-menu.component';
import { ClientCheckoutComponent } from './pages/client-checkout/client-checkout.component';
import { ClientOrdersComponent } from './pages/client-orders/client-orders.component';
import { ClientSessionGuard } from '../../core/guards/client-session.guard';

export const TABLE_ORDER_CLIENT_ROUTES: Routes = [
  {
    path: '',
    component: ClientWelcomeComponent
  },
  {
    path: 'menu',
    component: ClientMenuComponent,
    canActivate: [ClientSessionGuard]
  },
  {
    path: 'checkout',
    component: ClientCheckoutComponent,
    canActivate: [ClientSessionGuard]
  },
  {
    path: 'orders',
    component: ClientOrdersComponent,
    canActivate: [ClientSessionGuard]
  }
];

