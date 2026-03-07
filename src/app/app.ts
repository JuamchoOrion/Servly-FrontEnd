import { Component, OnInit } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { IonApp } from '@ionic/angular/standalone';
import { AccessibilityMenuComponent } from './shared/components/accessibility-menu/accessibility-menu.component';
import { NavbarComponent } from './shared/components/navbar/navbar.component';
import { FooterComponent } from './shared/components/footer/footer.component';
import { CommonModule } from '@angular/common';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [IonApp, RouterOutlet, CommonModule, AccessibilityMenuComponent, NavbarComponent, FooterComponent],
  templateUrl: './app.html'
})
export class App implements OnInit {
  showNavbar = true;
  showFooter = true;

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      const url = event.urlAfterRedirects;
      this.showNavbar = !url.includes('/login');
      this.showFooter = !url.includes('/login');
    });
  }
}

