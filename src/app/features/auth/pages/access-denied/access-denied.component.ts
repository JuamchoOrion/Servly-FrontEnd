import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { I18nService } from '../../../../../app/core/services/i18n.service';

@Component({
  selector: 'app-access-denied',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="access-denied-container">
      <div class="access-denied-card">
        <!-- Ícono -->
        <div class="error-icon">🔐</div>

        <!-- Título -->
        <h1 class="error-title">{{ i18n.translate('access.denied.title') }}</h1>

        <!-- Mensaje -->
        <p class="error-message">{{ i18n.translate('access.denied.message') }}</p>

        <!-- Botones -->
        <div class="action-buttons">
          <button class="btn btn-primary" (click)="goBack()">
            {{ i18n.translate('access.denied.back') }}
          </button>
          <button class="btn btn-secondary" (click)="goHome()">
            {{ i18n.translate('common.home') }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .access-denied-container {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
      padding: 20px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    .access-denied-card {
      background: white;
      border-radius: 16px;
      padding: 60px 40px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
      text-align: center;
      max-width: 500px;
      animation: slideIn 0.4s ease-out;
    }

    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateY(30px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .error-icon {
      font-size: 64px;
      margin-bottom: 24px;
      animation: bounce 1s ease-in-out infinite;
    }

    @keyframes bounce {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-10px); }
    }

    .error-title {
      font-size: 28px;
      font-weight: 700;
      color: #2c3e50;
      margin: 0 0 16px 0;
    }

    .error-message {
      font-size: 16px;
      color: #7f8c8d;
      margin: 0 0 40px 0;
      line-height: 1.6;
    }

    .action-buttons {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
      justify-content: center;
    }

    .btn {
      padding: 12px 24px;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      font-family: inherit;
    }

    .btn-primary {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;

      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 10px 20px rgba(102, 126, 234, 0.3);
      }

      &:active {
        transform: translateY(0);
      }
    }

    .btn-secondary {
      background: #ecf0f1;
      color: #2c3e50;
      border: 2px solid #bdc3c7;

      &:hover {
        background: #d5dbdb;
        border-color: #95a5a6;
      }
    }

    @media (max-width: 600px) {
      .access-denied-card {
        padding: 40px 24px;
      }

      .error-title {
        font-size: 22px;
      }

      .error-message {
        font-size: 14px;
      }

      .btn {
        flex: 1;
        min-width: 120px;
      }
    }
  `]
})
export class AccessDeniedComponent {
  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute,
    public i18n: I18nService
  ) {}

  goBack(): void {
    this.activatedRoute.queryParams.subscribe(params => {
      if (params['returnUrl']) {
        this.router.navigateByUrl(params['returnUrl']);
      } else {
        window.history.back();
      }
    });
  }

  goHome(): void {
    this.router.navigate(['/']);
  }
}

