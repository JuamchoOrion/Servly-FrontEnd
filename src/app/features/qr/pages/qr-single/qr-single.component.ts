import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { I18nService } from '../../../../core/services/i18n.service';
import { QrGeneratorService, GeneratedQR } from '../../../../core/services/qr-generator.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-qr-single',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './qr-single.component.html',
  styleUrls: ['./qr-single.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class QrSingleComponent implements OnInit, OnDestroy {
  form: FormGroup;
  generatedQR: GeneratedQR | null = null;
  isLoading = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    public i18n: I18nService,
    private qrService: QrGeneratorService,
    private cdr: ChangeDetectorRef
  ) {
    this.form = this.fb.group({
      tableNumber: [
        '',
        [
          Validators.required,
          Validators.min(1),
          Validators.max(999),
          Validators.pattern(/^[0-9]+$/)
        ]
      ]
    });
  }

  ngOnInit(): void {
    // Suscribirse a cambios de idioma si es necesario
    this.i18n.getCurrentLanguage$()
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.cdr.markForCheck();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Genera el QR para la mesa especificada
   */
  async generateQR(): Promise<void> {
    if (this.form.invalid) {
      this.errorMessage = this.i18n.translate('qr.errors.invalidForm');
      this.cdr.markForCheck();
      return;
    }

    const tableNumber = parseInt(this.form.get('tableNumber')?.value, 10);

    this.isLoading = true;
    this.errorMessage = null;
    this.successMessage = null;
    this.cdr.markForCheck();

    try {
      this.generatedQR = await this.qrService.generateQR(tableNumber);
      this.successMessage = this.i18n.translate('qr.success.generated', { table: tableNumber });
    } catch (error) {
      this.errorMessage = error instanceof Error
        ? error.message
        : this.i18n.translate('qr.errors.generationFailed');
    } finally {
      this.isLoading = false;
      this.cdr.markForCheck();
    }
  }

  /**
   * Descarga el QR generado como PNG
   */
  downloadQR(): void {
    if (!this.generatedQR) return;

    try {
      this.qrService.downloadQR(this.generatedQR);
      this.successMessage = this.i18n.translate('qr.success.downloaded');
      this.cdr.markForCheck();
    } catch (error) {
      this.errorMessage = this.i18n.translate('qr.errors.downloadFailed');
      this.cdr.markForCheck();
    }
  }

  /**
   * Imprime el QR generado
   */
  printQR(): void {
    if (!this.generatedQR) return;

    try {
      this.qrService.printQR(this.generatedQR);
      this.successMessage = this.i18n.translate('qr.success.printStarted');
      this.cdr.markForCheck();
    } catch (error) {
      this.errorMessage = this.i18n.translate('qr.errors.printFailed');
      this.cdr.markForCheck();
    }
  }

  /**
   * Limpia el QR generado y los mensajes
   */
  clearQR(): void {
    this.generatedQR = null;
    this.form.reset();
    this.errorMessage = null;
    this.successMessage = null;
    this.cdr.markForCheck();
  }

  /**
   * Obtiene el control del formulario para validación
   */
  get tableNumberControl() {
    return this.form.get('tableNumber');
  }

  /**
   * Valida si se debe mostrar error específico
   */
  getTableNumberError(): string | null {
    const control = this.tableNumberControl;
    if (!control || !control.errors || !control.touched) return null;

    if (control.errors['required']) {
      return this.i18n.translate('qr.validation.tableNumberRequired');
    }
    if (control.errors['min'] || control.errors['max']) {
      return this.i18n.translate('qr.validation.tableNumberRange');
    }
    if (control.errors['pattern']) {
      return this.i18n.translate('qr.validation.tableNumberPattern');
    }
    return null;
  }
}

