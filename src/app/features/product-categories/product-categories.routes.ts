import { Routes } from '@angular/router';
import { authGuard } from '../../core/guards/auth.guard';
import { roleGuard } from '../../core/guards/role-guard.service';
import { CategoryListComponent } from './pages/category-list/category-list.component';
import { CategoryFormComponent } from './pages/category-form/category-form.component';

export const PRODUCT_CATEGORIES_ROUTES: Routes = [
  {
    path: '',
    component: CategoryListComponent,
    canActivate: [authGuard, roleGuard(['ADMIN'])]
  },
  {
    path: 'new',
    component: CategoryFormComponent,
    canActivate: [authGuard, roleGuard(['ADMIN'])]
  },
  {
    path: ':id/edit',
    component: CategoryFormComponent,
    canActivate: [authGuard, roleGuard(['ADMIN'])]
  }
];

