import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { SupabaseService } from '../service/supabase.service';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/dropdown';
import { CalendarModule } from 'primeng/calendar';
import { ToolbarModule } from 'primeng/toolbar';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ProgressBarModule } from 'primeng/progressbar';
import { MenuModule } from 'primeng/menu';
import { TooltipModule } from 'primeng/tooltip';
import { finalize, interval, take } from 'rxjs';

@Component({
    selector: 'app-transactions',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        RouterModule,
        ButtonModule,
        CardModule,
        TableModule,
        TagModule,
        InputTextModule,
        DropdownModule,
        CalendarModule,
        ToolbarModule,
        ProgressSpinnerModule,
        ProgressBarModule,
        MenuModule,
        TooltipModule
    ],
    providers: [MessageService],
    template: `
        <div class="card">
            <div class="flex justify-between items-center mb-4">
                <h1>Transactions</h1>
                <div class="flex gap-3">
                    <p-button 
                        icon="pi pi-chart-line" 
                        label="Reconciliation & Insights"
                        routerLink="/pages/reconciliation"
                        severity="info"
                        [outlined]="true">
                    </p-button>
                    <p-button 
                        icon="pi pi-bars" 
                        (onClick)="toggleMenu($event)"
                        severity="secondary"
                        [outlined]="true"
                        aria-label="Menu">
                    </p-button>
                </div>
            </div>
            
            <p-menu 
                #menu 
                [popup]="true" 
                [model]="menuItems"
                appendTo="body">
            </p-menu>
            <p-progressBar *ngIf="uploading" mode="indeterminate" [style]="{ height: '6px' }"></p-progressBar>

            <!-- Stats Cards -->
            <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6" *ngIf="transactionStats">
                <div class="p-4 rounded-lg border border-blue-200">
                    <div class="text-center">
                        <div class="text-2xl font-bold text-blue-600">{{ transactionStats.total_transactions }}</div>
                        <div class="text-sm text-blue-500">Total Transactions</div>
                    </div>
                </div>
                <div class="p-4 rounded-lg border border-green-200">
                    <div class="text-center">
                        <div class="text-2xl font-bold text-green-600">{{ transactionStats.total_spent | currency }}</div>
                        <div class="text-sm text-green-500">Total Spent</div>
                    </div>
                </div>
                <div class="p-4 rounded-lg border border-purple-200">
                    <div class="text-center">
                        <div class="text-2xl font-bold text-purple-600">{{ transactionStats.unique_accounts }}</div>
                        <div class="text-sm text-purple-500">Accounts</div>
                    </div>
                </div>
                <div class="p-4 rounded-lg border border-orange-200">
                    <div class="text-center">
                        <div class="text-2xl font-bold text-orange-600">{{ transactionStats.pending_count }}</div>
                        <div class="text-sm text-orange-500">Pending</div>
                    </div>
                </div>
            </div>

            <!-- Filters -->
            <div class="card mb-4">
                <div class="flex flex-wrap items-end gap-8">
                    <div class="flex-1 min-w-[200px]">
                        <label class="block text-sm font-medium mb-2">Search</label>
                        <input 
                            pInputText 
                            [(ngModel)]="filters.search" 
                            placeholder="Search transactions..."
                            (input)="applyFilters()"
                            class="w-full" />
                    </div>
                    <div class="flex-1 min-w-[180px]">
                        <label class="block text-sm font-medium mb-2">Account</label>
                        <p-dropdown 
                            [options]="accountOptions" 
                            [(ngModel)]="filters.account"
                            placeholder="All Accounts"
                            (onChange)="applyFilters()"
                            optionLabel="name"
                            optionValue="account_id"
                            [showClear]="true"
                            class="w-full">
                        </p-dropdown>
                    </div>
                    <div class="flex-1 min-w-[220px]">
                        <label class="block text-sm font-medium mb-2">Date Range</label>
                        <div class="flex gap-2">
                            <p-calendar 
                                [(ngModel)]="filters.dateRange"
                                selectionMode="range"
                                placeholder="Select date range"
                                (onSelect)="applyFilters()"
                                [showIcon]="true"
                                class="flex-1"
                                [style]="{'width':'100%'}" class="w-full">
                            </p-calendar>
                        </div>
                    </div>
                    <div class="flex-1 min-w-[150px]">
                        <label class="block text-sm font-medium mb-2">Status</label>
                        <p-dropdown 
                            [options]="statusOptions" 
                            [(ngModel)]="filters.status"
                            placeholder="All Status"
                            (onChange)="applyFilters()"
                            [showClear]="true"
                            class="w-full">
                        </p-dropdown>
                    </div>
                    <div class="flex-1 min-w-[150px]">
                        <label class="block text-sm font-medium mb-2">Source</label>
                        <p-dropdown 
                            [options]="importMethodOptions" 
                            [(ngModel)]="filters.importMethod"
                            placeholder="All Sources"
                            (onChange)="applyFilters()"
                            optionLabel="label"
                            optionValue="value"
                            class="w-full">
                        </p-dropdown>
                    </div>
                </div>
            </div>

            <!-- Transactions Table -->
            <div class="card">
                <p-table 
                    [value]="filteredTransactions" 
                    [paginator]="true" 
                    [rows]="20"
                    [globalFilterFields]="['name', 'category']"
                    [tableStyle]="{ 'min-width': '75rem' }"
                    [rowHover]="true"
                    currentPageReportTemplate="Showing {first} to {last} of {totalRecords} transactions"
                    [showCurrentPageReport]="true"
                    [rowsPerPageOptions]="[10, 20, 50, 100]">
                    
                    <ng-template pTemplate="header">
                        <tr>
                            <th pSortableColumn="date">Date <p-sortIcon field="date"></p-sortIcon></th>
                            <th pSortableColumn="name">Name <p-sortIcon field="name"></p-sortIcon></th>
                            <th pSortableColumn="amount">Amount <p-sortIcon field="amount"></p-sortIcon></th>
                            <th>Category</th>
                            <th>Bank</th>
                            <th>Source</th>
                            <th>Status</th>
                        </tr>
                    </ng-template>
                    
                    <ng-template pTemplate="body" let-transaction>
                        <tr>
                            <td>{{ transaction.date | date:'MMM dd, yyyy' }}</td>
                            <td>{{ transaction.name }}</td>
                            <td>
                                <span class="font-bold" 
                                      [class.text-red-600]="transaction.amount < 0" 
                                      [class.text-green-600]="transaction.amount > 0">
                                    {{ transaction.amount | currency:transaction.iso_currency_code }}
                                </span>
                            </td>
                            <td>
                                <span *ngIf="transaction.category?.name" class="text-sm text-gray-600">
                                    {{ transaction.category.name }}
                                </span>
                                <span *ngIf="!transaction.category?.name" class="text-sm text-gray-400">-</span>
                            </td>
                            <td>
                                <ng-container *ngIf="getBankLogo(transaction.account_id); else accountNameText">
                                    <img [src]="getBankLogo(transaction.account_id)" 
                                         alt="Bank Logo" 
                                         class="w-6 h-6 object-cover rounded-full border border-gray-200" 
                                         [title]="getAccountName(transaction.account_id)"
                                         [pTooltip]="getAccountName(transaction.account_id)"
                                         tooltipPosition="top">
                                </ng-container>
                                <ng-template #accountNameText>
                                    <span class="text-sm text-gray-600">{{ getAccountName(transaction.account_id) }}</span>
                                </ng-template>
                            </td>
                            <td>
                                <ng-container *ngIf="getImportMethodIcon(transaction.import_method); else importMethodText">
                                    <img [src]="getImportMethodIcon(transaction.import_method)" 
                                         alt="Import Method" 
                                         class="w-6 h-6 object-cover rounded-full border border-gray-200" 
                                         [title]="transaction.import_method + (transaction.bank_source ? ' - ' + transaction.bank_source : '')"
                                         [pTooltip]="transaction.import_method + (transaction.bank_source ? ' - ' + transaction.bank_source : '')"
                                         tooltipPosition="top">
                                </ng-container>
                                <ng-template #importMethodText>
                                    <div class="flex flex-col">
                                        <span class="text-xs font-medium">{{ transaction.import_method || 'unknown' }}</span>
                                        <span class="text-xs text-gray-500">{{ transaction.bank_source || '-' }}</span>
                                    </div>
                                </ng-template>
                            </td>
                            <td>
                                <p-tag 
                                    [value]="transaction.pending ? 'Pending' : 'Posted'" 
                                    [severity]="transaction.pending ? 'warning' : 'success'">
                                </p-tag>
                            </td>
                        </tr>
                    </ng-template>
                    
                    <ng-template pTemplate="emptymessage">
                        <tr>
                            <td colspan="7" class="text-center py-8">
                                <div *ngIf="loading" class="flex justify-center">
                                    <p-progressSpinner></p-progressSpinner>
                                </div>
                                <div *ngIf="!loading" class="text-gray-500">
                                    <i class="pi pi-inbox text-4xl mb-4"></i>
                                    <p>No transactions found</p>
                                    <p class="text-sm">Try linking a bank account in Settings to import transactions</p>
                                </div>
                            </td>
                        </tr>
                    </ng-template>
                </p-table>
            </div>
        </div>
    `,
    styles: [`
        .card {
            padding: 1.5rem;
            border-radius: 0.5rem;
            box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
        }
        
        h1 {
            font-size: 2rem;
            font-weight: bold;
        }
        
        .text-2xl {
            font-size: 1.5rem;
        }
        
        .text-sm {
            font-size: 0.875rem;
        }
    `]
})
export class TransactionsComponent implements OnInit {
    transactions: any[] = [];
    filteredTransactions: any[] = [];
    linkedAccounts: any[] = [];
    loading = false;
    transactionStats: any = null;
    progress: number = 0;
    uploading: boolean = false;
    uploadedFiles: any[] = [];
    menuItems: any[] = [];
    
    @ViewChild('menu') menu!: any;
    
    filters = {
        search: '',
        account: null,
        dateRange: null,
        status: null,
        importMethod: null
    };
    
    accountOptions: any[] = [];
    statusOptions = [
        { label: 'Posted', value: false },
        { label: 'Pending', value: true }
    ];
    importMethodOptions = [
        { label: 'All Sources', value: null },
        { label: 'Plaid', value: 'plaid' },
        { label: 'CSV Import', value: 'csv' },
        { label: 'Manual', value: 'manual' }
    ];

    constructor(
        private supabaseService: SupabaseService,
        private messageService: MessageService
    ) {}

    async ngOnInit() {
        await this.loadPlaidData();
        this.setupMenuItems();
    }

    async loadTransactions() {
        this.loading = true;
        
        try {
            await this.loadPlaidData();
        } catch (error) {
            console.error('Error loading transactions:', error);
            this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Failed to load transactions'
            });
        } finally {
            this.loading = false;
        }
    }

    private async loadPlaidData() {
        try {
            // Get user ID
            const userId = await this.supabaseService.getCurrentUserId();
            
            // Load accounts from hb_plaid_accounts
            const { data: plaidAccountsData, error: plaidAccountsError } = await this.supabaseService.getClient()
                .from('hb_plaid_accounts')
                .select('*')
                .eq('user_id', userId);
            
            if (plaidAccountsError) throw plaidAccountsError;
            
            // Load unique accounts from transactions (includes CSV imports)
            const { data: transactionsData, error: transactionsError } = await this.supabaseService.getClient()
                .from('hb_transactions')
                .select(`
                    *,
                    category:category_id(*)
                `)
                .eq('user_id', userId)
                .order('date', { ascending: false });
            
            if (transactionsError) throw transactionsError;
            
            // Combine Plaid accounts with unique accounts from transactions
            const plaidAccounts = plaidAccountsData || [];
            const transactionAccounts = transactionsData || [];
            
            // Create a map of unique accounts from transactions
            const uniqueTransactionAccounts = new Map();
            transactionAccounts.forEach(t => {
                if (t.account_id && t.account_name) {
                    uniqueTransactionAccounts.set(t.account_id, {
                        name: t.account_name,
                        account_id: t.account_id,
                        import_method: t.import_method
                    });
                }
            });
            
            // Combine accounts, prioritizing Plaid accounts
            const allAccounts = [...plaidAccounts];
            uniqueTransactionAccounts.forEach((account, accountId) => {
                const existingPlaidAccount = plaidAccounts.find(pa => pa.account_id === accountId);
                if (!existingPlaidAccount) {
                    allAccounts.push({
                        name: account.name,
                        account_id: account.account_id,
                        mask: 'CSV',
                        import_method: account.import_method
                    });
                }
            });
            
            this.linkedAccounts = allAccounts;
            this.accountOptions = this.linkedAccounts.map(account => ({
                name: `${account.name} (****${account.mask || 'CSV'})`,
                account_id: account.account_id
            }));
            
            this.transactions = transactionAccounts || [];
            this.filteredTransactions = [...this.transactions];
            this.calculateStats();
            this.applyFilters();
            
        } catch (error) {
            console.error('Error loading transaction data:', error);
            this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Failed to load transaction data'
            });
        }
    }

    clearDateRange() {
        this.filters.dateRange = null;
        this.applyFilters();
    }

    private calculateStats() {
        if (this.transactions.length === 0) {
            this.transactionStats = null;
            return;
        }

        const totalSpent = this.transactions
            .filter(t => t.amount < 0)
            .reduce((sum, t) => sum + Math.abs(t.amount), 0);
            
        const uniqueAccounts = new Set(this.transactions.map(t => t.account_id)).size;
        const pendingCount = this.transactions.filter(t => t.pending).length;

        this.transactionStats = {
            total_transactions: this.transactions.length,
            total_spent: totalSpent,
            unique_accounts: uniqueAccounts,
            pending_count: pendingCount
        };
    }

    applyFilters() {
        this.filteredTransactions = this.transactions.filter(transaction => {
            // Search filter
            if (this.filters.search) {
                const searchTerm = this.filters.search.toLowerCase();
                const matchesSearch = 
                    transaction.name.toLowerCase().includes(searchTerm) ||
                    (transaction.merchant_name && transaction.merchant_name.toLowerCase().includes(searchTerm)) ||
                    (transaction.description && transaction.description.toLowerCase().includes(searchTerm)) ||
                    (transaction.category && transaction.category.name && transaction.category.name.toLowerCase().includes(searchTerm));
                
                if (!matchesSearch) return false;
            }

            // Account filter
            if (this.filters.account && transaction.account_id !== this.filters.account) {
                return false;
            }

            // Date range filter
            if (this.filters.dateRange && this.filters.dateRange[0] && this.filters.dateRange[1]) {
                const transactionDate = new Date(transaction.date);
                const startDate = new Date(this.filters.dateRange[0]);
                const endDate = new Date(this.filters.dateRange[1]);
                
                if (transactionDate < startDate || transactionDate > endDate) {
                    return false;
                }
            }

            // Status filter
            if (this.filters.status !== null && transaction.pending !== this.filters.status) {
                return false;
            }

            // Import method filter
            if (this.filters.importMethod !== null && transaction.import_method !== this.filters.importMethod) {
                return false;
            }

            return true;
        });
    }

    getAccountName(accountId: string): string {
        const account = this.linkedAccounts.find(a => a.account_id === accountId);
        return account ? `${account.name} (****${account.mask})` : accountId;
    }

    getBankLogo(accountId: string): string {
        const accountName = this.getAccountName(accountId);
        const accountNameLower = accountName.toLowerCase();
        
        if (accountNameLower.includes('fidelity')) {
            return 'assets/images/fidelity.png';
        } else if (accountNameLower.includes('firsttech') || accountNameLower.includes('first tech')) {
            return 'assets/images/firsttech.png';
        } else if (accountNameLower.includes('us bank') || accountNameLower.includes('usbank')) {
            return 'assets/images/usbank.png';
        }
        
        // Return null for no logo instead of a non-existent default
        return '';
    }

    getImportMethodIcon(importMethod: string): string {
        const methodLower = importMethod?.toLowerCase();
        
        if (methodLower === 'csv') {
            return 'assets/images/csv.png';
        } else if (methodLower === 'plaid') {
            return 'assets/images/plaid.png';
        }
        
        // Return empty string for unknown methods
        return '';
    }

    setupMenuItems() {
        this.menuItems = [
            {
                label: 'Refresh Data',
                icon: 'pi pi-refresh',
                command: () => this.loadTransactions()
            },
            {
                separator: true
            },
            {
                label: 'Upload CSV/Excel',
                icon: 'pi pi-upload',
                command: () => this.triggerFileUpload()
            }
        ];
    }

    toggleMenu(event: Event) {
        this.menu.toggle(event);
    }

    triggerFileUpload() {
        // Create a hidden file input and trigger it
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.csv,.xlsx,.xls';
        fileInput.style.display = 'none';
        
        fileInput.onchange = (event: any) => {
            const file = event.target.files[0];
            if (file) {
                // Simulate the upload event
                const uploadEvent = {
                    files: [file]
                };
                this.onUpload(uploadEvent);
            }
        };
        
        document.body.appendChild(fileInput);
        fileInput.click();
        document.body.removeChild(fileInput);
    }

    onUpload(event: any) {
        this.uploading = true;
        this.progress = 0;

        // Simulate progress with interval
        interval(100)
            .pipe(
                // Will take 50 steps to reach 100%
                take(50),
                finalize(() => {
                    for (const file of event.files) {
                        this.uploadedFiles.push(file);

                        this.uploading = false;

                        this.messageService.add({ severity: 'info', summary: 'Success', detail: `File '${file.name}' uploaded successfully` });
                    }
                })
            )
            .subscribe(() => {
                this.progress += 2; // Increment by 2 to reach 100%
            });
    }
} 