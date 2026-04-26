import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { TableService } from '../../core/services/table.service';
import { AuthService } from '../../core/services/auth.service';
import { I18nService } from '../../core/services/i18n.service';
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

  // Status options - con labelKey para i18n
  tableStatusOptions = [
    { value: TableStatus.AVAILABLE, labelKey: 'tables.status.available', icon: 'check_circle', color: 'green' },
    { value: TableStatus.OCCUPIED, labelKey: 'tables.status.occupied', icon: 'people', color: 'red' },
    { value: TableStatus.RESERVED, labelKey: 'tables.status.reserved', icon: 'event', color: 'orange' },
    { value: TableStatus.MAINTENANCE, labelKey: 'tables.status.maintenance', icon: 'build', color: 'gray' }
  ];

  private tablesSubscription?: Subscription;
  private authSubscription?: Subscription;

  constructor(
    private tableService: TableService,
    private authService: AuthService,
    public i18n: I18nService,
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
        this.formError = this.i18n.translate('tables.error.loading');
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
    this.filteredTables = [...this.tables];
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
        const errorCode = err?.error?.code;
        if (errorCode === 'TABLE_DUPLICATE') {
          this.formError = this.i18n.translate('tables.error.duplicate');
        } else {
          this.formError = this.i18n.translate('tables.error.creating');
        }
        console.error('Error creating table:', err);
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
        this.formError = this.i18n.translate('tables.error.updating');
        this.cdr.detectChanges();
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
        this.formError = this.i18n.translate('tables.error.deleting');
        this.cdr.detectChanges();
      }
    });
  }

  // ========== HELPERS ==========

  private validateForm(): boolean {
    if (!this.formData.tableNumber || this.formData.tableNumber < 1) {
      this.formError = this.i18n.translate('tables.validation.tableNumberInvalid');
      return false;
    }
    if (!this.formData.capacity || this.formData.capacity < 1) {
      this.formError = this.i18n.translate('tables.validation.capacityInvalid');
      return false;
    }
    if (!this.formData.location.trim()) {
      this.formError = this.i18n.translate('tables.validation.locationRequired');
      return false;
    }
    this.formError = '';
    return true;
  }

  /**
   * Obtiene información del estado con traducción i18n
   */
  getStatusInfo(status: TableStatus): { label: string; icon: string; color: string } {
    const option = this.tableStatusOptions.find(opt => opt.value === status);
    return {
      label: this.i18n.translate(option?.labelKey || `tables.status.${status.toLowerCase()}`),
      icon: option?.icon || 'help',
      color: option?.color || 'gray'
    };
  }

  trackByTableNumber(index: number, table: RestaurantTableDTO): number {
    return table.table_number;
  }
}
