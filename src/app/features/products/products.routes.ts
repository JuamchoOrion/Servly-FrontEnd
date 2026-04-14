import { Routes } from '@angular/router';
import { authGuard } from '../../core/guards/auth.guard';
import { roleGuard } from '../../core/guards/role-guard.service';
import { ProductListComponent } from './pages/product-list/product-list.component';
import { ProductFormComponent } from './pages/product-form/product-form.component';

export const productsRoutes: Routes = [
  {
    path: '',
    component: ProductListComponent,
    canActivate: [authGuard]
  },
  {
    path: 'new',
    component: ProductFormComponent,
    canActivate: [authGuard, roleGuard(['ADMIN'])]
  },
  {
    path: ':id/edit',
    component: ProductFormComponent,
    canActivate: [authGuard, roleGuard(['ADMIN'])]
  }
];

