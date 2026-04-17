import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ClickOutsideDirective } from '../../directives/click-outside.directive';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { I18nService } from '../../../core/services/i18n.service';

interface NavItem {
  label: string;
  route: string;
  icon: string;
  roles: string[];
}

interface NavSection {
  title: string;
  icon: string;
  items: NavItem[];
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
  isClient = false;
  currentUser: CurrentUser | null = null;
  dropdownOpen = false;
  mobileMenuOpen = false;
  userEmail = '';
  userRole = '';
  openSections: Set<string> = new Set();

  navSections: NavSection[] = [
    {
      title: 'navbar.sections.operations',
      icon: 'store',
      roles: ['ADMIN', 'STOREKEEPER', 'WAITER', 'STAFF'],
      items: [
        {
          label: 'navbar.dashboard',
          route: '/dashboard',
          icon: 'dashboard',
          roles: ['ADMIN', 'STOREKEEPER', 'STAFF']
        },
        {
          label: 'navbar.waiterTables',
          route: '/waiter/tables',
          icon: 'table_restaurant',
          roles: ['WAITER', 'ADMIN']
        }
      ]
    },
    {
      title: 'navbar.sections.inventory',
      icon: 'inventory_2',
      roles: ['ADMIN', 'STOREKEEPER'],
      items: [
        {
          label: 'navbar.inventory',
          route: '/inventory',
          icon: 'storage',
          roles: ['ADMIN', 'STOREKEEPER']
        },
        {
          label: 'navbar.categories',
          route: '/categories',
          icon: 'label',
          roles: ['ADMIN', 'STOREKEEPER']
        },
        {
          label: 'navbar.items',
          route: '/items',
          icon: 'format_list_bulleted',
          roles: ['ADMIN', 'STOREKEEPER']
        },
        {
          label: 'navbar.suppliers',
          route: '/inventory/providers',
          icon: 'handshake',
          roles: ['ADMIN', 'STOREKEEPER']
        }
      ]
    },
    {
      title: 'navbar.sections.menu',
      icon: 'restaurant_menu',
      roles: ['ADMIN'],
      items: [
        {
          label: 'navbar.products',
          route: '/products',
          icon: 'restaurant_menu',
          roles: ['ADMIN']
        },
        {
          label: 'navbar.productCategories',
          route: '/product-categories',
          icon: 'category',
          roles: ['ADMIN']
        },
        {
          label: 'navbar.recipes',
          route: '/recipes',
          icon: 'restaurant',
          roles: ['ADMIN']
        }
      ]
    },
    {
      title: 'navbar.sections.restaurant',
      icon: 'meeting_room',
      roles: ['ADMIN'],
      items: [
        {
          label: 'navbar.tableManagement',
          route: '/tables',
          icon: 'event_note',
          roles: ['ADMIN']
        }
      ]
    },
    {
      title: 'navbar.sections.reports',
      icon: 'analytics',
      roles: ['ADMIN'],
      items: [
        {
          label: 'navbar.metrics',
          route: '/admin/audit-metrics',
          icon: 'analytics',
          roles: ['ADMIN']
        }
      ]
    }
  ];

  visibleSections: NavSection[] = [];

  private destroy$ = new Subject<void>();

  constructor(
    private authService: AuthService,
    private router: Router,
    public i18n: I18nService
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
          this.visibleSections = [];
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private updateVisibleItems(): void {
    if (this.currentUser && this.currentUser.roles) {
      // Detectar si es cliente
      this.isClient = this.currentUser.roles.includes('CLIENT');

      if (this.isClient) {
        // Si es cliente, no mostrar secciones de navegación
        this.visibleSections = [];
      } else {
        // Mostrar secciones para usuarios no-cliente
        this.visibleSections = this.navSections
          .filter(section => section.roles.some(role => this.currentUser?.roles.includes(role)))
          .map(section => ({
            ...section,
            items: section.items.filter(item =>
              item.roles.some(role => this.currentUser?.roles.includes(role))
            )
          }))
          .filter(section => section.items.length > 0);
      }
    }
  }

  toggleSection(sectionTitle: string): void {
    if (this.openSections.has(sectionTitle)) {
      this.openSections.delete(sectionTitle);
    } else {
      this.openSections.add(sectionTitle);
    }
  }

  isSectionOpen(sectionTitle: string): boolean {
    return this.openSections.has(sectionTitle);
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



