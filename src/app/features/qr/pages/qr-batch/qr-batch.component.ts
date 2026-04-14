import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { I18nService } from '../../../../core/services/i18n.service';
import { QrGeneratorService, GeneratedQR } from '../../../../core/services/qr-generator.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-qr-batch',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './qr-batch.component.html',
  styleUrls: ['./qr-batch.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class QrBatchComponent implements OnInit, OnDestroy {
  form: FormGroup;
  generatedQRs: GeneratedQR[] = [];
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
      startTable: [
        '',
        [
          Validators.required,
          Validators.min(1),
          Validators.max(999),
          Validators.pattern(/^[0-9]+$/)
        ]
      ],
      endTable: [
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
   * Genera QRs en lote para el rango especificado
   */
  async generateQRBatch(): Promise<void> {
    if (this.form.invalid) {
      this.errorMessage = this.i18n.translate('qr.errors.invalidForm');
      this.cdr.markForCheck();
      return;
    }

    const startTable = parseInt(this.form.get('startTable')?.value, 10);
    const endTable = parseInt(this.form.get('endTable')?.value, 10);

    if (startTable > endTable) {
      this.errorMessage = this.i18n.translate('qr.batch.errors.invalidRange');
      this.cdr.markForCheck();
      return;
    }

    const count = endTable - startTable + 1;
    if (count > 100) {
      this.errorMessage = this.i18n.translate('qr.batch.errors.tooMany');
      this.cdr.markForCheck();
      return;
    }

    this.isLoading = true;
    this.errorMessage = null;
    this.successMessage = null;
    this.generatedQRs = [];
    this.cdr.markForCheck();

    try {
      this.generatedQRs = await this.qrService.generateQRBatch(startTable, endTable);
      this.successMessage = this.i18n.translate('qr.batch.success.generated', { count });
    } catch (error) {
      this.errorMessage = error instanceof Error
        ? error.message
        : this.i18n.translate('qr.batch.errors.generationFailed');
    } finally {
      this.isLoading = false;
      this.cdr.markForCheck();
    }
  }

  /**
   * Descarga todos los QRs generados
   */
  async downloadAllQRs(): Promise<void> {
    if (this.generatedQRs.length === 0) return;

    try {
      await this.qrService.downloadQRBatch(this.generatedQRs);
      this.successMessage = this.i18n.translate('qr.batch.success.downloadsStarted');
      this.cdr.markForCheck();
    } catch (error) {
      this.errorMessage = this.i18n.translate('qr.batch.errors.downloadFailed');
      this.cdr.markForCheck();
    }
  }

  /**
   * Imprime todos los QRs generados
   */
  printAllQRs(): void {
    if (this.generatedQRs.length === 0) return;

    try {
      this.qrService.printQRBatch(this.generatedQRs);
      this.successMessage = this.i18n.translate('qr.batch.success.printStarted');
      this.cdr.markForCheck();
    } catch (error) {
      this.errorMessage = this.i18n.translate('qr.batch.errors.printFailed');
      this.cdr.markForCheck();
    }
  }

  /**
   * Limpia los QRs generados
   */
  clearQRs(): void {
    this.generatedQRs = [];
    this.form.reset();
    this.errorMessage = null;
    this.successMessage = null;
    this.cdr.markForCheck();
  }

  /**
   * Descarga un QR individual
   */
  downloadQR(qr: GeneratedQR): void {
    try {
      this.qrService.downloadQR(qr);
    } catch (error) {
      this.errorMessage = this.i18n.translate('qr.batch.errors.downloadFailed');
      this.cdr.markForCheck();
    }
  }

  /**
   * Imprime un QR individual
   */
  printQR(qr: GeneratedQR): void {
    try {
      this.qrService.printQR(qr);
    } catch (error) {
      this.errorMessage = this.i18n.translate('qr.batch.errors.printFailed');
      this.cdr.markForCheck();
    }
  }

  /**
   * Obtiene los controles del formulario
   */
  get startTableControl() {
    return this.form.get('startTable');
  }

  get endTableControl() {
    return this.form.get('endTable');
  }

  /**
   * Calcula el número de mesas a generar
   */
  get tableCount(): number {
    const start = parseInt(this.form.get('startTable')?.value || '0', 10);
    const end = parseInt(this.form.get('endTable')?.value || '0', 10);
    return Math.max(0, end - start + 1);
  }

  /**
   * Obtiene mensajes de error de validación
   */
  getStartTableError(): string | null {
    const control = this.startTableControl;
    if (!control || !control.errors || !control.touched) return null;

    if (control.errors['required']) {
      return this.i18n.translate('qr.batch.validation.startRequired');
    }
    if (control.errors['min'] || control.errors['max']) {
      return this.i18n.translate('qr.batch.validation.tableNumberRange');
    }
    return null;
  }

  getEndTableError(): string | null {
    const control = this.endTableControl;
    if (!control || !control.errors || !control.touched) return null;

    if (control.errors['required']) {
      return this.i18n.translate('qr.batch.validation.endRequired');
    }
    if (control.errors['min'] || control.errors['max']) {
      return this.i18n.translate('qr.batch.validation.tableNumberRange');
    }
    return null;
  }
}

