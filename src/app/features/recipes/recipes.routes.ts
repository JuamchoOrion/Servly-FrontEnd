import { Routes } from '@angular/router';
import { authGuard } from '../../core/guards/auth.guard';
import { roleGuard } from '../../core/guards/role-guard.service';
import { RecipeListComponent } from './pages/recipe-list/recipe-list.component';
import { RecipeFormComponent } from './pages/recipe-form/recipe-form.component';

export const RECIPES_ROUTES: Routes = [
  {
    path: '',
    component: RecipeListComponent,
    canActivate: [authGuard, roleGuard(['ADMIN'])]
  },
  {
    path: 'new',
    component: RecipeFormComponent,
    canActivate: [authGuard, roleGuard(['ADMIN'])]
  },
  {
    path: ':id/edit',
    component: RecipeFormComponent,
    canActivate: [authGuard, roleGuard(['ADMIN'])]
  }
];

