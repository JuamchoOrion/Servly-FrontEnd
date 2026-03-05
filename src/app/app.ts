import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { IonApp } from '@ionic/angular/standalone';
import { AccessibilityMenuComponent } from './shared/components/accessibility-menu/accessibility-menu.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [IonApp, RouterOutlet, AccessibilityMenuComponent],
  templateUrl: './app.html'
})
export class App {}
