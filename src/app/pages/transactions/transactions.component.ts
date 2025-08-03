import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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
import { finalize, interval, take } from 'rxjs';

@Component({
    selector: 'app-transactions',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
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
        MenuModule
    ],
    providers: [MessageService],
    template: `
        <div class="card">
            <div class="flex justify-between items-center mb-4">
                <h1>Transactions</h1>
                <p-button 
                    icon="pi pi-bars" 
                    (onClick)="toggleMenu($event)"
                    severity="secondary"
                    [outlined]="true"
                    aria-label="Menu">
                </p-button>
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
                <div class="p-4 rounded-lg bg-blue-50 border border-blue-200">
                    <div class="text-center">
                        <div class="text-2xl font-bold text-blue-600">{{ transactionStats.total_transactions }}</div>
                        <div class="text-sm text-blue-500">Total Transactions</div>
                    </div>
                </div>
                <div class="p-4 rounded-lg bg-green-50 border border-green-200">
                    <div class="text-center">
                        <div class="text-2xl font-bold text-green-600">{{ transactionStats.total_spent | currency }}</div>
                        <div class="text-sm text-green-500">Total Spent</div>
                    </div>
                </div>
                <div class="p-4 rounded-lg bg-purple-50 border border-purple-200">
                    <div class="text-center">
                        <div class="text-2xl font-bold text-purple-600">{{ transactionStats.unique_accounts }}</div>
                        <div class="text-sm text-purple-500">Accounts</div>
                    </div>
                </div>
                <div class="p-4 rounded-lg bg-orange-50 border border-orange-200">
                    <div class="text-center">
                        <div class="text-2xl font-bold text-orange-600">{{ transactionStats.pending_count }}</div>
                        <div class="text-sm text-orange-500">Pending</div>
                    </div>
                </div>
            </div>

            <!-- Filters -->
            <div class="card mb-4">
                <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                        <label class="block text-sm font-medium mb-2">Search</label>
                        <input 
                            pInputText 
                            [(ngModel)]="filters.search" 
                            placeholder="Search transactions..."
                            (input)="applyFilters()"
                            class="w-full" />
                    </div>
                    <div>
                        <label class="block text-sm font-medium mb-2">Account</label>
                        <p-dropdown 
                            [options]="accountOptions" 
                            [(ngModel)]="filters.account"
                            placeholder="All Accounts"
                            (onChange)="applyFilters()"
                            optionLabel="name"
                            optionValue="account_id"
                            [showClear]="true">
                        </p-dropdown>
                    </div>
                    <div>
                        <label class="block text-sm font-medium mb-2">Date Range</label>
                        <p-calendar 
                            [(ngModel)]="filters.dateRange"
                            selectionMode="range"
                            placeholder="Select date range"
                            (onSelect)="applyFilters()"
                            [showIcon]="true">
                        </p-calendar>
                    </div>
                    <div>
                        <label class="block text-sm font-medium mb-2">Status</label>
                        <p-dropdown 
                            [options]="statusOptions" 
                            [(ngModel)]="filters.status"
                            placeholder="All Status"
                            (onChange)="applyFilters()"
                            [showClear]="true">
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
                    [globalFilterFields]="['name', 'merchant_name', 'category']"
                    [tableStyle]="{ 'min-width': '75rem' }"
                    [rowHover]="true"
                    currentPageReportTemplate="Showing {first} to {last} of {totalRecords} transactions"
                    [showCurrentPageReport]="true"
                    [rowsPerPageOptions]="[10, 20, 50, 100]">
                    
                    <ng-template pTemplate="header">
                        <tr>
                            <th pSortableColumn="date">Date <p-sortIcon field="date"></p-sortIcon></th>
                            <th pSortableColumn="name">Name <p-sortIcon field="name"></p-sortIcon></th>
                            <th pSortableColumn="merchant_name">Merchant <p-sortIcon field="merchant_name"></p-sortIcon></th>
                            <th pSortableColumn="amount">Amount <p-sortIcon field="amount"></p-sortIcon></th>
                            <th>Category</th>
                            <th>Account</th>
                            <th>Status</th>
                        </tr>
                    </ng-template>
                    
                    <ng-template pTemplate="body" let-transaction>
                        <tr>
                            <td>{{ transaction.date | date:'MMM dd, yyyy' }}</td>
                            <td>{{ transaction.name }}</td>
                            <td>{{ transaction.merchant_name || '-' }}</td>
                            <td>
                                <span class="font-bold" 
                                      [class.text-red-600]="transaction.amount < 0" 
                                      [class.text-green-600]="transaction.amount > 0">
                                    {{ transaction.amount | currency:transaction.iso_currency_code }}
                                </span>
                            </td>
                            <td>
                                <span *ngIf="transaction.category?.length" class="text-sm text-gray-600">
                                    {{ transaction.category.join(' > ') }}
                                </span>
                                <span *ngIf="!transaction.category?.length" class="text-sm text-gray-400">-</span>
                            </td>
                            <td>
                                <span class="text-sm">{{ getAccountName(transaction.account_id) }}</span>
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
        status: null
    };
    
    accountOptions: any[] = [];
    statusOptions = [
        { label: 'Posted', value: false },
        { label: 'Pending', value: true }
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
            const { data, error } = await this.supabaseService.getClient().functions.invoke('get-plaid-data');
            
            if (error) throw error;
            
            // Load accounts
            this.linkedAccounts = data.accounts || [];
            this.accountOptions = this.linkedAccounts.map(account => ({
                name: `${account.name} (****${account.mask})`,
                account_id: account.account_id
            }));
            
            // Load transactions (we need to get them separately since get-plaid-data doesn't return full transaction data)
            const { data: transactionsData, error: transactionsError } = await this.supabaseService.getClient().functions.invoke('get-transactions');
            
            if (transactionsError) throw transactionsError;
            
            this.transactions = transactionsData.transactions || [];
            this.filteredTransactions = [...this.transactions];
            this.calculateStats();
            this.applyFilters();
            
        } catch (error) {
            console.error('Error loading Plaid data:', error);
        }
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
                    (transaction.category && transaction.category.some((cat: string) => cat.toLowerCase().includes(searchTerm)));
                
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

            return true;
        });
    }

    getAccountName(accountId: string): string {
        const account = this.linkedAccounts.find(a => a.account_id === accountId);
        return account ? `${account.name} (****${account.mask})` : accountId;
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