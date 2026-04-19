import { Routes } from '@angular/router';
import { authGuard } from '../../core/guards/auth.guard';
import { roleGuard } from '../../core/guards/role-guard.service';
import { WaiterTablesComponent } from './pages/tables/waiter-tables.component';
import { TableOrdersComponent } from './pages/table-orders/table-orders.component';

export const waiterRoutes: Routes = [
  {
    path: '',
    canActivate: [authGuard, roleGuard],
    data: { requiredRole: 'WAITER' },
    children: [
      {
        path: 'tables',
        component: WaiterTablesComponent,
        data: { title: 'Mesas' }
      },
      {
        path: 'table-orders/:tableNumber',
        component: TableOrdersComponent,
        data: { title: 'Órdenes de Mesa' }
      },
      {
        path: '',
        redirectTo: 'tables',
        pathMatch: 'full'
      }
    ]
  }
];

