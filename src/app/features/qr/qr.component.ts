import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-qr-module',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="qr-module-container">
      <router-outlet></router-outlet>
    </div>
  `,
  styles: [`
    .qr-module-container {
      width: 100%;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class QrModuleComponent {}

