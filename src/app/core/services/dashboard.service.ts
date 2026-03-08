import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../enviroments/enviroment';
import { ItemResponse } from './item.service';
import { ItemCategoryResponse } from '../dtos/category.dto';

export interface DashboardStats {
  totalItems: number;
  totalCategories: number;
  totalSuppliers: number;
  lowStockItems: number;
  itemsByCategory: CategoryStats[];
  expirationAlerts: ExpirationAlert[];
  recentActivity: ActivityItem[];
  topCategories: CategoryStats[];
}

export interface CategoryStats {
  id: number;
  name: string;
  count: number;
  percentage: number;
}

export interface ExpirationAlert {
  id: number;
  name: string;
  expirationDays: number;
  category: string;
  status: 'warning' | 'critical';
}

export interface ActivityItem {
  id: string;
  type: 'item_created' | 'item_updated' | 'item_deleted' | 'category_created';
  description: string;
  timestamp: string;
  user: string;
}

/**
 * Servicio para obtener estadísticas del dashboard
 */
@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly API_URL = environment.apiUrl;

  constructor(private http: HttpClient) {}

  /**
   * Obtener todas las estadísticas del dashboard
   */
  getDashboardStats(): Observable<DashboardStats> {
    return forkJoin({
      items: this.getItems(),
      categories: this.getCategories(),
      suppliers: this.getSuppliers()
    }).pipe(
      map(({ items, categories, suppliers }) => {
        const stats = this.calculateStats(items, categories, suppliers);
        return stats;
      })
    );
  }

  private getItems(): Observable<ItemResponse[]> {
    return this.http.get<ItemResponse[]>(
      `${this.API_URL}/api/items`,
      { withCredentials: true }
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
      `${this.API_URL}/api/suppliers`,
      { withCredentials: true }
    );
  }

  private calculateStats(items: ItemResponse[], categories: ItemCategoryResponse[], suppliers: any[]): DashboardStats {
    // Calcular estadísticas por categoría
    const categoryStats = this.calculateCategoryStats(items, categories);

    // Calcular alertas de expiración
    const expirationAlerts = this.calculateExpirationAlerts(items, categories);

    // Generar actividad reciente (mock data)
    const recentActivity = this.generateRecentActivity(items);

    return {
      totalItems: items.length,
      totalCategories: categories.filter(cat => cat.active).length,
      totalSuppliers: suppliers.length,
      lowStockItems: Math.floor(items.length * 0.15), // 15% como simulación
      itemsByCategory: categoryStats,
      expirationAlerts,
      recentActivity,
      topCategories: categoryStats.slice(0, 5)
    };
  }

  private calculateCategoryStats(items: ItemResponse[], categories: ItemCategoryResponse[]): CategoryStats[] {
    const categoryMap = new Map<string, number>();

    // Contar items por categoría
    items.forEach(item => {
      const count = categoryMap.get(item.category) || 0;
      categoryMap.set(item.category, count + 1);
    });

    // Convertir a estadísticas
    const total = items.length;
    return categories
      .filter(cat => cat.active)
      .map(category => ({
        id: category.id,
        name: category.name,
        count: categoryMap.get(category.id.toString()) || 0,
        percentage: total > 0 ? ((categoryMap.get(category.id.toString()) || 0) / total) * 100 : 0
      }))
      .sort((a, b) => b.count - a.count);
  }

  private calculateExpirationAlerts(items: ItemResponse[], categories: ItemCategoryResponse[]): ExpirationAlert[] {
    const categoryMap = new Map(categories.map(cat => [cat.id.toString(), cat.name]));

    return items
      .filter(item => item.expirationDays <= 30) // Items que expiran en 30 días o menos
      .map(item => ({
        id: item.id,
        name: item.name,
        expirationDays: item.expirationDays,
        category: categoryMap.get(item.category) || 'Sin categoría',
        status: item.expirationDays <= 7 ? 'critical' as const : 'warning' as const
      }))
      .sort((a, b) => a.expirationDays - b.expirationDays)
      .slice(0, 10); // Mostrar solo los primeros 10
  }

  private generateRecentActivity(items: ItemResponse[]): ActivityItem[] {
    // Generar actividad simulada basada en los items más recientes
    const recentItems = items
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 5);

    return recentItems.map((item, index) => ({
      id: `activity_${item.id}_${index}`,
      type: 'item_updated' as const,
      description: `Item "${item.name}" fue actualizado`,
      timestamp: item.updatedAt,
      user: 'Sistema'
    }));
  }
}
