import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type SupportedLanguage = 'es' | 'en' | 'pt';

@Injectable({ providedIn: 'root' })
export class I18nService {
  private currentLanguage$ = new BehaviorSubject<SupportedLanguage>('es');
  private readonly LANGUAGE_STORAGE_KEY = 'app_language';

  private translations: Record<SupportedLanguage, Record<string, string>> = {
    es: {
      // Auth - Login
      'auth.login.subtitle': 'Sistema de Gestión de Restaurantes',
      'auth.login.email': 'Correo Electrónico',
      'auth.login.password': 'Contraseña',
      'auth.login.button': 'Iniciar Sesión',
      'auth.login.google': 'Continuar con Google',
      'auth.login.error.invalidCredentials': 'Correo electrónico o contraseña incorrectos',
      // Common
      'common.loading': 'Cargando...',
      'common.home': 'Inicio',
      'common.profile': 'Perfil',
      'common.refresh': 'Actualizar',
      'common.view': 'Ver',
      'common.manage': 'Gestionar',
      'common.create': 'Crear',
      'common.total': 'Total',
      // Rate Limit
      'rateLimit.message': 'Demasiados intentos. Intenta en {{remaining}} segundos',
      // Errors
      'error.401': 'Correo electrónico o contraseña incorrectos',
      'error.403': 'No tiene permisos para realizar esta acción',
      'error.404': 'Recurso no encontrado',
      'error.422': 'Datos inválidos. Verifica los campos',
      'error.429': 'Demasiados intentos. Intente más tarde',
      'error.500': 'Error del servidor. Intente más tarde',
      'error.network': 'No se pudo conectar al servidor. Verifica tu conexión',
      // Dashboard
      'dashboard.greeting.morning': 'Buenos días',
      'dashboard.greeting.afternoon': 'Buenas tardes',
      'dashboard.greeting.evening': 'Buenas noches',
      'dashboard.subtitle': 'Panel de control',
      'dashboard.stats.loading': 'Cargando estadísticas...',
      'dashboard.stats.empty': 'Dashboard no disponible',
      'dashboard.stats.emptyMessage': 'No se pudieron cargar las estadísticas',
      'dashboard.stats.totalItems': 'Items Totales',
      'dashboard.stats.totalCategories': 'Categorías',
      'dashboard.stats.batchesCloseToExpire': 'Lotes por Expirar',
      'dashboard.stats.batchesExpired': 'Lotes Expirados',
      'dashboard.stats.totalSuppliers': 'Proveedores',
      'dashboard.stats.viewItems': 'Ver items →',
      'dashboard.stats.manageCategories': 'Gestionar →',
      'dashboard.stats.reviewInventory': 'Revisar →',
      'dashboard.stats.view': 'Ver →',
      'dashboard.stats.viewAll': 'Ver todos →',
      'dashboard.charts.categoriesTitle': 'Distribución por Categorías',
      'dashboard.charts.categoriesSubtitle': 'Items por categoría',
      'dashboard.charts.batchesTitle': 'Estado de Lotes',
      'dashboard.charts.batchesSubtitle': 'Distribución por estado de expiración',
      'dashboard.charts.vigentes': 'Vigentes',
      'dashboard.charts.proximosExpirar': 'Próximos a Expirar',
      'dashboard.charts.expirados': 'Expirados',
      'dashboard.batches.closeToExpire': 'Lotes Próximos a Expirar',
      'dashboard.batches.expiredSection': 'Lotes Expirados',
      'dashboard.batches.lotes': 'lotes',
      'dashboard.batches.supplier': 'Proveedor',
      'dashboard.batches.units': 'unidades',
      'dashboard.batches.expires': 'Vence',
      'dashboard.batches.expiredDate': 'Expiró',
      'dashboard.batches.days': 'días',
      'dashboard.batches.expiredText': 'EXPIRADO',
      'dashboard.batches.healthyText': 'Vigente',
      'dashboard.batches.depletedText': 'AGOTADO',
      'dashboard.batches.noAlerts': 'No hay lotes próximos a expirar',
      'dashboard.actions.quickActions': 'Acciones Rápidas',
      'dashboard.actions.subtitle': 'Tareas comunes',
      'dashboard.actions.createEmployee': 'Crear Empleado',
      'dashboard.actions.manageUsers': 'Gestionar Usuarios',
      'dashboard.actions.createItem': 'Crear Item',
      'dashboard.actions.createCategory': 'Nueva Categoría',
      'dashboard.actions.reviewInventory': 'Revisar Inventario',
      'dashboard.actions.manageSuppliers': 'Gestionar Proveedores',
      // Access Denied
      'access.denied.title': 'Acceso Denegado',
      'access.denied.message': 'No tienes permisos para acceder a esta página',
      'access.denied.back': 'Volver',
      // Validation
      'validation.email.required': 'El email es obligatorio',
      'validation.email.invalid': 'Email inválido',
      'validation.password.required': 'La contraseña es obligatoria',
      'validation.password.minLength': 'Mínimo 6 caracteres',
      'validation.recaptcha': 'Por favor completa el reCAPTCHA',
      // Success
      'success.login': 'Inicio de sesión exitoso',
    },
    en: {
      // Auth - Login
      'auth.login.subtitle': 'Restaurant Management System',
      'auth.login.email': 'Email',
      'auth.login.password': 'Password',
      'auth.login.button': 'Sign In',
      'auth.login.google': 'Continue with Google',
      'auth.login.error.invalidCredentials': 'Invalid email or password',
      // Common
      'common.loading': 'Loading...',
      'common.home': 'Home',
      'common.profile': 'Profile',
      'common.refresh': 'Refresh',
      'common.view': 'View',
      'common.manage': 'Manage',
      'common.create': 'Create',
      'common.total': 'Total',
      // Rate Limit
      'rateLimit.message': 'Too many attempts. Try again in {{remaining}} seconds',
      // Errors
      'error.401': 'Invalid email or password',
      'error.403': 'You do not have permission to perform this action',
      'error.404': 'Resource not found',
      'error.422': 'Invalid data. Check the fields',
      'error.429': 'Too many attempts. Try again later',
      'error.500': 'Server error. Try again later',
      'error.network': 'Could not connect to server. Check your connection',
      // Dashboard
      'dashboard.greeting.morning': 'Good morning',
      'dashboard.greeting.afternoon': 'Good afternoon',
      'dashboard.greeting.evening': 'Good evening',
      'dashboard.subtitle': 'Dashboard',
      'dashboard.stats.loading': 'Loading statistics...',
      'dashboard.stats.empty': 'Dashboard unavailable',
      'dashboard.stats.emptyMessage': 'Could not load statistics',
      'dashboard.stats.totalItems': 'Total Items',
      'dashboard.stats.totalCategories': 'Categories',
      'dashboard.stats.batchesCloseToExpire': 'Batches Expiring Soon',
      'dashboard.stats.batchesExpired': 'Expired Batches',
      'dashboard.stats.totalSuppliers': 'Suppliers',
      'dashboard.stats.viewItems': 'View items →',
      'dashboard.stats.manageCategories': 'Manage →',
      'dashboard.stats.reviewInventory': 'Review →',
      'dashboard.stats.view': 'View →',
      'dashboard.stats.viewAll': 'View all →',
      'dashboard.charts.categoriesTitle': 'Distribution by Categories',
      'dashboard.charts.categoriesSubtitle': 'Items per category',
      'dashboard.charts.batchesTitle': 'Batch Status',
      'dashboard.charts.batchesSubtitle': 'Distribution by expiration status',
      'dashboard.charts.vigentes': 'Valid',
      'dashboard.charts.proximosExpirar': 'Expiring Soon',
      'dashboard.charts.expirados': 'Expired',
      'dashboard.batches.closeToExpire': 'Batches Expiring Soon',
      'dashboard.batches.expiredSection': 'Expired Batches',
      'dashboard.batches.lotes': 'batches',
      'dashboard.batches.supplier': 'Supplier',
      'dashboard.batches.units': 'units',
      'dashboard.batches.expires': 'Expires',
      'dashboard.batches.expiredDate': 'Expired',
      'dashboard.batches.days': 'days',
      'dashboard.batches.expiredText': 'EXPIRED',
      'dashboard.batches.healthyText': 'Valid',
      'dashboard.batches.depletedText': 'DEPLETED',
      'dashboard.batches.noAlerts': 'No batches expiring soon',
      'dashboard.actions.quickActions': 'Quick Actions',
      'dashboard.actions.subtitle': 'Common tasks',
      'dashboard.actions.createEmployee': 'Create Employee',
      'dashboard.actions.manageUsers': 'Manage Users',
      'dashboard.actions.createItem': 'Create Item',
      'dashboard.actions.createCategory': 'New Category',
      'dashboard.actions.reviewInventory': 'Review Inventory',
      'dashboard.actions.manageSuppliers': 'Manage Suppliers',
      // Access Denied
      'access.denied.title': 'Access Denied',
      'access.denied.message': 'You do not have permission to access this page',
      'access.denied.back': 'Back',
      // Validation
      'validation.email.required': 'Email is required',
      'validation.email.invalid': 'Invalid email',
      'validation.password.required': 'Password is required',
      'validation.password.minLength': 'Minimum 6 characters',
      'validation.recaptcha': 'Please complete the reCAPTCHA',
      // Success
      'success.login': 'Login successful',
    },
    pt: {
      // Auth - Login
      'auth.login.subtitle': 'Sistema de Gestão de Restaurantes',
      'auth.login.email': 'Email',
      'auth.login.password': 'Senha',
      'auth.login.button': 'Entrar',
      'auth.login.google': 'Continuar com Google',
      'auth.login.error.invalidCredentials': 'E-mail ou senha incorretos',
      // Common
      'common.loading': 'Carregando...',
      'common.home': 'Início',
      'common.profile': 'Perfil',
      'common.refresh': 'Atualizar',
      'common.view': 'Ver',
      'common.manage': 'Gerenciar',
      'common.create': 'Criar',
      'common.total': 'Total',
      // Rate Limit
      'rateLimit.message': 'Muitas tentativas. Tente novamente em {{remaining}} segundos',
      // Errors
      'error.401': 'E-mail ou senha incorretos',
      'error.403': 'Você não tem permissão para realizar esta ação',
      'error.404': 'Recurso não encontrado',
      'error.422': 'Dados inválidos. Verifique os campos',
      'error.429': 'Muitas tentativas. Tente mais tarde',
      'error.500': 'Erro do servidor. Tente mais tarde',
      'error.network': 'Não foi possível conectar ao servidor. Verifique sua conexão',
      // Dashboard
      'dashboard.greeting.morning': 'Bom dia',
      'dashboard.greeting.afternoon': 'Boa tarde',
      'dashboard.greeting.evening': 'Boa noite',
      'dashboard.subtitle': 'Painel de controle',
      'dashboard.stats.loading': 'Carregando estatísticas...',
      'dashboard.stats.empty': 'Painel indisponível',
      'dashboard.stats.emptyMessage': 'Não foi possível carregar as estatísticas',
      'dashboard.stats.totalItems': 'Total de Itens',
      'dashboard.stats.totalCategories': 'Categorias',
      'dashboard.stats.batchesCloseToExpire': 'Lotes Próximo do Vencimento',
      'dashboard.stats.batchesExpired': 'Lotes Vencidos',
      'dashboard.stats.totalSuppliers': 'Fornecedores',
      'dashboard.stats.viewItems': 'Ver itens →',
      'dashboard.stats.manageCategories': 'Gerenciar →',
      'dashboard.stats.reviewInventory': 'Revisar →',
      'dashboard.stats.view': 'Ver →',
      'dashboard.stats.viewAll': 'Ver todos →',
      'dashboard.charts.categoriesTitle': 'Distribuição por Categorias',
      'dashboard.charts.categoriesSubtitle': 'Itens por categoria',
      'dashboard.charts.batchesTitle': 'Status de Lotes',
      'dashboard.charts.batchesSubtitle': 'Distribuição por status de vencimento',
      'dashboard.charts.vigentes': 'Válidos',
      'dashboard.charts.proximosExpirar': 'Próximos a Vencer',
      'dashboard.charts.expirados': 'Vencidos',
      'dashboard.batches.closeToExpire': 'Lotes Próximos do Vencimento',
      'dashboard.batches.expiredSection': 'Lotes Vencidos',
      'dashboard.batches.lotes': 'lotes',
      'dashboard.batches.supplier': 'Fornecedor',
      'dashboard.batches.units': 'unidades',
      'dashboard.batches.expires': 'Vence',
      'dashboard.batches.expiredDate': 'Venceu',
      'dashboard.batches.days': 'dias',
      'dashboard.batches.expiredText': 'VENCIDO',
      'dashboard.batches.healthyText': 'Válido',
      'dashboard.batches.depletedText': 'ESGOTADO',
      'dashboard.batches.noAlerts': 'Não há lotes próximos do vencimento',
      'dashboard.actions.quickActions': 'Ações Rápidas',
      'dashboard.actions.subtitle': 'Tarefas comuns',
      'dashboard.actions.createEmployee': 'Criar Funcionário',
      'dashboard.actions.manageUsers': 'Gerenciar Usuários',
      'dashboard.actions.createItem': 'Criar Item',
      'dashboard.actions.createCategory': 'Nova Categoria',
      'dashboard.actions.reviewInventory': 'Revisar Inventário',
      'dashboard.actions.manageSuppliers': 'Gerenciar Fornecedores',
      // Access Denied
      'access.denied.title': 'Acesso Negado',
      'access.denied.message': 'Você não tem permissão para acessar esta página',
      'access.denied.back': 'Voltar',
      // Validation
      'validation.email.required': 'O email é obrigatório',
      'validation.email.invalid': 'Email inválido',
      'validation.password.required': 'A senha é obrigatória',
      'validation.password.minLength': 'Mínimo 6 caracteres',
      'validation.recaptcha': 'Por favor, complete o reCAPTCHA',
      // Success
      'success.login': 'Login bem-sucedido',
    }
  };

  constructor() {
    this.loadLanguageFromStorage();
  }

  private loadLanguageFromStorage(): void {
    const stored = localStorage.getItem(this.LANGUAGE_STORAGE_KEY) as SupportedLanguage | null;
    if (stored && ['es', 'en', 'pt'].includes(stored)) {
      this.currentLanguage$.next(stored);
    }
  }

  translate(key: string, params?: { [key: string]: string | number }): string {
    const lang = this.currentLanguage$.value;
    const translations = this.translations[lang];
    let text = translations[key] || key;

    if (params) {
      for (const [paramKey, paramValue] of Object.entries(params)) {
        text = text.replace(`{{${paramKey}}}`, String(paramValue));
      }
    }

    return text;
  }

  setLanguage(language: SupportedLanguage): void {
    if (['es', 'en', 'pt'].includes(language)) {
      this.currentLanguage$.next(language);
      localStorage.setItem(this.LANGUAGE_STORAGE_KEY, language);
    }
  }

  getCurrentLanguage(): SupportedLanguage {
    return this.currentLanguage$.value;
  }

  getCurrentLanguage$() {
    return this.currentLanguage$.asObservable();
  }

  getSupportedLanguages(): Array<{ code: string; name: string }> {
    return [
      { code: 'es', name: 'Español' },
      { code: 'en', name: 'English' },
      { code: 'pt', name: 'Português' }
    ];
  }
}


