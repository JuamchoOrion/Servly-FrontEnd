import { Routes } from '@angular/router';
import { LoginComponent } from './features/auth/pages/login/login';
import { OAuth2CallbackComponent } from './features/auth/pages/login/oauth2-callback/oauth2-callback.component';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  {
    path: 'dashboard',
    loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent),
    canActivate: [authGuard]
  },
  {
    path: 'oauth2/callback',
    component: OAuth2CallbackComponent
  }
];
