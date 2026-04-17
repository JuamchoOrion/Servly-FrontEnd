import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { ClientService } from '../../../../core/services/client.service';
import { I18nService } from '../../../../core/services/i18n.service';

@Component({
  selector: 'app-client-welcome',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './client-welcome.component.html',
  styleUrls: ['./client-welcome.component.scss']
})
export class ClientWelcomeComponent implements OnInit {
  form: FormGroup;
  isLoading = false;
  errorMessage: string | null = null;

  constructor(
    private fb: FormBuilder,
    private clientService: ClientService,
    private router: Router,
    private route: ActivatedRoute,
    public i18n: I18nService
  ) {
    this.form = this.fb.group({
      tableNumber: ['', [Validators.required, Validators.min(1), Validators.max(999)]]
    });
  }

  ngOnInit(): void {
    // Si ya hay sesión, ir al menú
    if (this.clientService.getCurrentSession()) {
      this.router.navigate(['/client/menu']);
      return;
    }

    // Verificar si viene desde QR (parámetro ?table=X)
    this.route.queryParams.subscribe(params => {
      const tableParam = params['table'];
      if (tableParam) {
        const tableNumber = parseInt(tableParam, 10);
        console.log('🔵 [ClientWelcomeComponent] QR detectado con mesa:', tableNumber);

        // Validar el número de mesa
        if (tableNumber >= 1 && tableNumber <= 999) {
          // Abrir sesión automáticamente
          this.form.patchValue({ tableNumber });
          this.openSessionAutomatically(tableNumber);
        } else {
          this.errorMessage = this.i18n.translate('client.errors.invalidTable');
        }
      }
    });
  }

  /**
   * Abre sesión automáticamente (desde QR)
   */
  private openSessionAutomatically(tableNumber: number): void {
    console.log('🔵 [ClientWelcomeComponent] Abriendo sesión automática para mesa:', tableNumber);
    this.isLoading = true;
    this.errorMessage = null;

    this.clientService.openSession(tableNumber).subscribe({
      next: () => {
        console.log('✅ [ClientWelcomeComponent] Sesión abierta automáticamente desde QR');
        this.isLoading = false;
        this.router.navigate(['/client/menu']);
      },
      error: (error: any) => {
        console.error('❌ [ClientWelcomeComponent] Error abriendo sesión desde QR:', error);
        this.isLoading = false;
        this.errorMessage = this.i18n.translate('client.errors.sessionFailed');
      }
    });
  }

  openSession(): void {
    if (this.form.invalid) {
      this.errorMessage = this.i18n.translate('client.errors.invalidTable');
      return;
    }

    const tableNumber = this.form.get('tableNumber')?.value;
    console.log('🔵 [ClientWelcomeComponent] Abriendo sesión para mesa:', tableNumber);
    this.isLoading = true;
    this.errorMessage = null;

    this.clientService.openSession(tableNumber).subscribe({
      next: () => {
        console.log('✅ [ClientWelcomeComponent] Sesión abierta exitosamente');
        this.isLoading = false;
        this.router.navigate(['/client/menu']);
      },
      error: (error: any) => {
        console.error('❌ [ClientWelcomeComponent] Error abriendo sesión:', error);
        this.isLoading = false;
        this.errorMessage = this.i18n.translate('client.errors.sessionFailed');
      }
    });
  }
}

