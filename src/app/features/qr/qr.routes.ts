import { Routes } from '@angular/router';
import { QrModuleComponent } from './qr.component';
import { QrSingleComponent } from './pages/qr-single/qr-single.component';
import { QrBatchComponent } from './pages/qr-batch/qr-batch.component';
import { roleGuard } from '../../core/guards/role-guard.service';

export const qrRoutes: Routes = [
  {
    path: '',
    component: QrModuleComponent,
    canActivate: [roleGuard(['ADMIN'])],
    children: [
      {
        path: '',
        redirectTo: 'single',
        pathMatch: 'full'
      },
      {
        path: 'single',
        component: QrSingleComponent,
        data: { title: 'Generar QR Individual' }
      },
      {
        path: 'batch',
        component: QrBatchComponent,
        data: { title: 'Generar QRs en Lote' }
      }
    ]
  }
];

