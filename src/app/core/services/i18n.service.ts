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
      'common.loading': 'Cargando...',
      'common.home': 'Inicio',
      'common.profile': 'Perfil',
      'rateLimit.message': 'Demasiados intentos. Intenta en {{remaining}} segundos',
    },
    en: {
      'auth.login.subtitle': 'Restaurant Management System',
      'auth.login.email': 'Email',
      'auth.login.password': 'Password',
      'auth.login.button': 'Sign In',
      'auth.login.google': 'Continue with Google',
      'common.loading': 'Loading...',
      'common.home': 'Home',
      'common.profile': 'Profile',
      'rateLimit.message': 'Too many attempts. Try again in {{remaining}} seconds',
    },
    pt: {
      'auth.login.subtitle': 'Sistema de Gestão de Restaurantes',
      'auth.login.email': 'Email',
      'auth.login.password': 'Senha',
      'auth.login.button': 'Entrar',
      'auth.login.google': 'Continuar com Google',
      'common.loading': 'Carregando...',
      'common.home': 'Início',
      'common.profile': 'Perfil',
      'rateLimit.message': 'Muitas tentativas. Tente novamente em {{remaining}} segundos',
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


