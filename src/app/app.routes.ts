import { Routes } from '@angular/router';
import { LoginComponent } from './features/auth/pages/login/login';
import { InventoryComponent } from './features/inventory/Inventory';
import { SuppliersComponent } from './features/suppliers/Suppliers';
import { OAuth2CallbackComponent } from './features/auth/pages/login/oauth2-callback/oauth2-callback.component';
import { authGuard } from './core/guards/auth.guard';
export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },

  { path: 'login', component: LoginComponent },

  {
    path: 'dashboard',
    loadComponent: () =>
      import('./features/dashboard/dashboard.component')
        .then(m => m.DashboardComponent),
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
