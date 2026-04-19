import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../enviroments/enviroment';

@Component({
  selector: 'app-waiter-debug',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div style="padding: 20px; background: #f5f5f5; min-height: 100vh;">
      <h1>🔍 Debug: API Mesas</h1>

      <div style="margin: 20px 0;">
        <button (click)="testTables()" style="padding: 10px 20px; background: #667eea; color: white; border: none; cursor: pointer; border-radius: 4px;">
          Test GET /api/staff/tables
        </button>
      </div>

      <div *ngIf="loading" style="padding: 20px; background: #fff; border-radius: 4px; margin: 20px 0;">
        Cargando...
      </div>

      <div *ngIf="response" style="padding: 20px; background: #fff; border-radius: 4px; margin: 20px 0; border-left: 4px solid #51cf66;">
        <h3>✅ Respuesta del Backend:</h3>
        <pre style="background: #f8f9fa; padding: 15px; border-radius: 4px; overflow-x: auto;">{{ response | json }}</pre>
        <p><strong>Total de mesas:</strong> {{ (response | json)?.length || 0 }}</p>
      </div>

      <div *ngIf="error" style="padding: 20px; background: #fff; border-radius: 4px; margin: 20px 0; border-left: 4px solid #ff6b6b;">
        <h3>❌ Error:</h3>
        <pre style="background: #f8f9fa; padding: 15px; border-radius: 4px; color: #dc3545;">{{ error }}</pre>
      </div>
    </div>
  `,
  styles: [`
    h1 { color: #333; font-family: sans-serif; }
    h3 { color: #666; font-family: sans-serif; }
    p { color: #666; font-family: sans-serif; }
  `]
})
export class WaiterDebugComponent implements OnInit {
  response: any = null;
  error: string | null = null;
  loading = false;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    console.log('🔵 Debug Component - API URL:', environment.apiUrl);
  }

  testTables(): void {
    this.loading = true;
    this.error = null;
    this.response = null;

    const url = `${environment.apiUrl}/api/staff/tables`;
    console.log('🔵 Haciendo request a:', url);

    this.http.get(url, { withCredentials: true }).subscribe({
      next: (data: any) => {
        console.log('✅ Respuesta recibida:', data);
        this.response = data;
        this.loading = false;
      },
      error: (err: any) => {
        console.error('❌ Error:', err);
        this.error = JSON.stringify(err, null, 2);
        this.loading = false;
      }
    });
  }
}

