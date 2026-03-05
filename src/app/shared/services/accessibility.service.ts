import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

/**
 * Interfaz para las configuraciones de accesibilidad
 * Cumple con estándares ISO 25010 para usabilidad
 */
export interface AccessibilitySettings {
  darkMode: boolean;
  fontSize: 'small' | 'medium' | 'large' | 'extra-large';
  highContrast: boolean;
  reduceMotion: boolean;
}

/**
 * Servicio de Accesibilidad reutilizable
 * Cumple con ISO 25010: Usabilidad y Accesibilidad
 * Permite gestionar configuraciones de accesibilidad en toda la aplicación
 */
@Injectable({ providedIn: 'root' })
export class AccessibilityService {
  private readonly STORAGE_KEY = 'servly_accessibility';

  private readonly defaultSettings: AccessibilitySettings = {
    darkMode: false,
    fontSize: 'medium',
    highContrast: false,
    reduceMotion: false
  };

  private settingsSubject = new BehaviorSubject<AccessibilitySettings>(
    this.loadSettings()
  );

  settings$: Observable<AccessibilitySettings> = this.settingsSubject.asObservable();

  constructor() {
    this.applySettings(this.settingsSubject.value);
  }

  /**
   * Carga las configuraciones almacenadas en localStorage
   * Si no existen, usa las configuraciones por defecto
   */
  private loadSettings(): AccessibilitySettings {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : this.defaultSettings;
    } catch {
      return this.defaultSettings;
    }
  }

  /**
   * Guarda las configuraciones en localStorage
   */
  private saveSettings(settings: AccessibilitySettings): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(settings));
    } catch {
      console.error('No se pudo guardar las configuraciones de accesibilidad');
    }
  }

  /**
   * Actualiza una configuración específica
   */
  updateSetting<K extends keyof AccessibilitySettings>(
    key: K,
    value: AccessibilitySettings[K]
  ): void {
    const current = this.settingsSubject.value;
    const updated = { ...current, [key]: value };
    this.settingsSubject.next(updated);
    this.saveSettings(updated);
    this.applySettings(updated);
  }

  /**
   * Aplica las configuraciones al DOM
   */
  private applySettings(settings: AccessibilitySettings): void {
    const root = document.documentElement;

    // Aplicar modo oscuro
    if (settings.darkMode) {
      root.classList.add('dark-mode');
    } else {
      root.classList.remove('dark-mode');
    }

    // Aplicar tamaño de fuente
    const fontSizeMap = {
      small: '12px',
      medium: '14px',
      large: '16px',
      'extra-large': '18px'
    };
    root.style.setProperty('--base-font-size', fontSizeMap[settings.fontSize]);

    // Aplicar alto contraste
    if (settings.highContrast) {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }

    // Reducir movimiento
    if (settings.reduceMotion) {
      root.classList.add('reduce-motion');
    } else {
      root.classList.remove('reduce-motion');
    }
  }

  /**
   * Obtiene las configuraciones actuales
   */
  getSettings(): AccessibilitySettings {
    return this.settingsSubject.value;
  }

  /**
   * Restaura todas las configuraciones a los valores por defecto
   */
  resetSettings(): void {
    this.settingsSubject.next(this.defaultSettings);
    this.saveSettings(this.defaultSettings);
    this.applySettings(this.defaultSettings);
  }
}

