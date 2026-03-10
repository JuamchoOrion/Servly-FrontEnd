import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type SupportedLanguage = 'es' | 'en' | 'pt';

@Injectable({ providedIn: 'root' })
export class I18nService {
  private currentLanguage$ = new BehaviorSubject<SupportedLanguage>('es');
  private readonly LANGUAGE_STORAGE_KEY = 'app_language';

  private translations: Record<SupportedLanguage, Record<string, string>> = {
    es: {
      'auth.login.subtitle': 'Sistema de Gestión de Restaurantes',
      'auth.login.email': 'Correo Electrónico',
      'auth.login.password': 'Contraseña',
      'auth.login.button': 'Iniciar Sesión',
      'auth.login.google': 'Continuar con Google',
      'auth.login.error.invalidCredentials': 'Correo electrónico o contraseña incorrectos',
      'common.loading': 'Cargando...',
      'common.home': 'Inicio',
      'common.profile': 'Perfil',
      'rateLimit.message': 'Demasiados intentos. Intenta en {{remaining}} segundos',
      'error.401': 'Correo electrónico o contraseña incorrectos',
      'error.403': 'No tiene permisos para realizar esta acción',
      'error.404': 'Recurso no encontrado',
      'error.422': 'Datos inválidos. Verifica los campos',
      'error.429': 'Demasiados intentos. Intente más tarde',
      'error.500': 'Error del servidor. Intente más tarde',
      'error.network': 'No se pudo conectar al servidor. Verifica tu conexión',
    },
    en: {
      'auth.login.subtitle': 'Restaurant Management System',
      'auth.login.email': 'Email',
      'auth.login.password': 'Password',
      'auth.login.button': 'Sign In',
      'auth.login.google': 'Continue with Google',
      'auth.login.error.invalidCredentials': 'Invalid email or password',
      'common.loading': 'Loading...',
      'common.home': 'Home',
      'common.profile': 'Profile',
      'rateLimit.message': 'Too many attempts. Try again in {{remaining}} seconds',
      'error.401': 'Invalid email or password',
      'error.403': 'You do not have permission to perform this action',
      'error.404': 'Resource not found',
      'error.422': 'Invalid data. Check the fields',
      'error.429': 'Too many attempts. Try again later',
      'error.500': 'Server error. Try again later',
      'error.network': 'Could not connect to server. Check your connection',
    },
    pt: {
      'auth.login.subtitle': 'Sistema de Gestão de Restaurantes',
      'auth.login.email': 'Email',
      'auth.login.password': 'Senha',
      'auth.login.button': 'Entrar',
      'auth.login.google': 'Continuar com Google',
      'auth.login.error.invalidCredentials': 'E-mail ou senha incorretos',
      'common.loading': 'Carregando...',
      'common.home': 'Início',
      'common.profile': 'Perfil',
      'rateLimit.message': 'Muitas tentativas. Tente novamente em {{remaining}} segundos',
      'error.401': 'E-mail ou senha incorretos',
      'error.403': 'Você não tem permissão para realizar esta ação',
      'error.404': 'Recurso não encontrado',
      'error.422': 'Dados inválidos. Verifique os campos',
      'error.429': 'Muitas tentativas. Tente mais tarde',
      'error.500': 'Erro do servidor. Tente mais tarde',
      'error.network': 'Não foi possível conectar ao servidor. Verifique sua conexão',
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


