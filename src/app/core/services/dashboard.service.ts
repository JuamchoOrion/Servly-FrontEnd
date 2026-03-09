import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, forkJoin, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../../enviroments/enviroment';
import { ItemResponse, PaginatedItemResponse } from './item.service';
import { ItemCategoryResponse } from '../dtos/category.dto';
import { StockBatch, StockBatchStatus } from './stock-batch.service';

export interface DashboardStats {
  totalItems: number;
  totalCategories: number;
  totalSuppliers: number;
  // Nuevas métricas basadas en StockBatch
  totalBatches: number;
  batchesCloseToExpire: number;
  batchesExpired: number;
  batchesHealthy: number;
  // Listas de lotes
  closeToExpireBatches: StockBatch[];
  expiredBatches: StockBatch[];
  // Estadísticas de categorías
  itemsByCategory: CategoryStats[];
  topCategories: CategoryStats[];
  // Actividad reciente
  recentActivity: ActivityItem[];
}

export interface CategoryStats {
  id: number;
  name: string;
  count: number;
  percentage: number;
}

/**
 * Alerta de expiración basada en StockBatch
 */
export interface BatchExpirationAlert {
  id: number;
  batchNumber: string;
  quantity: number;
  supplierName: string;
  expiryDate: string;
  daysUntilExpiry: number;
  status: StockBatchStatus;
}

export interface ActivityItem {
  id: string;
  type: 'item_created' | 'item_updated' | 'item_deleted' | 'category_created' | 'batch_expiring';
  description: string;
  timestamp: string;
  user: string;
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly API_URL = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getDashboardStats(): Observable<DashboardStats> {
    return forkJoin({
      items: this.getItemsPaginated(),
      categories: this.getCategories(),
      suppliers: this.getSuppliers().pipe(catchError(() => of([]))),
      closeToExpire: this.getCloseToExpireBatches().pipe(catchError(() => of([]))),
      expired: this.getExpiredBatches().pipe(catchError(() => of([])))
    }).pipe(
      map(({ items, categories, suppliers, closeToExpire, expired }) =>
        this.calculateStats(items.content, categories, suppliers, closeToExpire, expired)
      )
    );
  }

  private getItemsPaginated(): Observable<PaginatedItemResponse> {
    const params = new HttpParams()
      .set('page', '0')
      .set('size', '100')
      .set('sort', 'id,asc');

    return this.http.get<PaginatedItemResponse>(
      `${this.API_URL}/api/items/paginated`,
      { withCredentials: true, params }
    );
  }

  private getCategories(): Observable<ItemCategoryResponse[]> {
    return this.http.get<ItemCategoryResponse[]>(
      `${this.API_URL}/api/item-categories`,
      { withCredentials: true }
    );
  }

  private getSuppliers(): Observable<any[]> {
    return this.http.get<any[]>(
      `${this.API_URL}/api/staff/inventory/suppliers`,
      { withCredentials: true }
    );
  }

  /**
   * Obtiene lotes próximos a expirar (menos de 7 días)
   * GET /api/stock-batch/close-to-expire
   */
  private getCloseToExpireBatches(): Observable<StockBatch[]> {
    return this.http.get<StockBatch[]>(
      `${this.API_URL}/api/stock-batch/close-to-expire`,
      { withCredentials: true }
    );
  }

  /**
   * Obtiene lotes ya expirados
   * GET /api/stock-batch/expired
   */
  private getExpiredBatches(): Observable<StockBatch[]> {
    return this.http.get<StockBatch[]>(
      `${this.API_URL}/api/stock-batch/expired`,
      { withCredentials: true }
    );
  }

  private calculateStats(
    items: ItemResponse[],
    categories: ItemCategoryResponse[],
    suppliers: any[],
    closeToExpire: StockBatch[],
    expired: StockBatch[]
  ): DashboardStats {
    const categoryStats = this.calculateCategoryStats(items, categories);
    const recentActivity = this.generateRecentActivity(items, closeToExpire);

    // Calcular total de lotes (aproximación basada en datos disponibles)
    const totalBatches = closeToExpire.length + expired.length;
    const batchesHealthy = Math.max(0, items.length - closeToExpire.length - expired.length);

    return {
      totalItems: items.length,
      totalCategories: categories.filter(cat => cat.active).length,
      totalSuppliers: suppliers.length,
      // Métricas de StockBatch
      totalBatches: totalBatches,
      batchesCloseToExpire: closeToExpire.length,
      batchesExpired: expired.length,
      batchesHealthy: batchesHealthy,
      // Listas de lotes
      closeToExpireBatches: closeToExpire,
      expiredBatches: expired,
      // Estadísticas
      itemsByCategory: categoryStats,
      topCategories: categoryStats.slice(0, 8),
      recentActivity
    };
  }

  private calculateCategoryStats(
    items: ItemResponse[],
    categories: ItemCategoryResponse[]
  ): CategoryStats[] {
    const countByName = new Map<string, number>();

    items.forEach(item => {
      const key = item.category;
      countByName.set(key, (countByName.get(key) || 0) + 1);
    });

    const total = items.length;
    const activeCategories = categories.filter(cat => cat.active);

    const knownStats: CategoryStats[] = activeCategories.map(cat => ({
      id: cat.id,
      name: cat.name,
      count: countByName.get(cat.name) || 0,
      percentage: total > 0 ? ((countByName.get(cat.name) || 0) / total) * 100 : 0
    }));

    const knownNames = new Set(activeCategories.map(c => c.name));
    const orphanStats: CategoryStats[] = [];
    let orphanId = -1;

    countByName.forEach((count, name) => {
      if (!knownNames.has(name)) {
        orphanStats.push({
          id: orphanId--,
          name,
          count,
          percentage: total > 0 ? (count / total) * 100 : 0
        });
      }
    });

    return [...knownStats, ...orphanStats]
      .filter(s => s.count > 0)
      .sort((a, b) => b.count - a.count);
  }

  private generateRecentActivity(
    items: ItemResponse[],
    closeToExpire: StockBatch[]
  ): ActivityItem[] {
    const activities: ActivityItem[] = [];

    // Agregar alertas de lotes próximos a expirar como actividad
    closeToExpire.slice(0, 3).forEach((batch, index) => {
      activities.push({
        id: `batch_alert_${batch.id}_${index}`,
        type: 'batch_expiring',
        description: `Lote "${batch.batchNumber}" expira en ${batch.daysUntilExpiry} días`,
        timestamp: new Date().toISOString(),
        user: 'Sistema'
      });
    });

    // Agregar items actualizados recientemente
    items
      .filter(item => item.updatedAt)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 5 - activities.length)
      .forEach((item, index) => {
        activities.push({
          id: `activity_${item.id}_${index}`,
          type: 'item_updated',
          description: `Item "${item.name}" fue actualizado`,
          timestamp: item.updatedAt,
          user: 'Sistema'
        });
      });

    return activities;
  }
}
