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
import { ReconciliationOldService } from '../service/reconciliation-old.service';
import { ReconciliationService } from '../service/reconciliation.service';
import { AiCategorizationService } from '../service/ai-categorization.service';
import { TransactionMatchService } from '../service/transaction-match.service';
import { Bill } from '../../interfaces/bill.interface';
import {MultiSelect} from "primeng/multiselect";
import { BillCreationDialogComponent } from '../reconciliation/bill-creation-dialog/bill-creation-dialog.component';

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
        MultiSelect,
        BillCreationDialogComponent
    ],
    providers: [MessageService],
    templateUrl: './transactions.component.html',
    styleUrls: ['./transactions.component.scss']
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
    availableBills: any[] = [];
    
    // New bill dialog properties
    showNewBillDialog = false;
    
    // Debug property to track dropdown changes
    private lastSelectedBillId: string | null = null;

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

    // Store the excluded transaction ID constant
    readonly EXCLUDED_TRANSACTION_ID = '00000000-0000-0000-0000-000000000001';

    constructor(
        private supabaseService: SupabaseService,
        public messageService: MessageService,
        private csvImportService: CsvImportService,
        private reconciliationService: ReconciliationOldService,
        private reconciliationServiceNew: ReconciliationService,
        private aiCategorizationService: AiCategorizationService,
        private transactionMatchService: TransactionMatchService,
    ) {}

    async ngOnInit() {
        await this.loadPlaidData();
        await this.loadCategoryOptions();
        this.setupMenuItems();

        this.buildFilterOptions();
        
        // Watch for changes to selectedBillId
        setInterval(() => {
            if (this.selectedBillId !== this.lastSelectedBillId) {
                console.log('selectedBillId changed from', this.lastSelectedBillId, 'to', this.selectedBillId);
                this.lastSelectedBillId = this.selectedBillId;
                
                if (this.selectedBillId === 'new_bill') {
                    console.log('New bill option detected via ngModel change');
                    this.showNewBillDialog = true;
                }
            }
        }, 100);
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
                    category:category_id(*),
                    bill:bill_id(id, bill_name)
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
                detail: 'Failed to load transaction data: ' + (error as any).message
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
        // Use correct field names that match the actual transaction data structure
        this.institutionOptions = this.toSelectItems(this.transactions.map((t: any) => t.bank_source));
        this.accountNameOptions = this.toSelectItems(this.transactions.map((t: any) => t.account_id));
        this.sourceOptions = this.toSelectItems(this.transactions.map((t: any) => t.import_method));
        // Note: categoryOptions is already loaded from the database in loadCategoryOptions()
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
        if (account) {
            return `${account.name} (****${account.mask})`;
        }
        
        // Handle special case for FirstTech CU - Augie
        if (accountId === 'FirstTech CU - Augie') {
            return 'Augie';
        }
        
        // Handle Fidelity Bank accounts
        if (accountId === 'CHECKING') {
            return 'CHECKING';
        } else if (accountId === 'BACK UP CHECKING') {
            return 'BACK UP CHECKING';
        } else if (accountId === 'Fidelity Account') {
            return 'Fidelity Account';
        }
        
        // Handle Credit Card accounts
        if (accountId === 'Credit Card') {
            return 'Credit Card';
        }
        
        // Handle Marcus accounts
        if (accountId === 'Saving') {
            return 'Saving';
        }
        
        return accountId;
    }

    getAccountSubName(accountId: string): string {
        // Handle special case for FirstTech CU - Augie
        if (accountId === 'FirstTech CU - Augie') {
            return 'Augie';
        }
        
        // Capture everything after the first '-' (with or without spaces)
        const match = accountId.match(/-\s*(.+)$/);
        // If no '-' is found, fall back to the full name
        return (match ? match[1] : accountId).trim();
    }

    getBankLogo(bankSource: string): string {
        const bankSourceLower = bankSource.toLowerCase();
        
        if (bankSourceLower.includes('fidelity')) {
            return 'assets/images/fidelity.png';
        } else if (bankSourceLower.includes('firsttech') || bankSourceLower.includes('first tech')) {
            return 'assets/images/firsttech.png';
        } else if (bankSourceLower.includes('us bank') || bankSourceLower.includes('usbank') || bankSourceLower === 'us_bank') {
            return 'assets/images/usbank.png';
        } else if (bankSourceLower.includes('marcus')) {
            return 'assets/images/marcus.png'; // Assuming you have a Marcus logo
        }
        
        // Return null for no logo instead of a non-existent default
        return '';
    }

    getInstitutionName(bankSource: string): string {
        const bankSourceLower = bankSource.toLowerCase();
        
        // Handle Fidelity Bank
        if (bankSourceLower.includes('fidelity')) {
            return 'Fidelity Bank';
        }
        
        // Handle FirstTech CU
        if (bankSourceLower.includes('firsttech') || bankSourceLower.includes('first tech')) {
            return 'FirstTech CU';
        }
        
        // Handle US Bank
        if (bankSourceLower.includes('us bank') || bankSourceLower.includes('usbank') || bankSourceLower === 'us_bank_credit_card') {
            return 'US Bank';
        }
        
        // Handle Marcus
        if (bankSourceLower.includes('marcus')) {
            return 'Marcus';
        }
        
        // Default fallback
        return bankSource;
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
            const bills = await this.transactionMatchService.loadAvailableBills();
            console.log('Raw bills from service:', bills);
            
            // Use the bills directly without adding a "New Bill" option
            this.availableBills = bills || [];
            console.log('Available bills loaded with New Bill option:', this.availableBills);
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
     * Handle bill selection change in dropdown
     */
    onBillSelectionChange(event: any) {
        console.log('Bill selection changed:', event);
        console.log('Event value:', event.value);
        console.log('Event target:', event.target);
        this.selectedBillId = event.value;
    }

    /**
     * Open new bill dialog
     */
    openNewBillDialog() {
        console.log('Opening new bill dialog');
        this.showNewBillDialog = true;
    }

    /**
     * Apply manual match
     */
    async applyManualMatch() {
        if (!this.selectedItem || !this.selectedBillId) return;

        try {
            // Use the transaction match service to create the match
            await this.transactionMatchService.matchTransactionToBill(this.selectedItem.id, this.selectedBillId);
            
            this.showManualMatch = false;
            this.messageService.add({
                severity: 'success',
                summary: 'Match Applied',
                detail: 'Transaction has been matched to bill'
            });
            
            // Reload transactions to reflect the change
            this.loadTransactions();
        } catch (error) {
            console.error('Error applying match:', error);
            this.messageService.add({
                severity: 'error',
                summary: 'Match Failed',
                detail: error instanceof Error ? error.message : 'Failed to match transaction to bill'
            });
        }
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

    /**
     * Get the reconciliation status text for a transaction
     */
    getReconStatus(transaction: any): string {
        if (!transaction.bill_id) {
            return 'Unmatched';
        }
        if (transaction.bill_id === this.EXCLUDED_TRANSACTION_ID) {
            return 'Excluded';
        }
        return 'Matched';
    }

    /**
     * Get the severity level for the reconciliation status tag
     */
    getReconStatusSeverity(transaction: any): string {
        if (!transaction.bill_id) {
            return 'warning';
        }
        if (transaction.bill_id === this.EXCLUDED_TRANSACTION_ID) {
            return 'secondary';
        }
        return 'success';
    }

    /**
     * Get the matched bill name for a transaction
     */
    getMatchedBillName(transaction: any): string {
        if (!transaction.bill_id) {
            return '-';
        }
        if (transaction.bill_id === this.EXCLUDED_TRANSACTION_ID) {
            return 'Excluded (Not a Bill)';
        }
        if (transaction.bill && transaction.bill.bill_name) {
            return transaction.bill.bill_name;
        }
        return 'Unknown Bill';
    }

    /**
     * Handle category change for a transaction
     */
    async onCategoryChange(transaction: any, event: any) {
        try {
            const newCategoryId = event.value;
            
            // Update in database
            const { error } = await this.supabaseService.getClient()
                .from('hb_transactions')
                .update({ 
                    category_id: newCategoryId,
                    updated_at: new Date().toISOString()
                })
                .eq('id', transaction.id);

            if (error) throw error;

            // Update local object
            transaction.category_id = newCategoryId;
            const category = this.categoryOptions.find(c => c.value === newCategoryId);
            transaction.category = { 
                id: newCategoryId, 
                name: category?.label || 'Unknown' 
            };

            this.messageService.add({
                severity: 'success',
                summary: 'Category Updated',
                detail: `Category changed to ${category?.label}`
            });

            // Prompt for bulk update
            this.promptBulkCategoryUpdate(transaction, newCategoryId);
        } catch (error) {
            console.error('Error updating category:', error);
            this.messageService.add({
                severity: 'error',
                summary: 'Update Failed',
                detail: 'Failed to update category'
            });
        }
    }

    /**
     * Prompt user to apply category to similar transactions
     */
    private promptBulkCategoryUpdate(transaction: any, newCategoryId: string) {
        // Find similar transactions (same description, different or no category)
        const similarTransactions = this.transactions.filter(t => 
            t.name === transaction.name && 
            t.id !== transaction.id &&
            t.category_id !== newCategoryId
        );

        if (similarTransactions.length > 0) {
            // Show confirmation dialog
            this.messageService.add({
                severity: 'info',
                summary: 'Similar Transactions Found',
                detail: `Found ${similarTransactions.length} similar transaction(s). Apply category to all?`,
                sticky: true,
                key: 'bulk-category-update',
                data: { transaction, newCategoryId, similarTransactions }
            });
        }
    }

    /**
     * Apply category to multiple similar transactions
     */
    async applyBulkCategoryUpdate(similarTransactions: any[], newCategoryId: string) {
        let successCount = 0;
        let errorCount = 0;

        for (const transaction of similarTransactions) {
            try {
                const { error } = await this.supabaseService.getClient()
                    .from('hb_transactions')
                    .update({ 
                        category_id: newCategoryId,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', transaction.id);

                if (error) {
                    errorCount++;
                } else {
                    transaction.category_id = newCategoryId;
                    const category = this.categoryOptions.find(c => c.value === newCategoryId);
                    transaction.category = { 
                        id: newCategoryId, 
                        name: category?.label || 'Unknown' 
                    };
                    successCount++;
                }
            } catch (error) {
                errorCount++;
            }
        }

        this.messageService.add({
            severity: 'success',
            summary: 'Bulk Update Complete',
            detail: `Updated ${successCount} transaction(s)${errorCount > 0 ? `, ${errorCount} failed` : ''}`
        });
    }

    /**
     * Handle new bill creation
     */
    onBillCreated(newBill: any) {
        console.log('New bill created:', newBill);
        
        // Close the new bill dialog
        this.showNewBillDialog = false;
        
        // Reload available bills to include the new one
        this.loadAvailableBills();
        
        // Show success message
        this.messageService.add({
            severity: 'success',
            summary: 'Bill Created',
            detail: 'New bill has been created successfully'
        });
        
        // Auto-select the newly created bill
        this.selectedBillId = newBill.id;
        
        // Automatically match the transaction to the new bill
        this.applyManualMatch();
    }

    /**
     * Handle new bill dialog visibility change
     */
    onNewBillDialogVisibleChange(visible: boolean) {
        console.log('New bill dialog visibility changed:', visible);
        this.showNewBillDialog = visible;
    }

    /**
     * Test method to manually open the new bill dialog
     * This can be called from the browser console for testing
     */
    testOpenNewBillDialog() {
        console.log('Manually opening new bill dialog for testing');
        this.showNewBillDialog = true;
        console.log('showNewBillDialog set to:', this.showNewBillDialog);
    }
}