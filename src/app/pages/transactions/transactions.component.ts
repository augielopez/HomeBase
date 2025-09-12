import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { SupabaseService } from '../service/supabase.service';
import {MessageService, SelectItem} from 'primeng/api';
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
import { DialogModule } from 'primeng/dialog';
import { ToastModule } from 'primeng/toast';
import { CheckboxModule } from 'primeng/checkbox';
import { finalize, interval, take } from 'rxjs';
import { CsvImportService } from '../service/csv-import.service';
import { ReconciliationService } from '../service/reconciliation.service';
import { AiCategorizationService } from '../service/ai-categorization.service';
import { Bill } from '../../interfaces/bill.interface';
import {MultiSelect} from "primeng/multiselect";

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
        TooltipModule,
        DialogModule,
        ToastModule,
        CheckboxModule,
        MultiSelect
    ],
    providers: [MessageService],
    template: `
        <div class="card">
            <div class="flex justify-between items-center mb-4">
                <h1>Transactions</h1>
                <div class="flex gap-3">
                    <p-button 
                        icon="pi pi-chart-line" 
                        label="Reconciliation"
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
            
            <!-- Selection Info -->
                <div class="p-4 rounded-lg border border-purple-200">
                    <div class="text-center">
                        <div class="text-2xl font-bold text-purple-600">{{ transactionStats.unique_accounts }}</div>
                        <div class="text-sm text-purple-500">Accounts</div>
                    </div>
                </div>
                <div class="p-4 rounded-lg border border-blue-200">
                    <div class="text-center">
                        <div class="text-2xl font-bold text-blue-600">{{ transactionStats.total_transactions }}</div>
                        <div class="text-sm text-blue-500">Total Transactions</div>
                    </div>
                </div>
                <div class="p-4 rounded-lg border border-green-200">
                    <div class="text-center">
                        <div class="text-2xl font-bold text-green-600">{{ transactionStats.total_income | currency }}</div>
                        <div class="text-sm text-green-500">Total Income</div>
                    </div>
                </div>
                <div class="p-4 rounded-lg border border-red-200">
                    <div class="text-center">
                        <div class="text-2xl font-bold text-red-600">{{ transactionStats.total_spent | currency }}</div>
                        <div class="text-sm text-red-500">Total Spent</div>
                    </div>
                </div>
            </div>

            <!-- Selection Info -->
            <div class="mb-4 p-3 border border-blue-200 rounded-lg" *ngIf="hasSelectedTransactions()">
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2">
                        <i class="pi pi-check-circle text-blue-600"></i>
                        <span class="text-blue-600 font-medium">
                            {{ getSelectedTransactions().length }} transaction(s) selected
                        </span>
                    </div>
                    <p-button 
                        label="Recategorize Selected" 
                        icon="pi pi-tags"
                        size="small"
                        severity="primary"
                        (onClick)="recategorizeSelected()">
                    </p-button>
                </div>
            </div>

            <!-- Filters -->
            <div class="card mb-4">
                <div class="flex flex-wrap items-end gap-8">
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
                    <div class="flex-1 min-w-[200px]">
                        <label class="block text-sm font-medium mb-2">Search</label>
                        <input 
                            pInputText 
                            [(ngModel)]="filters.search" 
                            placeholder="Search transactions..."
                            (input)="applyFilters()"
                            class="w-full" />
                    </div>
                </div>
            </div>

            <!-- Transactions Table -->
            <div class="card">
                <p-table 
                    [value]="filteredTransactions" 
                    [paginator]="true" 
                    [rows]="20"
                    [globalFilterFields]="['name', 'category', 'institution', 'account_name', 'source']"
                    [tableStyle]="{ 'min-width': '75rem' }"
                    [rowHover]="true"
                    currentPageReportTemplate="Showing {first} to {last} of {totalRecords} transactions"
                    [showCurrentPageReport]="true"
                    [rowsPerPageOptions]="[10, 20, 50, 100]">
                    
                    <ng-template pTemplate="header">
                        <tr>
                            <th>
                                <p-checkbox 
                                    [binary]="true" 
                                    [(ngModel)]="selectAll"
                                    (onChange)="toggleSelectAll($event)"
                                    [style]="{'width': '20px', 'height': '20px'}">
                                </p-checkbox>
                            </th>
                            <th pSortableColumn="date">Date <p-sortIcon field="date"></p-sortIcon></th>
                            <th pSortableColumn="name">Name <p-sortIcon field="name"></p-sortIcon></th>
                            <th pSortableColumn="amount">Amount <p-sortIcon field="amount"></p-sortIcon></th>
                            <!-- Category filter -->
                            <th>
                                <div class="flex justify-between items-center">
                                    Category
                                    <p-columnFilter
                                            field="category"
                                            matchMode="in"
                                            display="menu"
                                            [showMatchModes]="false"
                                            [showOperator]="false"
                                            [showAddButton]="false"
                                    >
                                        <ng-template #header>
                                            <div class="px-3 pt-3 pb-0"><span class="font-bold">Category</span></div>
                                        </ng-template>
                                        <ng-template #filter let-value let-filter="filterCallback">
                                            <p-multiselect
                                                    [ngModel]="value"
                                                    [options]="categoryOptions"
                                                    [optionLabel]="'label'"
                                                    [optionValue]="'value'"
                                                    placeholder="Any"
                                                    display="chip"
                                                    [showClear]="true"
                                                    (onChange)="filter($event.value)"
                                                    styleClass="w-64"
                                            ></p-multiselect>
                                        </ng-template>
                                    </p-columnFilter>
                                </div>
                            </th>

                            <!-- Financial Institution filter -->
                            <th>
                                <div class="flex justify-between items-center">
                                    Financial Institution
                                    <p-columnFilter
                                            field="institution"
                                            matchMode="in"
                                            display="menu"
                                            [showMatchModes]="false"
                                            [showOperator]="false"
                                            [showAddButton]="false"
                                    >
                                        <ng-template #header>
                                            <div class="px-3 pt-3 pb-0"><span class="font-bold">Institution</span></div>
                                        </ng-template>
                                        <ng-template #filter let-value let-filter="filterCallback">
                                            <p-multiselect
                                                    [ngModel]="value"
                                                    [options]="institutionOptions"
                                                    [optionLabel]="'label'"
                                                    [optionValue]="'value'"
                                                    placeholder="Any"
                                                    display="chip"
                                                    [showClear]="true"
                                                    (onChange)="filter($event.value)"
                                                    styleClass="w-64"
                                            ></p-multiselect>
                                        </ng-template>
                                    </p-columnFilter>
                                </div>
                            </th>

                            <!-- Account Name filter -->
                            <th>
                                <div class="flex justify-between items-center">
                                    Account Name
                                    <p-columnFilter
                                            field="account_name"
                                            matchMode="in"
                                            display="menu"
                                            [showMatchModes]="false"
                                            [showOperator]="false"
                                            [showAddButton]="false"
                                    >
                                        <ng-template #header>
                                            <div class="px-3 pt-3 pb-0"><span class="font-bold">Account</span></div>
                                        </ng-template>
                                        <ng-template #filter let-value let-filter="filterCallback">
                                            <p-multiselect
                                                    [ngModel]="value"
                                                    [options]="accountNameOptions"
                                                    [optionLabel]="'label'"
                                                    [optionValue]="'value'"
                                                    placeholder="Any"
                                                    display="chip"
                                                    [showClear]="true"
                                                    (onChange)="filter($event.value)"
                                                    styleClass="w-64"
                                            ></p-multiselect>
                                        </ng-template>
                                    </p-columnFilter>
                                </div>
                            </th>

                            <!-- Source filter -->
                            <th>
                                <div class="flex justify-between items-center">
                                    Source
                                    <p-columnFilter
                                            field="source"
                                            matchMode="in"
                                            display="menu"
                                            [showMatchModes]="false"
                                            [showOperator]="false"
                                            [showAddButton]="false"
                                    >
                                        <ng-template #header>
                                            <div class="px-3 pt-3 pb-0"><span class="font-bold">Source</span></div>
                                        </ng-template>
                                        <ng-template #filter let-value let-filter="filterCallback">
                                            <p-multiselect
                                                    [ngModel]="value"
                                                    [options]="sourceOptions"
                                                    [optionLabel]="'label'"
                                                    [optionValue]="'value'"
                                                    placeholder="Any"
                                                    display="chip"
                                                    [showClear]="true"
                                                    (onChange)="filter($event.value)"
                                                    styleClass="w-64"
                                            ></p-multiselect>
                                        </ng-template>
                                    </p-columnFilter>
                                </div>
                            </th>

                            <th>Action</th>
                        </tr>
                    </ng-template>
                    
                    <ng-template pTemplate="body" let-transaction>
                        <tr>
                            <td>
                                <p-checkbox 
                                    [binary]="true" 
                                    [(ngModel)]="transaction.selected"
                                    (onChange)="toggleTransactionSelection(transaction)"
                                    [style]="{'width': '20px', 'height': '20px'}">
                                </p-checkbox>
                            </td>
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
                                <span *ngIf="transaction.category?.name" class="text-sm">
                                    {{ transaction.category.name }}
                                </span>
                                <span *ngIf="!transaction.category?.name" class="text-sm">-</span>
                            </td>
                            <td class="p-0">
                                <ng-container *ngIf="getBankLogo(transaction.account_id); else accountNameText">
                                    <div class="flex items-center justify-center w-full h-full">
                                        <img
                                                [src]="getBankLogo(transaction.account_id)"
                                                alt="Bank Logo"
                                                class="w-6 h-6 object-cover rounded-full"
                                                [title]="getAccountName(transaction.account_id)"
                                                [pTooltip]="getAccountName(transaction.account_id)"
                                                tooltipPosition="top"
                                        />
                                    </div>
                                </ng-container>

                                <ng-template #accountNameText>
                                    <div class="flex items-center justify-center w-full h-full">
                                        <span class="text-sm text-gray-600">{{ getAccountName(transaction.account_id) }}</span>
                                    </div>
                                </ng-template>
                            </td>

                            <td>
                                <span class="text-sm">{{ getAccountSubName(transaction.account_id) || '-' }}</span>
                            </td>
                            <td class="p-0">
                                <ng-container *ngIf="getImportMethodIcon(transaction.import_method); else importMethodText">
                                    <div class="flex items-center justify-center w-full h-full">
                                        <img
                                                [src]="getImportMethodIcon(transaction.import_method)"
                                                alt="Import Method"
                                                class="w-6 h-6 object-cover rounded-full"
                                                [title]="transaction.import_method + (transaction.bank_source ? ' - ' + transaction.bank_source : '')"
                                                [pTooltip]="transaction.import_method + (transaction.bank_source ? ' - ' + transaction.bank_source : '')"
                                                tooltipPosition="top"
                                        />
                                    </div>
                                </ng-container>

                                <ng-template #importMethodText>
                                    <div class="flex items-center justify-center w-full h-full">
                                        <div class="flex flex-col items-center text-center leading-tight">
                                            <span class="text-xs font-medium">{{ transaction.import_method || 'unknown' }}</span>
                                            <span class="text-xs text-gray-500">{{ transaction.bank_source || '-' }}</span>
                                        </div>
                                    </div>
                                </ng-template>
                            </td>
                            <td>
                                <p-button 
                                    icon="pi pi-link" 
                                    size="small"
                                    severity="info"
                                    [outlined]="true"
                                    (onClick)="showManualMatchDialog(transaction); $event.stopPropagation()"
                                    pTooltip="Match to bill"
                                    type="button">
                                </p-button>
                            </td>
                        </tr>
                    </ng-template>
                    
                    <ng-template pTemplate="emptymessage">
                        <tr>
                            <td colspan="8" class="text-center py-8">
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
        <!-- CSV Upload Dialog -->
        <p-dialog 
            header="Import CSV Transactions" 
            [(visible)]="showCsvUpload" 
            [modal]="true" 
            [style]="{ width: '600px' }">
            <div class="space-y-4">
                <div class="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <input 
                        type="file" 
                        #fileInput
                        accept=".csv"
                        (change)="onFileSelected($event)"
                        class="hidden">
                    <div class="space-y-2">
                        <i class="pi pi-upload text-3xl text-gray-400"></i>
                        <p class="text-gray-600">Drop your CSV file here or click to browse</p>
                        <p-button 
                            label="Choose File" 
                            (onClick)="fileInput.click()"
                            [outlined]="true">
                        </p-button>
                    </div>
                </div>
                
                <div *ngIf="selectedFile" class="p-4 rounded-lg">
                    <div class="flex items-center justify-between">
                        <div>
                            <div class="font-medium">{{ selectedFile.name }}</div>
                            <div class="text-sm text-gray-500">{{ (selectedFile.size / 1024).toFixed(1) }} KB</div>
                        </div>
                        <p-button 
                            icon="pi pi-times" 
                            size="small"
                            severity="danger"
                            [outlined]="true"
                            (onClick)="selectedFile = null">
                        </p-button>
                    </div>
                </div>

                <div *ngIf="importing" class="text-center">
                    <p-progressSpinner></p-progressSpinner>
                    <p class="mt-2">Importing transactions...</p>
                </div>
            </div>
            
            <ng-template pTemplate="footer">
                <p-button 
                    label="Cancel" 
                    (onClick)="showCsvUpload = false"
                    [outlined]="true">
                </p-button>
                <p-button 
                    label="Import" 
                    (onClick)="importCsv()"
                    [disabled]="!selectedFile || importing"
                    [loading]="importing">
                </p-button>
            </ng-template>
        </p-dialog>

        <!-- Manual Match Dialog -->
        <p-dialog 
            header="Manual Match" 
            [(visible)]="showManualMatch" 
            [modal]="true" 
            [style]="{ width: '500px' }"
            appendTo="body">
            <div class="space-y-4" *ngIf="selectedItem">
                <div class="p-4 rounded-lg">
                    <h4 class="font-medium mb-2">Selected Transaction:</h4>
                    <div class="text-sm">
                        <div><strong>Description:</strong> {{ selectedItem.name }}</div>
                        <div><strong>Amount:</strong> {{ selectedItem.amount | currency:selectedItem.iso_currency_code }}</div>
                        <div><strong>Date:</strong> {{ selectedItem.date | date }}</div>
                    </div>
                </div>

                <div>
                    <label class="block text-sm font-medium mb-2">Select Bill to Match:</label>
                    <p-dropdown 
                        [options]="availableBills || []" 
                        [(ngModel)]="selectedBillId"
                        optionLabel="description"
                        optionValue="id"
                        placeholder="Choose a bill"
                        [showClear]="true"
                        appendTo="body">
                    </p-dropdown>
                </div>
            </div>
            
            <ng-template pTemplate="footer">
                <p-button 
                    label="Cancel" 
                    (onClick)="showManualMatch = false"
                    [outlined]="true">
                </p-button>
                <p-button 
                    label="Match" 
                    (onClick)="applyManualMatch()"
                    [disabled]="!selectedBillId">
                </p-button>
            </ng-template>
        </p-dialog>
        
        <p-toast></p-toast>
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
    showCsvUpload = false;
    selectedFile: File | null = null;
    importing = false;
    categoryOptions: SelectItem[] = [];
    institutionOptions: SelectItem[] = [];
    accountNameOptions: SelectItem[] = [];
    sourceOptions: SelectItem[] = [];


    // Manual match dialog properties
    showManualMatch = false;
    selectedItem: any = null;
    selectedBillId: string | null = null;
    availableBills: Bill[] = [];

    // Selection properties
    selectAll = false;

    @ViewChild('menu') menu!: any;
    
    filters = {
        search: '',
        account: null,
        dateRange: null,
        status: null,
        importMethod: null,
        categoryId: null
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
        private messageService: MessageService,
        private csvImportService: CsvImportService,
        private reconciliationService: ReconciliationService,
        private aiCategorizationService: AiCategorizationService,
    ) {}

    async ngOnInit() {
        await this.loadPlaidData();
        await this.loadCategoryOptions();
        this.setupMenuItems();

        this.buildFilterOptions();
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

    // Call this (e.g., in ngOnInit) to load categories from Supabase
    async loadCategoryOptions(): Promise<void> {
        const { data, error } = await this.supabaseService
            .getClient()
            .from('hb_transaction_categories')
            .select('id, name')
            .eq('is_active', true)
            .order('name');

        if (error) {
            console.error('Error loading categories:', error);
            this.categoryOptions = [];
            return;
        }

        this.categoryOptions = (data || []).map(c => ({
            label: c.name,
            value: c.id,
        }));
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
            
            // Initialize selected property for each transaction
            this.transactions = (transactionAccounts || []).map(t => ({ ...t, selected: false }));
            this.filteredTransactions = [...this.transactions];
            this.selectAll = false;
            this.calculateStats();
            this.applyFilters();
            this.setupMenuItems(); // Refresh menu items to update recategorize button state
            
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
            
        const totalIncome = this.transactions
            .filter(t => t.amount > 0)
            .reduce((sum, t) => sum + t.amount, 0);
            
        const uniqueAccounts = new Set(this.transactions.map(t => t.account_id)).size;

        this.transactionStats = {
            total_transactions: this.transactions.length,
            total_spent: totalSpent,
            total_income: totalIncome,
            unique_accounts: uniqueAccounts
        };
    }

    private toSelectItems(values: any[]): SelectItem[] {
        const uniques = Array.from(
            new Set((values || []).filter((v) => v !== null && v !== undefined && `${v}`.trim() !== '').map((v) => `${v}`))
        ).sort((a, b) => a.localeCompare(b));
        return uniques.map((v) => ({ label: v, value: v }));
    }

    // Call this after you load 'transactions' (your full dataset) or whenever it changes.
    buildFilterOptions() {
        // Adjust field accessors if your property names differ
        this.categoryOptions = this.toSelectItems(this.transactions.map((t: any) => t.category));
        this.institutionOptions = this.toSelectItems(this.transactions.map((t: any) => t.institution));
        this.accountNameOptions = this.toSelectItems(this.transactions.map((t: any) => t.account_name));
        this.sourceOptions = this.toSelectItems(this.transactions.map((t: any) => t.source));
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

            // Category filter (new)
            if (this.filters.categoryId) {
                const txCategoryId = transaction.category_id ?? transaction.category?.id ?? null;
                if (txCategoryId !== this.filters.categoryId) {
                    return false;
                }
            }

            // Import method filter
            if (this.filters.importMethod !== null && transaction.import_method !== this.filters.importMethod) {
                return false;
            }

            return true;
        });

        // Reset selection state when filters change
        this.selectAll = false;
        this.updateMenuItems();
    }

    getAccountName(accountId: string): string {
        const account = this.linkedAccounts.find(a => a.account_id === accountId);
        return account ? `${account.name} (****${account.mask})` : accountId;
    }

    getAccountSubName(accountId: string): string {
        // Capture everything after the first '-' (with or without spaces)
        const match = accountId.match(/-\s*(.+)$/);
        // If no '-' is found, fall back to the full name
        return (match ? match[1] : accountId).trim();
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
                label: 'Import CSV',
                icon: 'pi pi-upload',
                command: () => this.triggerFileUpload()
            },
            {
                label: 'Recategorize Selected',
                icon: 'pi pi-tags',
                command: () => this.recategorizeSelected(),
                disabled: !this.hasSelectedTransactions()
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
                this.importCsvFile(file);
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

    /**
    * Handle file selection
    */
    onFileSelected(event: any) {
        const file = event.target.files[0];
        if (file && file.type === 'text/csv') {
            this.selectedFile = file;
        } else {
            this.messageService.add({
                severity: 'error',
                summary: 'Invalid File',
                detail: 'Please select a valid CSV file'
            });
        }
    }
    
    /**
     * Import CSV file directly from file input
     */
    importCsvFile(file: File) {
        this.importing = true;
        this.csvImportService.importTransactions(file).subscribe({
            next: (result) => {
                this.importing = false;
                
                this.messageService.add({
                    severity: 'success',
                    summary: 'Import Complete',
                    detail: `CSV file '${file.name}' imported successfully with ${result.imported_rows} transactions`
                });
                
                // Reload transactions data
                this.loadTransactions();
            },
            error: (error) => {
                this.importing = false;
                this.messageService.add({
                    severity: 'error',
                    summary: 'Import Failed',
                    detail: error.message || 'Failed to import CSV file'
                });
            }
        });
    }

    /**
     * Import CSV file from dialog
     */
    importCsv() {
        if (!this.selectedFile) return;

        this.importing = true;
        this.csvImportService.importTransactions(this.selectedFile).subscribe({
            next: (result) => {
                this.importing = false;
                this.showCsvUpload = false;
                this.selectedFile = null;
                
                this.messageService.add({
                    severity: 'success',
                    summary: 'Import Complete',
                    detail: `Imported ${result.imported_rows} transactions`
                });
                
                // Reload transactions data
                this.loadTransactions();
            },
            error: (error) => {
                this.importing = false;
                this.messageService.add({
                    severity: 'error',
                    summary: 'Import Failed',
                    detail: error.message || 'Failed to import CSV file'
                });
            }
        });
    }

    /**
     * Show manual match dialog
     */
    showManualMatchDialog(transaction: any) {
        console.log('Opening manual match dialog for transaction:', transaction);
        
        this.selectedItem = transaction;
        this.selectedBillId = null;
        
        // Load available bills for matching
        this.loadAvailableBills();
        
        this.showManualMatch = true;
    }

    /**
     * Load available bills for matching
     */
    private async loadAvailableBills() {
        try {
            // Get bills from the reconciliation service or directly from supabase
            const { data: bills, error } = await this.supabaseService.getClient()
                .from('bills')
                .select('*')
                .eq('user_id', await this.supabaseService.getCurrentUserId());
            
            if (error) {
                console.error('Error loading bills:', error);
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'Failed to load available bills'
                });
                return;
            }
            
            this.availableBills = bills || [];
            console.log('Available bills for matching:', this.availableBills);
        } catch (error) {
            console.error('Error loading bills:', error);
            this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Failed to load available bills'
            });
        }
    }

    /**
     * Apply manual match
     */
    applyManualMatch() {
        if (!this.selectedItem || !this.selectedBillId) return;

        // Use the reconciliation service to create the match
        this.reconciliationService.manualMatch(this.selectedItem.id, this.selectedBillId).subscribe({
            next: (success) => {
                if (success) {
                    this.showManualMatch = false;
                    this.messageService.add({
                        severity: 'success',
                        summary: 'Match Applied',
                        detail: 'Transaction has been matched to bill'
                    });
                    
                    // Reload transactions to reflect the change
                    this.loadTransactions();
                }
            },
            error: (error) => {
                console.error('Error applying match:', error);
                this.messageService.add({
                    severity: 'error',
                    summary: 'Match Failed',
                    detail: error.message || 'Failed to match transaction to bill'
                });
            }
        });
    }

    /**
     * Toggle select all transactions
     */
    toggleSelectAll(event: any) {
        const checked = event.checked;
        // Update both arrays to keep them in sync
        this.transactions.forEach(transaction => {
            transaction.selected = checked;
        });
        this.filteredTransactions.forEach(transaction => {
            transaction.selected = checked;
        });
        this.updateMenuItems();
    }

    /**
     * Toggle individual transaction selection
     */
    toggleTransactionSelection(transaction: any) {
        // Also update the same transaction in the main transactions array
        const mainTransaction = this.transactions.find(t => t.id === transaction.id);
        if (mainTransaction) {
            mainTransaction.selected = transaction.selected;
        }
        this.updateSelectAllState();
        this.updateMenuItems();
    }

    /**
     * Update select all checkbox state
     */
    private updateSelectAllState() {
        // Check against filtered transactions since that's what the user sees
        const selectedCount = this.filteredTransactions.filter(t => t.selected).length;
        const totalCount = this.filteredTransactions.length;
        this.selectAll = selectedCount === totalCount && totalCount > 0;
    }

    /**
     * Check if any transactions are selected
     */
    hasSelectedTransactions(): boolean {
        // Check filtered transactions since that's what the user sees
        return this.filteredTransactions.some(t => t.selected);
    }

    /**
     * Get selected transactions
     */
    getSelectedTransactions(): any[] {
        // Return selected transactions from filtered transactions
        return this.filteredTransactions.filter(t => t.selected);
    }

    /**
     * Update menu items (enable/disable recategorize button)
     */
    private updateMenuItems() {
        this.setupMenuItems();
    }

    /**
     * Recategorize selected transactions
     */
    recategorizeSelected() {
        const selectedTransactions = this.getSelectedTransactions();
        if (selectedTransactions.length === 0) {
            this.messageService.add({
                severity: 'warn',
                summary: 'No Selection',
                detail: 'Please select at least one transaction to recategorize'
            });
            return;
        }

        console.log('Recategorizing transactions:', selectedTransactions);
        
        // Show loading message
        this.messageService.add({
            severity: 'info',
            summary: 'Recategorization Started',
            detail: `Processing ${selectedTransactions.length} selected transaction(s)...`
        });

        // Call AI categorization service to recategorize selected transactions
        this.aiCategorizationService.batchCategorize(selectedTransactions).subscribe({
            next: (results: any[]) => {
                // Process the categorization results
                this.processCategorizationResults(selectedTransactions, results);
            },
            error: (error: any) => {
                console.error('Error during batch categorization:', error);
                this.messageService.add({
                    severity: 'error',
                    summary: 'Recategorization Failed',
                    detail: 'An error occurred while recategorizing transactions. Please try again.'
                });
            }
        });
    }

    /**
     * Process categorization results and update transactions
     */
    private async processCategorizationResults(transactions: any[], results: any[]) {
        let successCount = 0;
        let errorCount = 0;

        // Process each transaction result
        for (let i = 0; i < transactions.length; i++) {
            const transaction = transactions[i];
            const result = results[i];

            if (result && result.categoryId) {
                try {
                    // Update the transaction in the database
                    const { error: updateError } = await this.supabaseService.getClient()
                        .from('hb_transactions')
                        .update({ 
                            category_id: result.categoryId,
                            updated_at: new Date().toISOString()
                        })
                        .eq('id', transaction.id);

                    if (updateError) {
                        console.error('Error updating transaction:', updateError);
                        errorCount++;
                    } else {
                        // Update the local transaction object
                        transaction.category_id = result.categoryId;
                        if (transaction.category) {
                            transaction.category.id = result.categoryId;
                        }
                        successCount++;
                    }
                } catch (error) {
                    console.error('Error updating transaction:', error);
                    errorCount++;
                }
            } else {
                errorCount++;
            }
        }

        // Show results message
        if (successCount > 0) {
            this.messageService.add({
                severity: 'success',
                summary: 'Recategorization Complete',
                detail: `Successfully recategorized ${successCount} transaction(s)${errorCount > 0 ? `, ${errorCount} failed` : ''}`
            });

            // Reload transactions to reflect the changes
            this.loadTransactions();
        } else {
            this.messageService.add({
                severity: 'warn',
                summary: 'Recategorization Failed',
                detail: `Failed to recategorize any transactions. Please try again.`
            });
        }
    }
} 