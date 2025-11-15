import { Component, OnInit, OnDestroy, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';

// PrimeNG imports
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/dropdown';
import { CalendarModule } from 'primeng/calendar';
import { TagModule } from 'primeng/tag';
import { PaginatorModule } from 'primeng/paginator';
import { SkeletonModule } from 'primeng/skeleton';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';

// Services
import { SupabaseService } from '../../../service/supabase.service';
import { MasterDataService } from '../../services/master-data.service';

export interface Transaction {
  id: string;
  name: string;
  amount: number;
  date: string;
  description?: string;
  account_name?: string;
  category?: {
    name: string;
  };
  import_method?: string;
  bill_id?: string;
}

@Component({
  selector: 'app-recent-transactions-table',
  standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        TableModule,
        ButtonModule,
        InputTextModule,
        DropdownModule,
        CalendarModule,
        TagModule,
        PaginatorModule,
        SkeletonModule,
        ToastModule
    ],
  providers: [MessageService],
  templateUrl: './recent-transactions-table.component.html',
  styleUrls: ['./recent-transactions-table.component.scss']
})
export class RecentTransactionsTableComponent implements OnInit, OnDestroy {
  @Output() loadingChange = new EventEmitter<boolean>();

  private destroy$ = new Subject<void>();
  
  transactions: Transaction[] = [];
  filteredTransactions: Transaction[] = [];
  loading = true;
  
  // Pagination
  first = 0;
  rows = 10;
  totalRecords = 0;
  
  // Filters
  filters = {
    search: '',
    account: null,
    category: null,
    dateRange: null,
    importMethod: null
  };
  
  // Filter options
  accountOptions: any[] = [];
  categoryOptions: any[] = [];
  importMethodOptions = [
    { label: 'All Methods', value: null },
    { label: 'Plaid', value: 'plaid' },
    { label: 'CSV Import', value: 'csv' },
    { label: 'Manual', value: 'manual' }
  ];

  constructor(
    private supabaseService: SupabaseService,
    private masterDataService: MasterDataService,
    private messageService: MessageService
  ) {}

  ngOnInit() {
    this.loadTransactions();
    this.loadFilterOptions();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  async loadTransactions() {
    try {
      this.loading = true;
      this.loadingChange.emit(true);

      const userId = await this.supabaseService.getCurrentUserId();
      
      const { data, error } = await this.supabaseService.getClient()
        .from('hb_transactions')
        .select(`
          id,
          name,
          amount,
          date,
          description,
          account_name,
          import_method,
          bill_id,
          category:category_id (
            name
          )
        `)
        .eq('user_id', userId)
        .order('date', { ascending: false })
        .limit(100); // Load recent 100 transactions for dashboard

      if (error) throw error;

      this.transactions = (data || []).map((tx: any) => ({
        ...tx,
        category: tx.category || { name: 'Uncategorized' }
      }));
      this.applyFilters();

    } catch (error) {
      console.error('Error loading transactions:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to load transactions'
      });
    } finally {
      this.loading = false;
      this.loadingChange.emit(false);
    }
  }

  private async loadFilterOptions() {
    try {
      // Load unique accounts
      const uniqueAccounts = [...new Set(this.transactions.map(t => t.account_name).filter(Boolean))];
      this.accountOptions = [
        { label: 'All Accounts', value: null },
        ...uniqueAccounts.map(account => ({ label: account, value: account }))
      ];

      // Load categories from unique transaction categories
      const uniqueCategories = [...new Set(this.transactions.map(t => t.category?.name).filter(Boolean))];
      this.categoryOptions = [
        { label: 'All Categories', value: null },
        ...uniqueCategories.map(category => ({ label: category, value: category }))
      ];

    } catch (error) {
      console.error('Error loading filter options:', error);
    }
  }

  applyFilters() {
    let filtered = [...this.transactions];

    // Search filter
    if (this.filters.search) {
      const searchTerm = this.filters.search.toLowerCase();
      filtered = filtered.filter(transaction =>
        transaction.name.toLowerCase().includes(searchTerm) ||
        (transaction.description && transaction.description.toLowerCase().includes(searchTerm)) ||
        (transaction.category && transaction.category.name.toLowerCase().includes(searchTerm))
      );
    }

    // Account filter
    if (this.filters.account) {
      filtered = filtered.filter(transaction => transaction.account_name === this.filters.account);
    }

    // Category filter
    if (this.filters.category) {
      filtered = filtered.filter(transaction => transaction.category?.name === this.filters.category);
    }

    // Date range filter
    if (this.filters.dateRange && this.filters.dateRange[0] && this.filters.dateRange[1]) {
      const startDate = new Date(this.filters.dateRange[0]);
      const endDate = new Date(this.filters.dateRange[1]);
      filtered = filtered.filter(transaction => {
        const transactionDate = new Date(transaction.date);
        return transactionDate >= startDate && transactionDate <= endDate;
      });
    }

    // Import method filter
    if (this.filters.importMethod) {
      filtered = filtered.filter(transaction => transaction.import_method === this.filters.importMethod);
    }

    this.filteredTransactions = filtered;
    this.totalRecords = filtered.length;
    this.first = 0; // Reset pagination
  }

  onPageChange(event: any) {
    this.first = event.first;
    this.rows = event.rows;
  }

  clearFilters() {
    this.filters = {
      search: '',
      account: null,
      category: null,
      dateRange: null,
      importMethod: null
    };
    this.applyFilters();
  }

  getAmountColor(amount: number): string {
    return amount < 0 ? 'text-red-600' : 'text-green-600';
  }

  getImportMethodIcon(importMethod: string): string {
    switch (importMethod?.toLowerCase()) {
      case 'plaid':
        return 'pi pi-credit-card text-blue-600';
      case 'csv':
        return 'pi pi-file text-gray-600';
      case 'manual':
        return 'pi pi-pencil text-green-600';
      default:
        return 'pi pi-question-circle text-gray-400';
    }
  }

  getReconStatus(transaction: Transaction): { status: string; severity: 'success' | 'info' | 'warning' | 'danger' | 'secondary' | 'contrast' | undefined } {
    if (transaction.bill_id) {
      return { status: 'Matched', severity: 'success' };
    }
    return { status: 'Unmatched', severity: 'warning' };
  }

  editTransaction(transaction: Transaction) {
    // TODO: Implement edit transaction functionality
    this.messageService.add({
      severity: 'info',
      summary: 'Edit Transaction',
      detail: `Editing transaction: ${transaction.name}`
    });
  }

  reconcileTransaction(transaction: Transaction) {
    // TODO: Implement reconcile transaction functionality
    this.messageService.add({
      severity: 'info',
      summary: 'Reconcile Transaction',
      detail: `Reconciling transaction: ${transaction.name}`
    });
  }

  viewTransactionDetails(transaction: Transaction) {
    // TODO: Implement view transaction details functionality
    this.messageService.add({
      severity: 'info',
      summary: 'Transaction Details',
      detail: `Viewing details for: ${transaction.name}`
    });
  }

  getPaginatedTransactions(): Transaction[] {
    const start = this.first;
    const end = start + this.rows;
    return this.filteredTransactions.slice(start, end);
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  get expenseCount(): number {
    return this.filteredTransactions.filter(t => t.amount < 0).length;
  }

  get incomeCount(): number {
    return this.filteredTransactions.filter(t => t.amount > 0).length;
  }

  get reconciledCount(): number {
    return this.filteredTransactions.filter(t => t.bill_id).length;
  }
}
