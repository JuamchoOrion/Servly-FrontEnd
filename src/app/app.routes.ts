import { Routes } from '@angular/router';
import { LoginComponent } from './features/auth/pages/login/login';
import { InventoryComponent } from './features/inventory/Inventory';
import { SuppliersComponent } from './features/suppliers/Suppliers';
import { OAuth2CallbackComponent } from './features/auth/pages/login/oauth2-callback/oauth2-callback.component';
import { AccessDeniedComponent } from './features/auth/pages/access-denied/access-denied.component';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },

  { path: 'login', component: LoginComponent },
  { path: 'access-denied', component: AccessDeniedComponent },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./features/dashboard/dashboard.component')
        .then(m => m.DashboardComponent),
    canActivate: [authGuard]
  },
  {
    path: 'inventory',
    loadComponent: () => import('./features/inventory/Inventory').then(m => m.InventoryComponent),
    canActivate: [authGuard]
  },

  {
    path: 'oauth2/callback',
    component: OAuth2CallbackComponent
  },

  { path: 'inventory', component: InventoryComponent },
  { path: 'inventory/dashboard', component: InventoryComponent },
  { path: 'inventory/providers', component: SuppliersComponent },
  { path: 'inventory/history/supply', component: InventoryComponent },
  { path: 'inventory/history/movements', component: InventoryComponent }
];
