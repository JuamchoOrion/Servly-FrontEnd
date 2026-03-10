import { Component, OnInit, HostListener, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AccessibilityService, type AccessibilitySettings } from '../../services/accessibility.service';

/**
 * Componente de Menú de Accesibilidad reutilizable
 * Cumple con ISO 25010 - Accesibilidad y Usabilidad
 *
 * Características:
 * - Modo oscuro/claro
 * - Control de tamaño de fuente
 * - Alto contraste
 * - Reducción de movimiento
 * - Persistencia de configuraciones
 */
@Component({
  selector: 'app-accessibility-menu',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './accessibility-menu.component.html',
  styleUrls: ['./accessibility-menu.component.scss']
})
export class AccessibilityMenuComponent implements OnInit {
  isOpen = false;
  settings: AccessibilitySettings = {
    darkMode: false,
    fontSize: 'medium',
    highContrast: false,
    reduceMotion: false
  };

  fontSizeOptions = [
    { value: 'small', label: 'Pequeño (12px)' },
    { value: 'medium', label: 'Medio (14px)' },
    { value: 'large', label: 'Grande (16px)' },
    { value: 'extra-large', label: 'Muy Grande (18px)' }
  ];

  constructor(private accessibilityService: AccessibilityService, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    // Suscribirse a los cambios de configuración
    this.accessibilityService.settings$.subscribe(settings => {
      this.settings = { ...settings };
      console.log('🔵 [AccessibilityMenu] Configuración actualizada:', settings);
      // Forzar detección de cambios
      this.cdr.detectChanges();
    });
  }

  /**
   * Abre/cierra el menú de accesibilidad
   */
  toggleMenu(): void {
    this.isOpen = !this.isOpen;
  }

  /**
   * Cierra el menú
   */
  closeMenu(): void {
    this.isOpen = false;
  }

  /**
   * Alterna el modo oscuro
   */
  toggleDarkMode(): void {
    this.accessibilityService.updateSetting('darkMode', !this.settings.darkMode);
  }

  /**
   * Actualiza el tamaño de fuente
   */
  updateFontSize(size: string): void {
    const validSizes = ['small', 'medium', 'large', 'extra-large'];
    if (validSizes.includes(size)) {
      this.accessibilityService.updateSetting('fontSize', size as 'small' | 'medium' | 'large' | 'extra-large');
    }
  }

  /**
   * Alterna el alto contraste
   */
  toggleHighContrast(): void {
    this.accessibilityService.updateSetting(
      'highContrast',
      !this.settings.highContrast
    );
  }

  /**
   * Alterna la reducción de movimiento
   */
  toggleReduceMotion(): void {
    this.accessibilityService.updateSetting(
      'reduceMotion',
      !this.settings.reduceMotion
    );
  }

  /**
   * Restaura los valores por defecto
   */
  resetSettings(): void {
    if (confirm('¿Estás seguro de que deseas restablecer los valores predeterminados?')) {
      this.accessibilityService.resetSettings();
    }
  }

  /**
   * Cierra el menú al hacer clic fuera de él
   */
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    const container = document.querySelector('.accessibility-container');

    if (this.isOpen && container && !container.contains(target)) {
      this.closeMenu();
    }
  }
}

