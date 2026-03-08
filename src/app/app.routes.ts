import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role-guard.service';
import { adminGuard } from './core/guards/admin.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },

  // Auth routes
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/pages/login/login').then(m => m.LoginComponent)
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
    path: 'profile',
    loadComponent: () =>
      import('./features/profile/profile.component').then(m => m.ProfileComponent),
    canActivate: [authGuard]
  },
  {
    path: 'inventory',
    loadComponent: () =>
      import('./features/inventory/Inventory').then(m => m.InventoryComponent),
    canActivate: [authGuard, roleGuard(['ADMIN', 'STOREKEEPER'])]
  },
  {
    path: 'categories',
    loadComponent: () =>
      import('./features/categories/item-categories').then(m => m.ItemCategoriesComponent),
    canActivate: [authGuard, roleGuard(['ADMIN', 'STOREKEEPER'])]
  },

  // Admin routes
  {
    path: 'admin/users/create',
    loadComponent: () =>
      import('./features/admin/pages/create-user/create-user.component').then(m => m.CreateUserComponent),
    canActivate: [authGuard, adminGuard]
  },
  {
    path: 'admin/users',
    loadComponent: () =>
      import('./features/admin/pages/user-list/user-list.component').then(m => m.UserListComponent),
    canActivate: [authGuard, adminGuard]
  },
  {
    path: 'admin/users/:id',
    loadComponent: () =>
      import('./features/admin/pages/user-detail/user-detail.component').then(m => m.UserDetailComponent),
    canActivate: [authGuard, adminGuard]
  },

  // Wildcard - must be last
  { path: '**', redirectTo: 'login' }
];
