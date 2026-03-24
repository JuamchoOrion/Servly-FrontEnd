import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../enviroments/enviroment';
import { I18nService } from './i18n.service';

/**
 * Estado del lote de stock
 */
export type StockBatchStatus = 'VIGENTE' | 'PROXIMO_A_EXPIRAR' | 'EXPIRADO' | 'AGOTADO';

/**
 * Interface para StockBatch (lotes individuales)
 */
export interface StockBatch {
  id: number;
  batchNumber: string;
  quantity: number;
  supplierName: string;
  createdDate: string;  // LocalDate -> string ISO
  expiryDate: string;   // LocalDate -> string ISO
  status: StockBatchStatus;
  daysUntilExpiry: number;
}

/**
 * Request para crear un nuevo lote
 * POST /api/stock-batch
 *
 * expiryDate es OPCIONAL - si no se proporciona, el backend lo calcula
 * automáticamente usando: fechaActual + item.expirationDays
 */
export interface CreateBatchRequest {
  itemStockId: number;
  quantity: number;
  supplierId: number;
  batchNumber: string;
  expiryDate?: string;  // OPCIONAL - formato: "YYYY-MM-DD"
}

/**
 * Servicio para gestionar lotes de stock (StockBatch)
 * Maneja la lógica FIFO para control de inventario
 */
@Injectable({ providedIn: 'root' })
export class StockBatchService {
  private readonly API_URL = `${environment.apiUrl}/api/stock-batch`;

  constructor(private http: HttpClient, private i18n: I18nService) {}

  /**
   * Obtiene lotes próximos a expirar (menos de 7 días)
   * GET /api/stock-batch/close-to-expire
   */
  getCloseToExpire(): Observable<StockBatch[]> {
    return this.http.get<StockBatch[]>(
      `${this.API_URL}/close-to-expire`,
      { withCredentials: true }
    );
  }

  /**
   * Crea un nuevo lote de stock
   * POST /api/stock-batch
   */
  createBatch(request: CreateBatchRequest): Observable<StockBatch> {
    return this.http.post<StockBatch>(
      this.API_URL,
      request,
      { withCredentials: true }
    );
  }

  /**
   * Obtiene lotes ya expirados
   * GET /api/stock-batch/expired
   */
  getExpired(): Observable<StockBatch[]> {
    return this.http.get<StockBatch[]>(
      `${this.API_URL}/expired`,
      { withCredentials: true }
    );
  }

  /**
   * Obtiene todos los lotes de un ItemStock específico
   * GET /api/stock-batch/item-stock/{itemStockId}
   */
  getByItemStock(itemStockId: number): Observable<StockBatch[]> {
    return this.http.get<StockBatch[]>(
      `${this.API_URL}/item-stock/${itemStockId}`,
      { withCredentials: true }
    );
  }

  /**
   * Obtiene el próximo lote a expirar de un ItemStock (FIFO)
   * GET /api/stock-batch/item-stock/{itemStockId}/next-to-expire
   */
  getNextToExpire(itemStockId: number): Observable<StockBatch> {
    return this.http.get<StockBatch>(
      `${this.API_URL}/item-stock/${itemStockId}/next-to-expire`,
      { withCredentials: true }
    );
  }

  /**
   * Consume stock usando FIFO automático
   * PUT /api/stock-batch/item-stock/{itemStockId}/decrease?quantity=50
   */
  decreaseStock(itemStockId: number, quantity: number): Observable<StockBatch> {
    const params = new HttpParams().set('quantity', quantity.toString());
    return this.http.put<StockBatch>(
      `${this.API_URL}/item-stock/${itemStockId}/decrease`,
      null,
      { withCredentials: true, params }
    );
  }

  /**
   * Helpers para clasificar estados
   */
  isExpired(batch: StockBatch): boolean {
    return batch.status === 'EXPIRADO';
  }

  isCloseToExpire(batch: StockBatch): boolean {
    return batch.status === 'PROXIMO_A_EXPIRAR';
  }

  isHealthy(batch: StockBatch): boolean {
    return batch.status === 'VIGENTE';
  }

  isOutOfStock(batch: StockBatch): boolean {
    return batch.status === 'AGOTADO';
  }

  /**
   * Obtiene el color de estado para UI
   */
  getStatusColor(status: StockBatchStatus): string {
    switch (status) {
      case 'VIGENTE': return '#2E7D32';        // Verde
      case 'PROXIMO_A_EXPIRAR': return '#F57C00'; // Naranja
      case 'EXPIRADO': return '#C62828';       // Rojo
      case 'AGOTADO': return '#757575';        // Gris
      default: return '#666666';
    }
  }

  /**
   * Obtiene el texto legible del estado
   */
  getStatusText(status: StockBatchStatus): string {
    switch (status) {
      case 'VIGENTE': return this.i18n.translate('inventory.batchStatus.vigente');
      case 'PROXIMO_A_EXPIRAR': return this.i18n.translate('inventory.batchStatus.proximoExpirar');
      case 'EXPIRADO': return this.i18n.translate('inventory.batchStatus.expirado');
      case 'AGOTADO': return this.i18n.translate('inventory.batchStatus.agotado');
      default: return status;
    }
  }
}

