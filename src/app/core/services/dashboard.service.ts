import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, forkJoin, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../../enviroments/enviroment';
import { ItemResponse, PaginatedItemResponse } from './item.service';
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

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly API_URL = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getDashboardStats(): Observable<DashboardStats> {
    return forkJoin({
      items: this.getItemsPaginated(),
      categories: this.getCategories(),
      suppliers: this.getSuppliers().pipe(catchError(() => of([])))
    }).pipe(
      map(({ items, categories, suppliers }) =>
        this.calculateStats(items.content, categories, suppliers)
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

  private calculateStats(
    items: ItemResponse[],
    categories: ItemCategoryResponse[],
    suppliers: any[]
  ): DashboardStats {
    const categoryStats = this.calculateCategoryStats(items, categories);
    const expirationAlerts = this.calculateExpirationAlerts(items, categories);
    const recentActivity = this.generateRecentActivity(items);

    return {
      totalItems: items.length,
      totalCategories: categories.filter(cat => cat.active).length,
      totalSuppliers: suppliers.length,
      lowStockItems: Math.floor(items.length * 0.15),
      itemsByCategory: categoryStats,
      expirationAlerts,
      recentActivity,
      topCategories: categoryStats.slice(0, 8)
    };
  }

  private calculateCategoryStats(
    items: ItemResponse[],
    categories: ItemCategoryResponse[]
  ): CategoryStats[] {
    // ✅ FIX: item.category llega como string con el NOMBRE ("Bebidas", "Pollo"...)
    // no como ID numérico. Se construye el mapa con category.name como clave.
    const countByName = new Map<string, number>();

    items.forEach(item => {
      const key = item.category; // "Bebidas", "Pollo", etc.
      countByName.set(key, (countByName.get(key) || 0) + 1);
    });

    const total = items.length;
    const activeCategories = categories.filter(cat => cat.active);

    // Categorías conocidas en el backend
    const knownStats: CategoryStats[] = activeCategories.map(cat => ({
      id: cat.id,
      name: cat.name,
      count: countByName.get(cat.name) || 0,
      percentage: total > 0 ? ((countByName.get(cat.name) || 0) / total) * 100 : 0
    }));

    // También incluir categorías que existan en los items pero no en el backend
    // (datos inconsistentes / categorías borradas, etc.)
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
      .filter(s => s.count > 0)          // solo categorías con items
      .sort((a, b) => b.count - a.count);
  }

  private calculateExpirationAlerts(
    items: ItemResponse[],
    categories: ItemCategoryResponse[]
  ): ExpirationAlert[] {
    // item.category ya viene como nombre — no necesita lookup
    return items
      .filter(item => item.expirationDays <= 30)
      .map(item => ({
        id: item.id,
        name: item.name,
        expirationDays: item.expirationDays,
        category: item.category, // ✅ ya es el nombre legible
        status: item.expirationDays <= 7 ? 'critical' as const : 'warning' as const
      }))
      .sort((a, b) => a.expirationDays - b.expirationDays)
      .slice(0, 10);
  }

  private generateRecentActivity(items: ItemResponse[]): ActivityItem[] {
    return items
      .filter(item => item.updatedAt)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 5)
      .map((item, index) => ({
        id: `activity_${item.id}_${index}`,
        type: 'item_updated' as const,
        description: `Item "${item.name}" fue actualizado`,
        timestamp: item.updatedAt,
        user: 'Sistema'
      }));
  }
}
