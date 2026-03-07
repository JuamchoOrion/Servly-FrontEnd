/**
 * COMPONENTES REUTILIZABLES - NAVBAR & FOOTER
 * ===========================================
 * 
 * Estos componentes están diseñados para ser reutilizados en todas las vistas
 * de administración de Servly.
 * 
 * ═══════════════════════════════════════════════════════════════════════════════════
 * 1. NAVBAR COMPONENT
 * ═══════════════════════════════════════════════════════════════════════════════════
 * 
 * UBICACIÓN:
 * └─ src/app/shared/components/navbar/navbar.component.ts
 * 
 * CARACTERÍSTICAS:
 * ✅ Standalone component (sin módulos)
 * ✅ Adapta contenido según autenticación
 * ✅ Menú dinámico según roles del usuario
 * ✅ Dropdown con cierre automático (click outside)
 * ✅ Responsive (mobile-friendly)
 * ✅ Reutilizable en todas las páginas
 * 
 * ROLES SOPORTADOS:
 * - ADMIN: Dashboard, Inventario, Categorías, Proveedores, Logout
 * - STOREKEEPER: Dashboard, Inventario, Categorías, Proveedores, Logout
 * - STAFF: Dashboard, Logout
 * - NO AUTENTICADO: Botón de Login
 * 
 * ESTRUCTURA VISUAL:
 * ┌────────────────────────────────────────────────────────────────┐
 * │ Servly  [Dashboard] [Inventario] [Categorías] [Proveedores]    │
 * │                                              SERVLY - Gestión  [User▼] │
 * └────────────────────────────────────────────────────────────────┘
 * 
 * DROPDOWN MENU:
 * ┌─ [ADMIN/STOREKEEPER] ─┐
 * ├─ Dashboard            │
 * ├─ Cerrar Sesión        │
 * └────────────────────────┘
 * 
 * CÓMO USARLO EN UN COMPONENTE:
 * 
 * NO NECESITAS HACER NADA. El NavbarComponent está importado en:
 * - src/app/app.ts (App component principal)
 * - src/app/app.html
 * 
 * Aparecerá automáticamente en todas las páginas.
 * 
 * CARACTERÍSTICAS TÉCNICAS:
 * 
 * 1. AUTENTICACIÓN AUTOMÁTICA:
 *    └─ Se suscribe a authService.currentUser$
 *    └─ Se actualiza automáticamente al login/logout
 * 
 * 2. ROLES DINÁMICOS:
 *    └─ navItems se filtran según user.roles
 *    └─ Solo muestra opciones permitidas para su rol
 * 
 * 3. DROPDOWN CON CLICK OUTSIDE:
 *    └─ Usa ClickOutsideDirective
 *    └─ Se cierra al hacer click fuera
 *    └─ Se cierra al navegar a otra ruta
 * 
 * 4. RESPONSIVE:
 *    └─ Desktop: muestra todos los items y nombre del usuario
 *    └─ Tablet: oculta algunos detalles
 *    └─ Mobile: menú hamburguesa (implementar si es necesario)
 * 
 * ═══════════════════════════════════════════════════════════════════════════════════
 * 2. FOOTER COMPONENT
 * ═══════════════════════════════════════════════════════════════════════════════════
 * 
 * UBICACIÓN:
 * └─ src/app/shared/components/footer/footer.component.ts
 * 
 * CARACTERÍSTICAS:
 * ✅ Standalone component
 * ✅ Año automático (2026, 2027, etc.)
 * ✅ Botón "Contáctanos" (envía email)
 * ✅ Responsive
 * ✅ Reutilizable
 * 
 * ESTRUCTURA VISUAL:
 * ┌────────────────────────────────────────────────────────────────┐
 * │ Servly © 2026        [💬 Contáctanos]    Sistema de Gestión... │
 * └────────────────────────────────────────────────────────────────┘
 * 
 * CÓMO USARLO:
 * 
 * NO NECESITAS HACER NADA. El FooterComponent está importado en:
 * - src/app/app.ts (App component principal)
 * - src/app/app.html
 * 
 * Aparecerá automáticamente en la parte inferior de todas las páginas.
 * 
 * CARACTERÍSTICAS TÉCNICAS:
 * 
 * 1. AÑO AUTOMÁTICO:
 *    └─ currentYear = new Date().getFullYear()
 *    └─ Siempre muestra el año actual
 * 
 * 2. BOTÓN CONTÁCTANOS:
 *    └─ Abre cliente de email por defecto
 *    └─ mailto:contacto@servly.com
 *    └─ Modificable en contactUs()
 * 
 * 3. FLEXBOX LAYOUT:
 *    └─ Left: Logo + Año
 *    └─ Center: Botón Contáctanos
 *    └─ Right: Descripción del sistema
 * 
 * ═══════════════════════════════════════════════════════════════════════════════════
 * 3. LAYOUT GENERAL (APP)
 * ═══════════════════════════════════════════════════════════════════════════════════
 * 
 * ESTRUCTURA EN app.html:
 * 
 * <ion-app class="app-wrapper">
 *   <app-navbar></app-navbar>          ← STICKY TOP, ALWAYS VISIBLE
 *   
 *   <main class="app-main">            ← CONTENIDO PRINCIPAL FLEXIBLE
 *     <router-outlet></router-outlet>  ← Páginas dinámicas
 *   </main>
 *   
 *   <app-footer></app-footer>          ← STICKY BOTTOM, ALWAYS VISIBLE
 *   <app-accessibility-menu></app-accessibility-menu>
 * </ion-app>
 * 
 * LAYOUT FLEXBOX (app.scss):
 * 
 * ion-app.app-wrapper {
 *   display: flex;
 *   flex-direction: column;
 *   min-height: 100vh;
 * 
 *   app-navbar { flex-shrink: 0; }  ← No se encoge
 *   .app-main { flex: 1; }           ← Se expande para llenar espacio
 *   app-footer { flex-shrink: 0; }  ← No se encoge
 * }
 * 
 * RESULTADO VISUAL:
 * 
 * ┌─────────────────────────────────────┐
 * │                                     │
 * │          APP-NAVBAR (sticky)       │ ← Siempre visible en top
 * │                                     │
 * ├─────────────────────────────────────┤
 * │                                     │
 * │        ROUTER-OUTLET                │ ← Contenido dinámico
 * │     (Inventory, Dashboard, etc)     │ ← Ocupa espacio disponible
 * │                                     │
 * │                                     │
 * ├─────────────────────────────────────┤
 * │                                     │
 * │         APP-FOOTER (sticky)        │ ← Siempre visible en bottom
 * │                                     │
 * └─────────────────────────────────────┘
 * 
 * ═══════════════════════════════════════════════════════════════════════════════════
 * 4. FLUJO DE AUTENTICACIÓN
 * ═══════════════════════════════════════════════════════════════════════════════════
 * 
 * INICIO (NO AUTENTICADO):
 * ┌─────────────────────┐
 * │      NAVBAR         │
 * │ Servly           [🔐 Iniciar Sesión] │
 * └─────────────────────┘
 *       ↓ (click login)
 * Navega a /login
 *       ↓
 * Usuario ingresa credenciales
 *       ↓
 * Login exitoso (200 OK)
 *       ↓
 * Tokens guardados en sessionStorage
 *       ↓
 * authService.currentUserSubject actualizado
 *       ↓
 * ┌──────────────────────────────────────────┐
 * │           NAVBAR ACTUALIZADA              │
 * │ Servly [Dashboard][Inventario]...  │
 * │                          SERVLY - Gestión [User▼] │
 * └──────────────────────────────────────────┘
 *       ↓
 * Dropdown con opciones según rol
 * 
 * LOGOUT:
 * └─ Click en "Cerrar Sesión"
 *    └─ authService.logout()
 *       └─ POST /api/auth/logout
 *          └─ Limpia sessionStorage
 *             └─ Navega a /login
 *                └─ NavbarComponent se actualiza
 *                   └─ Muestra botón "Iniciar Sesión" nuevamente
 * 
 * ═══════════════════════════════════════════════════════════════════════════════════
 * 5. PERSONALIZACIÓN
 * ═══════════════════════════════════════════════════════════════════════════════════
 * 
 * CAMBIAR EMAIL DE CONTACTO:
 * 
 * Editar: src/app/shared/components/footer/footer.component.ts
 * Línea: window.location.href = 'mailto:contacto@servly.com';
 * 
 * Reemplazar con:
 * window.location.href = 'mailto:tu-email@servly.com';
 * 
 * CAMBIAR ITEMS DEL MENÚ:
 * 
 * Editar: src/app/shared/components/navbar/navbar.component.ts
 * 
 * navItems: NavItem[] = [
 *   {
 *     label: 'Dashboard',
 *     route: '/dashboard',
 *     icon: '📊',
 *     roles: ['ADMIN', 'STOREKEEPER', 'STAFF']
 *   },
 *   // ... más items
 * ];
 * 
 * AÑADIR NUEVO ITEM AL MENÚ:
 * 
 * {
 *   label: 'Nuevo Módulo',
 *   route: '/nuevo-modulo',
 *   icon: '🎯',
 *   roles: ['ADMIN'] // Solo para admin
 * }
 * 
 * ═══════════════════════════════════════════════════════════════════════════════════
 * 6. DEPENDENCIAS & IMPORTS
 * ═══════════════════════════════════════════════════════════════════════════════════
 * 
 * NavbarComponent imports:
 * ├─ CommonModule (ngIf, ngFor, etc)
 * ├─ RouterLink (routerLink directive)
 * ├─ ClickOutsideDirective (cierra dropdown)
 * ├─ AuthService (estado de usuario)
 * └─ Router (navegación)
 * 
 * FooterComponent imports:
 * └─ CommonModule (interpolación)
 * 
 * App imports:
 * ├─ NavbarComponent
 * ├─ FooterComponent
 * ├─ AccessibilityMenuComponent
 * └─ RouterOutlet (para router)
 * 
 * ═══════════════════════════════════════════════════════════════════════════════════
 * 7. RESOLUCIÓN DE PROBLEMAS
 * ═══════════════════════════════════════════════════════════════════════════════════
 * 
 * PROBLEMA: Navbar no aparece
 * SOLUCIÓN:
 * 1. Verificar que NavbarComponent está en app.ts imports
 * 2. Verificar que <app-navbar></app-navbar> está en app.html
 * 3. Verificar que no hay errores de compilación
 * 
 * PROBLEMA: Dropdown no se cierra
 * SOLUCIÓN:
 * 1. Verificar que ClickOutsideDirective está importado
 * 2. Verificar que appClickOutside está en el div.user-section
 * 3. Verificar que (clickOutside)="closeDropdown()" está presente
 * 
 * PROBLEMA: Elementos del navbar cortados en mobile
 * SOLUCIÓN:
 * 1. Las media queries ya están en navbar.component.scss
 * 2. En mobile se oculta automáticamente el nombre del usuario
 * 3. Se puede implementar un menú hamburguesa adicional si es necesario
 * 
 * ═══════════════════════════════════════════════════════════════════════════════════
 */

