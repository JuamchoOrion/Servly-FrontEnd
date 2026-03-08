import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role-guard.service';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },

  // Auth routes
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/pages/login/login').then(m => m.LoginComponent)
  },
  {
    path: 'provider',
    loadComponent: () =>
      import('./features/suppliers/Suppliers').then(m => m.SuppliersComponent)
  },

  {
    path: 'access-denied',
    loadComponent: () =>
      import('./features/auth/pages/access-denied/access-denied.component').then(m => m.AccessDeniedComponent)
  },
  {
    path: 'oauth2/callback',
    loadComponent: () =>
      import('./features/auth/pages/login/oauth2-callback/oauth2-callback.component').then(m => m.OAuth2CallbackComponent)
  },

  // Protected routes with lazy loading
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent),
    canActivate: [authGuard]
  },
  {
    path: 'inventory',
    loadComponent: () =>
      import('./features/inventory/Inventory').then(m => m.InventoryComponent),
    canActivate: [authGuard, roleGuard(['ADMIN', 'STOREKEEPER'])]
  },
  {
    path: 'inventory/providers',
    loadComponent: () =>
      import('./features/suppliers/Suppliers').then(m => m.SuppliersComponent),
    canActivate: [authGuard, roleGuard(['ADMIN', 'STOREKEEPER'])]
  },
  {
    path: 'categories',
    loadComponent: () =>
      import('./features/categories/item-categories').then(m => m.ItemCategoriesComponent),
    canActivate: [authGuard, roleGuard(['ADMIN', 'STOREKEEPER'])]
  },
  {
    path: 'items',
    loadComponent: () =>
      import('./features/items/items').then(m => m.ItemsComponent),
    canActivate: [authGuard, roleGuard(['ADMIN', 'STOREKEEPER'])]
  },

  // Wildcard - must be last
  { path: '**', redirectTo: 'login' }
];
