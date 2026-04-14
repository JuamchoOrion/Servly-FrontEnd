import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { TableService } from '../../core/services/table.service';
import { AuthService } from '../../core/services/auth.service';
import {
  RestaurantTableDTO,
  CreateRestaurantTableRequest,
  TableStatus,
  TableFormData
} from '../../core/dtos/table.dto';

@Component({
  selector: 'app-tables',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './tables.component.html',
  styleUrls: ['./tables.component.scss']
})
export class TablesComponent implements OnInit, OnDestroy {
  tables: RestaurantTableDTO[] = [];
  filteredTables: RestaurantTableDTO[] = [];
  isLoading = true;
  isAdmin = false;
  isStaff = false;

  // Filter
  filterStatus: TableStatus | 'ALL' = 'ALL';
  filterLocation: string = 'ALL';
  uniqueLocations: string[] = [];

  // Form
  showCreateForm = false;
  editingTable: RestaurantTableDTO | null = null;
  formData: TableFormData = {
    tableNumber: null,
    capacity: null,
    location: ''
  };
  formError: string = '';

  // Status update
  statusUpdateTable: RestaurantTableDTO | null = null;

  // Delete confirmation
  deleteConfirmTable: RestaurantTableDTO | null = null;

  // Status options
  tableStatusOptions = [
    { value: TableStatus.AVAILABLE, label: 'Disponible', icon: 'check_circle', color: 'green' },
    { value: TableStatus.OCCUPIED, label: 'Ocupada', icon: 'people', color: 'red' },
    { value: TableStatus.RESERVED, label: 'Reservada', icon: 'event', color: 'orange' },
    { value: TableStatus.MAINTENANCE, label: 'Mantenimiento', icon: 'build', color: 'gray' }
  ];

  private tablesSubscription?: Subscription;
  private authSubscription?: Subscription;

  constructor(
    private tableService: TableService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.authSubscription = this.authService.currentUser$.subscribe(user => {
      this.isAdmin = user?.roles?.includes('ADMIN') ?? false;
      this.isStaff = user?.roles?.includes('STAFF') ?? false;
      this.cdr.detectChanges();
    });

    // Subscribe to tables cache
    this.tablesSubscription = this.tableService.tables$.subscribe(tables => {
      this.tables = tables;
      this.filteredTables = [...tables];
      this.uniqueLocations = [...new Set(tables.map(t => t.location))].sort();
      this.isLoading = false;
      this.cdr.detectChanges();
    });

    // Explicitly load tables
    this.loadTables();
  }

  loadTables(): void {
    this.isLoading = true;
    this.tableService.getAllTables().subscribe({
      next: (tables) => {
        this.tables = tables;
        this.filteredTables = [...tables];
        this.uniqueLocations = [...new Set(tables.map(t => t.location))].sort();
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading tables:', err);
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  ngOnDestroy(): void {
    this.tablesSubscription?.unsubscribe();
    this.authSubscription?.unsubscribe();
  }

  // ========== FILTERS ==========

  applyFilters(): void {
    this.filteredTables = this.tables.filter(table => {
      const statusMatch = this.filterStatus === 'ALL' || table.status === this.filterStatus;
      const locationMatch = this.filterLocation === 'ALL' || table.location === this.filterLocation;
      return statusMatch && locationMatch;
    });
  }

  resetFilters(): void {
    this.filterStatus = 'ALL';
    this.filterLocation = 'ALL';
    this.filteredTables = this.tables;
  }

  // ========== CREATE ==========

  openCreateForm(): void {
    this.showCreateForm = true;
    this.editingTable = null;
    this.formData = { tableNumber: null, capacity: null, location: '' };
    this.formError = '';
  }

  closeCreateForm(): void {
    this.showCreateForm = false;
    this.formData = { tableNumber: null, capacity: null, location: '' };
    this.formError = '';
    this.cdr.detectChanges();
  }

  createTable(): void {
    if (!this.validateForm()) return;

    const request: CreateRestaurantTableRequest = {
      tableNumber: this.formData.tableNumber!,
      capacity: this.formData.capacity!,
      location: this.formData.location
    };

    this.tableService.createTable(request).subscribe({
      next: () => {
        this.closeCreateForm();
        this.loadTables();
      },
      error: (err) => {
        this.formError = err?.error?.message || 'Error al crear la mesa';
        this.cdr.detectChanges();
      }
    });
  }

  // ========== UPDATE STATUS ==========

  openStatusUpdate(table: RestaurantTableDTO): void {
    this.statusUpdateTable = table;
    this.cdr.detectChanges();
  }

  closeStatusUpdate(): void {
    this.statusUpdateTable = null;
    this.cdr.detectChanges();
  }

  updateStatus(status: TableStatus): void {
    if (!this.statusUpdateTable) return;

    const tableNumber = this.statusUpdateTable.table_number;
    this.statusUpdateTable = null;
    this.cdr.detectChanges();

    this.tableService.updateTableStatus(tableNumber, status).subscribe({
      next: () => {
        this.loadTables();
      },
      error: (err) => {
        console.error('Error updating status:', err);
      }
    });
  }

  // ========== DELETE ==========

  openDeleteConfirm(table: RestaurantTableDTO): void {
    this.deleteConfirmTable = table;
    this.cdr.detectChanges();
  }

  closeDeleteConfirm(): void {
    this.deleteConfirmTable = null;
    this.cdr.detectChanges();
  }

  deleteTable(): void {
    if (!this.deleteConfirmTable) return;

    const tableNumber = this.deleteConfirmTable.table_number;
    this.deleteConfirmTable = null;
    this.cdr.detectChanges();

    this.tableService.deleteTable(tableNumber).subscribe({
      next: () => {
        this.loadTables();
      },
      error: (err) => {
        console.error('Error deleting table:', err);
      }
    });
  }

  // ========== HELPERS ==========

  private validateForm(): boolean {
    if (!this.formData.tableNumber || this.formData.tableNumber < 1) {
      this.formError = 'Número de mesa inválido';
      return false;
    }
    if (!this.formData.capacity || this.formData.capacity < 1) {
      this.formError = 'Capacidad inválida';
      return false;
    }
    if (!this.formData.location.trim()) {
      this.formError = 'Ubicación requerida';
      return false;
    }
    this.formError = '';
    return true;
  }

  getStatusInfo(status: TableStatus): { label: string; icon: string; color: string } {
    return this.tableStatusOptions.find(opt => opt.value === status) ||
           { label: status, icon: 'help', color: 'gray' };
  }

  trackByTableNumber(index: number, table: RestaurantTableDTO): number {
    return table.table_number;
  }
}
