import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ClickOutsideDirective } from '../../directives/click-outside.directive';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

interface NavItem {
  label: string;
  route: string;
  icon: string;
  roles: string[];
}

interface CurrentUser {
  email: string;
  name: string;
  roles: string[];
}

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, ClickOutsideDirective],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss']
})
export class NavbarComponent implements OnInit, OnDestroy {
  isAuthenticated = false;
  currentUser: CurrentUser | null = null;
  dropdownOpen = false;
  mobileMenuOpen = false;  // Estado del menú móvil
  userEmail = '';
  userRole = '';

  navItems: NavItem[] = [
    {
      label: 'Dashboard',
      route: '/dashboard',
      icon: 'dashboard',
      roles: ['ADMIN', 'STOREKEEPER', 'STAFF']
    },
    {
      label: 'Inventario',
      route: '/inventory',
      icon: 'inventory_2',
      roles: ['ADMIN', 'STOREKEEPER']
    },
    {
      label: 'Categorías',
      route: '/categories',
      icon: 'label',
      roles: ['ADMIN', 'STOREKEEPER']
    },
    {
      label: 'Items',
      route: '/items',
      icon: 'format_list_bulleted',
      roles: ['ADMIN', 'STOREKEEPER']
    },
    {
      label: 'Proveedores',
      route: '/inventory/providers',
      icon: 'handshake',
      roles: ['ADMIN', 'STOREKEEPER']
    }
  ];

  visibleNavItems: NavItem[] = [];
  private destroy$ = new Subject<void>();

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe((user: CurrentUser | null) => {
        if (user) {
          this.isAuthenticated = true;
          this.currentUser = user;
          this.userEmail = user.email;
          this.userRole = user.roles?.[0] || 'USER';
          this.updateVisibleItems();
        } else {
          this.isAuthenticated = false;
          this.currentUser = null;
          this.visibleNavItems = [];
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private updateVisibleItems(): void {
    if (this.currentUser && this.currentUser.roles) {
      this.visibleNavItems = this.navItems.filter(item =>
        item.roles.some(role => this.currentUser?.roles.includes(role))
      );
    }
  }

  toggleDropdown(): void {
    this.dropdownOpen = !this.dropdownOpen;
  }

  closeDropdown(): void {
    this.dropdownOpen = false;
  }

  toggleMobileMenu(): void {
    this.mobileMenuOpen = !this.mobileMenuOpen;
  }

  closeMobileMenu(): void {
    this.mobileMenuOpen = false;
  }

  onNavItemClick(): void {
    this.closeMobileMenu();
    this.closeDropdown();
  }

  logout(): void {
    this.authService.logout().subscribe({
      next: () => {
        this.router.navigate(['/login']);
      },
      error: (err: any) => {
        console.error('Logout error:', err);
        this.router.navigate(['/login']);
      }
    });
  }
}



