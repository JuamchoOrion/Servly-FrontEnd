import { Routes } from '@angular/router';
import { LoginComponent } from './features/auth/pages/login/login';
import { InventoryComponent } from './features/inventory/Inventory';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'inventory', component: InventoryComponent },
  { path: 'inventory/dashboard', component: InventoryComponent },
  { path: 'inventory/providers', component: InventoryComponent },
  { path: 'inventory/providers/new', component: InventoryComponent },
  { path: 'inventory/history/supply', component: InventoryComponent },
  { path: 'inventory/history/movements', component: InventoryComponent }
];
