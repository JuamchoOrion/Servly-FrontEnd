import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { environment } from '../../../enviroments/enviroment';
import {
  RestaurantTableDTO,
  CreateRestaurantTableRequest,
  TableStatus,
  MessageResponse
} from '../dtos/table.dto';

@Injectable({ providedIn: 'root' })
export class TableService {
  private readonly API_URL = environment.apiUrl;

  private readonly ADMIN_TABLES_ENDPOINT = `${this.API_URL}/api/admin/tables`;

  // Cache para mesas
  private tablesSubject = new BehaviorSubject<RestaurantTableDTO[]>([]);
  tables$ = this.tablesSubject.asObservable();

  constructor(private http: HttpClient) {
    this.loadTables();
  }

  /**
   * Carga las mesas al inicializar el servicio
   */
  private loadTables(): void {
    this.getAllTables().subscribe();
  }

  /**
   * Obtiene todas las mesas (requiere autenticación ADMIN o STAFF)
   * GET /api/admin/tables
   */
  getAllTables(): Observable<RestaurantTableDTO[]> {
    return this.http.get<RestaurantTableDTO[]>(this.ADMIN_TABLES_ENDPOINT).pipe(
      tap(tables => {
        this.tablesSubject.next(tables);
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Obtiene una mesa por número (requiere autenticación ADMIN o STAFF)
   * GET /api/admin/tables/{tableNumber}
   */
  getTableByNumber(tableNumber: number): Observable<RestaurantTableDTO> {
    return this.http.get<RestaurantTableDTO>(`${this.ADMIN_TABLES_ENDPOINT}/${tableNumber}`).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Crea una nueva mesa (requiere autenticación ADMIN)
   * POST /api/admin/tables
   */
  createTable(request: CreateRestaurantTableRequest): Observable<RestaurantTableDTO> {
    return this.http.post<RestaurantTableDTO>(this.ADMIN_TABLES_ENDPOINT, request).pipe(
      tap(newTable => {
        const currentTables = this.tablesSubject.value;
        this.tablesSubject.next([...currentTables, newTable]);
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Actualiza el estado de una mesa (requiere autenticación ADMIN)
   * PATCH /api/admin/tables/{tableNumber}/status?status=NEW_STATUS
   */
  updateTableStatus(tableNumber: number, status: TableStatus): Observable<RestaurantTableDTO> {
    let params = new HttpParams().set('status', status);
    return this.http.patch<RestaurantTableDTO>(
      `${this.ADMIN_TABLES_ENDPOINT}/${tableNumber}/status`,
      {},
      { params }
    ).pipe(
      tap(updatedTable => {
        const current = this.tablesSubject.value;
        const index = current.findIndex(t => t.table_number === tableNumber);
        if (index !== -1) {
          current[index] = updatedTable;
          this.tablesSubject.next([...current]);
        }
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Elimina una mesa (requiere autenticación ADMIN)
   * DELETE /api/admin/tables/{tableNumber}
   */
  deleteTable(tableNumber: number): Observable<MessageResponse> {
    return this.http.delete<MessageResponse>(`${this.ADMIN_TABLES_ENDPOINT}/${tableNumber}`).pipe(
      tap(() => {
        const current = this.tablesSubject.value;
        this.tablesSubject.next(current.filter(t => t.table_number !== tableNumber));
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Obtiene mesas por estado
   */
  getTablesByStatus(status: TableStatus): Observable<RestaurantTableDTO[]> {
    return this.getAllTables().pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Maneja errores HTTP
   */
  private handleError(error: any) {
    console.error('Table Service Error:', error);
    return throwError(() => error);
  }
}
