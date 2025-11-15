import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// Interfaces for transaction and bill data
interface Transaction {
    id: string;
    date: string;
    description: string;
    amount: string;
    type: 'positive' | 'negative';
    isRefund?: boolean;
    subtext?: string;
    account?: string; // Account name for filtering
}

interface Bill {
    id: string;
    date: string;
    merchant: string;
    amount: string;
    category: {
        icon: string;
        name: string;
    };
    matchCount?: number;
    frequencyName?: string;
}

interface MatchedTransaction {
    id: string;
    transactionDate: string;
    transactionDescription: string;
    transactionAmount: string;
    billDate: string;
    billName: string;
    billAmount: string;
    billCategory: string;
}
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/dropdown';
import { CheckboxModule } from 'primeng/checkbox';
import { TagModule } from 'primeng/tag';
import { TabsModule } from 'primeng/tabs';
import { OverlayBadgeModule } from 'primeng/overlaybadge';
import { BadgeModule } from 'primeng/badge';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { TableModule } from 'primeng/table';
import { PaginatorModule } from 'primeng/paginator';
import { DialogModule } from 'primeng/dialog';
import { ReconciliationService } from '../service/reconciliation.service';
import { SupabaseService } from '../service/supabase.service';
import { AiMatchingService, MatchResult, AutoMatchConfig } from '../service/ai-matching.service';
import { Transaction as DbTransaction } from '../../interfaces/transaction.interface';
import { BillCreationDialogComponent } from './bill-creation-dialog/bill-creation-dialog.component';

@Component({
    selector: 'app-reconciliation',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        ButtonModule,
        CardModule,
        InputTextModule,
        DropdownModule,
        CheckboxModule,
        TagModule,
        TabsModule,
        OverlayBadgeModule,
        BadgeModule,
        InputGroupModule,
        InputGroupAddonModule,
        TableModule,
        PaginatorModule,
        DialogModule,
        BillCreationDialogComponent
    ],
    templateUrl: './reconciliation.component.html',
    styleUrls: ['./reconciliation.component.scss']
})
export class ReconciliationComponent {
    selectedMonth: string = '';
    monthOptions: any[] = [];
    activeTabValue: string = '0';
    selectedAccount: string = ''; // No default selection
    accountOptions: any[] = [];
    unreconciledCount: number = 3;
    billsCount: number = 3;
    matchedCount: number = 0;
    excludedCount: number = 0;
    
    // Financial metrics
    totalSpent: number = 0;
    totalIncome: number = 0;
    netAmount: number = 0;
    totalTransactions: number = 0;
    
    // Data arrays
    transactions: Transaction[] = [];
    bills: Bill[] = [];
    matchedTransactions: MatchedTransaction[] = [];
    excludedTransactions: Transaction[] = [];
    
    // Loading states
    loadingTransactions = false;
    loadingBills = false;
    loadingMatched = false;
    loadingExcluded = false;
    
    // Selected transaction and bill data
    selectedTransaction: Transaction | null = null;
    selectedBill: Bill | null = null;
    
    // Bulk exclusion
    selectedTransactionsForExclusion: Set<string> = new Set();
    selectAllForExclusion: boolean = false;

    // Search functionality
    transactionSearchTerm: string = '';
    billSearchTerm: string = '';

    // Pagination
    itemsPerPage: number = 30;
    currentTransactionPage: number = 1;
    currentBillPage: number = 1;

    // Auto-matching properties
    autoMatchingInProgress: boolean = false;
    showAutoMatchDialog: boolean = false;
    suggestedMatches: (MatchResult & { approved: boolean })[] = [];
    applyingMatches: boolean = false;
    matchingConfig: AutoMatchConfig;
    
    // Confirmation dialog properties
    showConfirmDialog: boolean = false;
    autoMatchCancelled: boolean = false;
    
    // Bill creation dialog properties
    showBillCreationDialog: boolean = false;
    billCreationInitialData?: {
        billName: string;
        amount: number;
        dueDate: Date;
        description?: string;
    };

    constructor(
        private reconciliationService: ReconciliationService,
        private supabaseService: SupabaseService,
        private aiMatchingService: AiMatchingService
    ) {
        this.initializeMonthOptions();
        this.initializeAccountOptions();
        this.initializeTransactionData();
        this.initializeBillData();
        this.initializeMatchedTransactionsData();
        this.loadData();
        this.calculateFinancialMetrics();
        this.matchingConfig = this.aiMatchingService.getConfig();
    }

    private initializeMonthOptions() {
        const currentDate = new Date();
        const options = [];

        // Generate options for current month + 11 previous months
        for (let i = 0; i < 12; i++) {
            const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
            const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            const label = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
            
            options.push({ label, value });
        }
        
        this.monthOptions = options;
        this.selectedMonth = options[0]?.value || '';
    }

    private initializeAccountOptions() {
        // Account options for filtering
        this.accountOptions = [
            { id: '', name: 'All Accounts' },
            { id: 'Fidelity', name: 'Fidelity' },
            { id: 'US Bank', name: 'US Bank' },
            { id: 'American Express', name: 'American Express' }
        ];

        // No default selection - starts with empty string
        this.selectedAccount = '';
    }

    private initializeTransactionData() {
        this.transactions = [
            {
                id: '1',
                date: '05/05/2023',
                description: 'Interest Paid',
                amount: '$1.00 USD',
                type: 'positive'
            },
            {
                id: '2',
                date: '04/28/2023',
                description: 'EFT Withdrawal',
                amount: '-$473.46 USD',
                type: 'negative'
            },
            {
                id: '3',
                date: '04/15/2023',
                description: 'Refund',
                amount: '$1,202.02 USD',
                type: 'positive',
                isRefund: true,
                subtext: 'Manually Added Transaction'
            }
        ];
    }

    private initializeBillData() {
        this.bills = [
            {
                id: '1',
                date: '05/05/2023',
                merchant: 'Kevin Roberts',
                amount: '-$429.44 USD',
                category: {
                    icon: 'pi pi-send',
                    name: 'Advertising'
                }
            },
            {
                id: '2',
                date: '04/28/2023',
                merchant: 'Jane Jones - EFT Withdrawal',
                amount: '-$473.46 USD',
                category: {
                    icon: 'pi pi-diamond',
                    name: 'Other Expenses'
                }
            },
            {
                id: '3',
                date: '05/05/2023',
                merchant: 'No Merchant',
                amount: '-$2.18 USD',
                category: {
                    icon: 'pi pi-car',
                    name: 'Gas'
                }
            }
        ];
    }

    private initializeMatchedTransactionsData() {
        this.matchedTransactions = [
            {
                id: '1',
                transactionDate: '04/28/2023',
                transactionDescription: 'EFT Withdrawal',
                transactionAmount: '-$473.46 USD',
                billDate: '04/28/2023',
                billName: 'Jane Jones',
                billAmount: '-$473.46 USD',
                billCategory: 'Other Expenses'
            },
            {
                id: '2',
                transactionDate: '04/27/2023',
                transactionDescription: 'Google Ads',
                transactionAmount: '-$497.85 USD',
                billDate: '04/27/2023',
                billName: 'Google',
                billAmount: '-$497.85 USD',
                billCategory: 'Advertising'
            },
            {
                id: '3',
                transactionDate: '04/26/2023',
                transactionDescription: 'Shell Gas Station',
                transactionAmount: '-$78.42 USD',
                billDate: '04/27/2023',
                billName: 'Shell',
                billAmount: '-$78.42 USD',
                billCategory: 'Gas'
            },
            {
                id: '4',
                transactionDate: '04/25/2023',
                transactionDescription: 'Blue Cross',
                transactionAmount: '-$312.67 USD',
                billDate: '04/27/2023',
                billName: 'Blue Cross',
                billAmount: '-$312.67 USD',
                billCategory: 'Health Insurance'
            },
            {
                id: '5',
                transactionDate: '04/24/2023',
                transactionDescription: 'Italian Bistro',
                transactionAmount: '-$28.39 USD',
                billDate: '04/27/2023',
                billName: 'Italian Bistro',
                billAmount: '-$28.39 USD',
                billCategory: 'Restaurants/Dining'
            },
            {
                id: '6',
                transactionDate: '04/23/2023',
                transactionDescription: 'Adobe Subscription',
                transactionAmount: '-$118.39 USD',
                billDate: '04/27/2023',
                billName: 'Adobe',
                billAmount: '-$118.39 USD',
                billCategory: 'Software'
            },
            {
                id: '7',
                transactionDate: '04/22/2023',
                transactionDescription: 'Payroll',
                transactionAmount: '-$3,482.56 USD',
                billDate: '04/27/2023',
                billName: 'Design Focus',
                billAmount: '-$3,482.56 USD',
                billCategory: 'Wages'
            }
        ];
    }

    // Methods to handle transaction and bill selection
    onTransactionSelect(transaction: Transaction) {
        console.log('Transaction selected:', transaction);
        this.selectedTransaction = transaction;
    }

    onBillSelect(bill: Bill) {
        console.log('Bill selected:', bill);
        this.selectedBill = bill;
    }

    // Check if a transaction is selected
    isTransactionSelected(transaction: Transaction): boolean {
        return this.selectedTransaction?.id === transaction.id;
    }

    // Check if a bill is selected
    isBillSelected(bill: Bill): boolean {
        return this.selectedBill?.id === bill.id;
    }

    // Getters for display values
    get selectedTransactionAmount(): string {
        console.log('Getting transaction amount:', this.selectedTransaction?.amount);
        return this.selectedTransaction ? this.selectedTransaction.amount : '$0.00';
    }

    get selectedTransactionDescription(): string {
        console.log('Getting transaction description:', this.selectedTransaction?.description);
        return this.selectedTransaction ? this.selectedTransaction.description : 'Selected Transaction';
    }

    get selectedBillAmount(): string {
        console.log('Getting bill amount:', this.selectedBill?.amount);
        return this.selectedBill ? this.selectedBill.amount : '$0.00';
    }

    get selectedBillDescription(): string {
        console.log('Getting bill description:', this.selectedBill?.merchant);
        return this.selectedBill ? this.selectedBill.merchant : 'Selected Bill';
    }

    // Helper method to map account_id to account name
    private mapAccountIdToName(accountId: string): string {
        // Map the account_id strings to readable account names
        switch (accountId) {
            case 'Fidelity':
                return 'Fidelity';
            case 'US Bank':
                return 'US Bank';
            case 'CHECKING':
                return 'Fidelity'; // Default CHECKING to Fidelity
            case 'Credit Card':
                return 'US Bank'; // Default Credit Card to US Bank
            case 'AUGUSTINE LOPEZ':
                return 'American Express'; // AMEX cardholder
            default:
                // Check if it looks like a person's name (contains space and all caps)
                if (accountId && accountId.includes(' ') && accountId === accountId.toUpperCase()) {
                    return 'American Express'; // Likely AMEX cardholder
                }
                return 'Fidelity'; // Default fallback
        }
    }

    // Helper method to determine transaction account
    private getTransactionAccount(transaction: Transaction): string {
        // Return the account property if it exists, otherwise use fallback logic
        if (transaction.account) {
            return transaction.account;
        }
        
        // Fallback: check subtext for account indicators
        if (transaction.subtext) {
            const subtext = transaction.subtext.toLowerCase();
            if (subtext.includes('fidelity')) return 'Fidelity';
            if (subtext.includes('us bank')) return 'US Bank';
            if (subtext.includes('amex') || subtext.includes('american_express') || subtext.includes('american express')) return 'American Express';
        }
        
        // Default fallback
        return 'Fidelity';
    }

    // Filtered data for search functionality with pagination
    get filteredTransactions(): Transaction[] {
        let filtered = this.transactions;
        
        // Apply account filter if account is selected
        if (this.selectedAccount && this.selectedAccount !== '') {
            filtered = filtered.filter(transaction => {
                // Check if transaction account matches selected account
                // This assumes transactions have an account property or we can determine it from the data
                return this.getTransactionAccount(transaction) === this.selectedAccount;
            });
        }
        
        // Apply search filter if search term exists
        if (this.transactionSearchTerm.trim()) {
            const searchTerm = this.transactionSearchTerm.toLowerCase();
            filtered = filtered.filter(transaction => 
                transaction.description.toLowerCase().includes(searchTerm) ||
                transaction.amount.toLowerCase().includes(searchTerm) ||
                (transaction.subtext && transaction.subtext.toLowerCase().includes(searchTerm))
            );
        }
        
        // Apply pagination based on current page
        const startIndex = (this.currentTransactionPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        return filtered.slice(startIndex, endIndex);
    }

    get filteredBills(): Bill[] {
        let filtered = this.bills;
        
        // Apply search filter if search term exists
        if (this.billSearchTerm.trim()) {
            const searchTerm = this.billSearchTerm.toLowerCase();
            filtered = this.bills.filter(bill => 
                bill.merchant.toLowerCase().includes(searchTerm) ||
                bill.amount.toLowerCase().includes(searchTerm) ||
                bill.category.name.toLowerCase().includes(searchTerm)
            );
        }
        
        // Apply pagination based on current page
        const startIndex = (this.currentBillPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        return filtered.slice(startIndex, endIndex);
    }

    // Get total counts for display
    get totalFilteredTransactions(): number {
        let filtered = this.transactions;
        
        // Apply account filter if account is selected
        if (this.selectedAccount && this.selectedAccount !== '') {
            filtered = filtered.filter(transaction => {
                return this.getTransactionAccount(transaction) === this.selectedAccount;
            });
        }
        
        // Apply search filter if search term exists
        if (this.transactionSearchTerm.trim()) {
            const searchTerm = this.transactionSearchTerm.toLowerCase();
            filtered = filtered.filter(transaction => 
                transaction.description.toLowerCase().includes(searchTerm) ||
                transaction.amount.toLowerCase().includes(searchTerm) ||
                (transaction.subtext && transaction.subtext.toLowerCase().includes(searchTerm))
            );
        }
        
        return filtered.length;
    }

    get totalFilteredBills(): number {
        if (!this.billSearchTerm.trim()) {
            return this.bills.length;
        }
        
        const searchTerm = this.billSearchTerm.toLowerCase();
        return this.bills.filter(bill => 
            bill.merchant.toLowerCase().includes(searchTerm) ||
            bill.amount.toLowerCase().includes(searchTerm) ||
            bill.category.name.toLowerCase().includes(searchTerm)
        ).length;
    }

    // Data loading methods
    async loadData() {
        if (this.selectedMonth) {
            // Clear bulk exclusion selection when reloading data
            this.selectedTransactionsForExclusion.clear();
            this.selectAllForExclusion = false;
            
            await this.loadUnreconciledTransactions();
            await this.loadUnmatchedBills();
            await this.loadMatchedTransactions();
            await this.loadExcludedTransactions();
        }
    }

    async loadUnreconciledTransactions() {
        if (!this.selectedMonth) return;
        
        try {
            this.loadingTransactions = true;
            const [year, month] = this.selectedMonth.split('-').map(Number);
            const dbTransactions = await this.reconciliationService.getUnreconciledTransactions(year, month);
            
            // Transform database transactions to component format
            this.transactions = dbTransactions.map(t => ({
                id: t.id,
                date: new Date(t.date).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: '2-digit', 
                    day: '2-digit' 
                }),
                description: t.name || t.description || 'Unknown Transaction',
                amount: `$${(t.amount || 0).toFixed(2)} USD`,
                type: (t.amount || 0) >= 0 ? 'positive' : 'negative',
                isRefund: false, // You can add logic to detect refunds
                subtext: t.bank_source || undefined,
                account: this.mapAccountIdToName(t.account_id) // Map account_id to account name
            }));
            
            this.unreconciledCount = this.transactions.length;
        } catch (error) {
            console.error('Error loading unreconciled transactions:', error);
            this.transactions = [];
            this.unreconciledCount = 0;
        } finally {
            this.loadingTransactions = false;
        }
    }

    async loadUnmatchedBills() {
        if (!this.selectedMonth) return;
        
        try {
            this.loadingBills = true;
            const [year, month] = this.selectedMonth.split('-').map(Number);
            const dbBills = await this.reconciliationService.getUnmatchedBills(year, month);
            
            // Transform database bills to component format
            this.bills = dbBills.map(item => ({
                id: item.bill?.id || item.id, // bill id
                date: item.bill?.due_date || '',
                merchant: item.name || 'Unknown Account', // account_name
                amount: `-$${(item.bill?.amount_due || 0).toFixed(2)} USD`,
                category: {
                    icon: 'pi pi-file', // You can customize this based on bill type
                    name: 'Other'
                },
                matchCount: item.matchCount || 0,
                frequencyName: item.frequencyName || 'Monthly'
            }));
            
            this.billsCount = this.bills.length;
        } catch (error) {
            console.error('Error loading unmatched bills:', error);
            this.bills = [];
            this.billsCount = 0;
        } finally {
            this.loadingBills = false;
        }
    }

    async loadMatchedTransactions() {
        if (!this.selectedMonth) return;
        
        try {
            this.loadingMatched = true;
            const [year, month] = this.selectedMonth.split('-').map(Number);
            const dbMatched = await this.reconciliationService.getMatchedTransactions(year, month);
            
            // Transform database matched transactions to component format
            this.matchedTransactions = dbMatched.map(t => ({
                id: t.id,
                transactionDate: new Date(t.date).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: '2-digit', 
                    day: '2-digit' 
                }),
                transactionDescription: t.name || t.description || 'Unknown Transaction',
                transactionAmount: `$${(t.amount || 0).toFixed(2)} USD`,
                billDate: t.bill?.due_date || '',
                billName: t.bill?.bill_name || t.bill?.account?.name || 'Unknown Bill',
                billAmount: t.bill ? `-$${(t.bill.amount_due || 0).toFixed(2)} USD` : '',
                billCategory: t.bill?.bill_type?.name || 'Other'
                   }));
                   
                   this.matchedCount = this.matchedTransactions.length;
               } catch (error) {
                   console.error('Error loading matched transactions:', error);
                   this.matchedTransactions = [];
                   this.matchedCount = 0;
               } finally {
                   this.loadingMatched = false;
               }
    }

    // Handle month selection change
    async onMonthChange() {
        await this.loadData();
        await this.calculateFinancialMetrics();
    }

    // Handle account selection change
    onAccountChange() {
        // Reset to first page when account filter changes
        this.currentTransactionPage = 1;
        // Transactions will automatically update due to reactive filtering
    }

    // Handle pagination changes
    onTransactionPageChange(event: any) {
        this.currentTransactionPage = event.page + 1; // PrimeNG uses 0-based indexing
    }

    onBillPageChange(event: any) {
        this.currentBillPage = event.page + 1; // PrimeNG uses 0-based indexing
    }

    // Handle matching a transaction to a bill
    async onMatchTransaction() {
        if (!this.selectedTransaction || !this.selectedBill) {
            console.warn('Please select both a transaction and a bill to match');
            return;
        }

        try {
            // Update the database
            await this.reconciliationService.matchTransactionToBill(
                this.selectedTransaction.id, 
                this.selectedBill.id
            );

            console.log('Successfully matched transaction to bill');

            // Clear selections
            this.selectedTransaction = null;
            this.selectedBill = null;

            // Reload all data to reflect the changes
            await this.loadData();

        } catch (error) {
            console.error('Error matching transaction to bill:', error);
            // You might want to show a user-friendly error message here
        }
    }

    /**
     * Calculate financial metrics for the selected month
     */
    private async calculateFinancialMetrics() {
        if (!this.selectedMonth) {
            this.resetFinancialMetrics();
            return;
        }

        try {
            const [year, month] = this.selectedMonth.split('-').map(Number);
            
            // Get all transactions for the selected month (both matched and unmatched)
            const { data: allTransactions, error } = await this.supabaseService.getClient()
                .from('hb_transactions')
                .select('amount, account_id')
                .in('account_id', ['CHECKING', 'Credit Card']) // Only checking and credit card accounts
                .gte('date', new Date(year, month - 1, 1).toISOString().split('T')[0])
                .lte('date', new Date(year, month, 0).toISOString().split('T')[0]);

            if (error) {
                console.error('Error calculating financial metrics:', error);
                this.resetFinancialMetrics();
                return;
            }

            // Calculate metrics
            const transactions = allTransactions || [];
            this.totalTransactions = transactions.length;
            
            this.totalSpent = transactions
                .filter(t => t.amount < 0)
                .reduce((sum, t) => sum + Math.abs(t.amount), 0);
                
            this.totalIncome = transactions
                .filter(t => t.amount > 0)
                .reduce((sum, t) => sum + t.amount, 0);
                
            this.netAmount = this.totalIncome - this.totalSpent;

        } catch (error) {
            console.error('Error calculating financial metrics:', error);
            this.resetFinancialMetrics();
        }
    }

    /**
     * Reset financial metrics to zero
     */
    private resetFinancialMetrics() {
        this.totalSpent = 0;
        this.totalIncome = 0;
        this.netAmount = 0;
        this.totalTransactions = 0;
    }

    /**
     * Show confirmation dialog for auto-reconciliation
     */
    startAutoReconciliation() {
        if (!this.selectedMonth) {
            console.warn('No month selected for auto-reconciliation');
            return;
        }
        
        this.showConfirmDialog = true;
    }

    /**
     * Confirm and start auto-reconciliation process
     */
    async confirmAutoReconciliation() {
        this.showConfirmDialog = false;
        this.autoMatchingInProgress = true;
        this.autoMatchCancelled = false;
        
        try {
            // First, build patterns from existing manual matches
            await this.aiMatchingService.buildMatchingPatterns();
            
            // Check if cancelled
            if (this.autoMatchCancelled) {
                console.log('Auto-reconciliation cancelled by user');
                return;
            }
            
            const [year, month] = this.selectedMonth.split('-').map(Number);
            const [dbTransactions, dbBills] = await Promise.all([
                this.reconciliationService.getUnreconciledTransactions(year, month),
                this.reconciliationService.getUnmatchedBills(year, month)
            ]);

            // Check if cancelled
            if (this.autoMatchCancelled) {
                console.log('Auto-reconciliation cancelled by user');
                return;
            }

            const suggestedMatches = await this.aiMatchingService.processTransactionsForMatching(
                dbTransactions,
                dbBills,
                this.matchingConfig
            );

            // Check if cancelled
            if (this.autoMatchCancelled) {
                console.log('Auto-reconciliation cancelled by user');
                return;
            }

            this.suggestedMatches = suggestedMatches.map(match => ({
                ...match,
                approved: false
            }));

            if (this.suggestedMatches.length === 0) {
                console.log('No potential matches found above confidence threshold');
            } else {
                this.showAutoMatchDialog = true;
            }

        } catch (error) {
            console.error('Error during auto-reconciliation:', error);
        } finally {
            this.autoMatchingInProgress = false;
        }
    }

    /**
     * Cancel auto-reconciliation process
     */
    cancelAutoReconciliation() {
        this.autoMatchCancelled = true;
        this.autoMatchingInProgress = false;
        this.showAutoMatchDialog = false;
        this.showConfirmDialog = false;
        console.log('Auto-reconciliation cancelled');
    }

    /**
     * Apply selected matches
     */
    async applySelectedMatches() {
        const approvedMatches = this.getApprovedMatches();
        if (approvedMatches.length === 0) return;

        this.applyingMatches = true;

        try {
            await this.aiMatchingService.applyMatches(approvedMatches);
            
            // Close dialog and refresh data
            this.showAutoMatchDialog = false;
            this.suggestedMatches = [];
            
            // Reload data to reflect the changes
            await this.loadData();
            
            console.log(`Successfully applied ${approvedMatches.length} matches`);
            // You might want to show a success message to the user here

        } catch (error) {
            console.error('Error applying matches:', error);
            // You might want to show an error message to the user here
        } finally {
            this.applyingMatches = false;
        }
    }

    /**
     * Get approved matches
     */
    getApprovedMatches(): MatchResult[] {
        return this.suggestedMatches
            .filter(match => match.approved)
            .map(({ approved, ...match }) => match);
    }

    /**
     * Select all or none of the matches
     */
    selectAllMatches(selectAll: boolean) {
        this.suggestedMatches.forEach(match => {
            match.approved = selectAll;
        });
    }

    /**
     * Get confidence severity for tag display
     */
    getConfidenceSeverity(confidence: number): string {
        if (confidence >= 90) return 'success';
        if (confidence >= 80) return 'info';
        if (confidence >= 70) return 'warning';
        return 'danger';
    }

    /**
     * Open the bill creation dialog
     */
    openBillCreationDialog() {
        this.showBillCreationDialog = true;
    }

    /**
     * Open bill creation dialog pre-filled with transaction data
     */
    openBillCreationFromTransaction() {
        const selectedIds = Array.from(this.selectedTransactionsForExclusion);
        if (selectedIds.length !== 1) {
            return; // Safety check
        }
        
        // Find the selected transaction
        const transaction = this.transactions.find(t => t.id === selectedIds[0]);
        if (!transaction) {
            return;
        }
        
        // Parse amount - remove $, commas, USD, and convert to absolute value
        const amountStr = transaction.amount.replace(/[$,USD\s]/g, '');
        const amount = Math.abs(parseFloat(amountStr));
        
        // Parse date - assuming format is MM/DD/YYYY
        const dateParts = transaction.date.split('/');
        const transactionDate = dateParts.length === 3 
            ? new Date(parseInt(dateParts[2]), parseInt(dateParts[0]) - 1, parseInt(dateParts[1]))
            : new Date();
        
        // Set initial data
        this.billCreationInitialData = {
            billName: transaction.description,
            amount: amount,
            dueDate: transactionDate,
            description: `Bill created from transaction: ${transaction.description}`
        };
        
        this.showBillCreationDialog = true;
    }

    /**
     * Handle bill creation success
     */
    async onBillCreated(newBill: any) {
        console.log('Bill created successfully:', newBill);
        
        // Clear initial data
        this.billCreationInitialData = undefined;
        
        // Reload the bills data to include the new bill
        await this.loadUnmatchedBills();
        
        // Update the bills count
        this.billsCount = this.bills.length;
        
        // Optionally select the newly created bill
        // this.selectedBill = newBill;
    }

    /**
     * Get the match count badge text for a bill based on its frequency
     */
    getMatchCountBadgeText(bill: Bill): string {
        const matchCount = bill.matchCount || 0;
        const frequencyName = bill.frequencyName || 'Monthly';

        if (matchCount === 0) {
            return '';
        }

        switch (frequencyName) {
            case 'AsNeeded':
                return `Linked ${matchCount}x`;
            
            case 'Weekly':
                return `Linked ${matchCount}/4`;
            
            case 'Monthly':
                // Shouldn't show for Monthly since it's removed after 1 match
                return `Linked ${matchCount}x`;
            
            case 'Yearly':
                return `Linked ${matchCount}x`;
            
            default:
                return `Linked ${matchCount}x`;
        }
    }

    /**
     * Check if bill should show match count badge
     */
    shouldShowMatchCountBadge(bill: Bill): boolean {
        return (bill.matchCount || 0) > 0;
    }

    /**
     * Exclude a transaction (mark as not a bill)
     */
    async onExcludeTransaction(transaction: Transaction) {
        try {
            await this.reconciliationService.excludeTransaction(transaction.id);
            
            // Clear selection if this transaction was selected
            if (this.selectedTransaction?.id === transaction.id) {
                this.selectedTransaction = null;
            }

            // Reload data to reflect the changes
            await this.loadData();

        } catch (error) {
            console.error('Error excluding transaction:', error);
            // You might want to show an error message to the user here
        }
    }

    /**
     * Undo exclusion (mark transaction as unreconciled again)
     */
    async onUndoExcludeTransaction(transaction: Transaction) {
        try {
            await this.reconciliationService.undoExcludeTransaction(transaction.id);
            
            // Reload data to reflect the changes
            await this.loadData();

        } catch (error) {
            console.error('Error undoing exclusion:', error);
            // You might want to show an error message to the user here
        }
    }

    /**
     * Toggle transaction selection for exclusion
     */
    toggleTransactionForExclusion(transactionId: string) {
        if (this.selectedTransactionsForExclusion.has(transactionId)) {
            this.selectedTransactionsForExclusion.delete(transactionId);
        } else {
            this.selectedTransactionsForExclusion.add(transactionId);
        }
        
        // Update selectAll checkbox state
        this.updateSelectAllState();
    }

    /**
     * Check if transaction is selected for exclusion
     */
    isTransactionSelectedForExclusion(transactionId: string): boolean {
        return this.selectedTransactionsForExclusion.has(transactionId);
    }

    /**
     * Toggle select all transactions for exclusion
     */
    toggleSelectAllForExclusion() {
        if (this.selectAllForExclusion) {
            // Select all visible transactions
            this.filteredTransactions.forEach((t: Transaction) => {
                this.selectedTransactionsForExclusion.add(t.id);
            });
        } else {
            // Deselect all
            this.selectedTransactionsForExclusion.clear();
        }
    }

    /**
     * Update select all checkbox state
     */
    private updateSelectAllState() {
        const visibleTransactions = this.filteredTransactions;
        if (visibleTransactions.length === 0) {
            this.selectAllForExclusion = false;
            return;
        }
        
        this.selectAllForExclusion = visibleTransactions.every((t: Transaction) => 
            this.selectedTransactionsForExclusion.has(t.id)
        );
    }

    /**
     * Bulk exclude selected transactions
     */
    async onBulkExcludeTransactions() {
        if (this.selectedTransactionsForExclusion.size === 0) {
            return;
        }
        
        try {
            const transactionIds = Array.from(this.selectedTransactionsForExclusion);
            await this.reconciliationService.bulkExcludeTransactions(transactionIds);
            
            // Clear selection
            this.selectedTransactionsForExclusion.clear();
            this.selectAllForExclusion = false;
            
            // Clear selected transaction if it was excluded
            if (this.selectedTransaction && transactionIds.includes(this.selectedTransaction.id)) {
                this.selectedTransaction = null;
            }

            // Reload data to reflect the changes
            await this.loadData();

        } catch (error) {
            console.error('Error bulk excluding transactions:', error);
            // You might want to show an error message to the user here
        }
    }

    /**
     * Get count of selected transactions for exclusion
     */
    getSelectedForExclusionCount(): number {
        return this.selectedTransactionsForExclusion.size;
    }

    /**
     * Load excluded transactions
     */
    async loadExcludedTransactions() {
        if (!this.selectedMonth) return;
        
        try {
            this.loadingExcluded = true;
            const [year, month] = this.selectedMonth.split('-').map(Number);
            const dbTransactions = await this.reconciliationService.getExcludedTransactions(year, month);
            
            // Transform database transactions to component format
            this.excludedTransactions = dbTransactions.map(t => ({
                id: t.id,
                date: new Date(t.date).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: '2-digit', 
                    day: '2-digit' 
                }),
                description: t.name || t.description || 'Unknown Transaction',
                amount: `$${(t.amount || 0).toFixed(2)} USD`,
                type: (t.amount || 0) >= 0 ? 'positive' : 'negative',
                isRefund: false,
                subtext: t.bank_source || undefined,
                account: this.mapAccountIdToName(t.account_id)
            }));
            
            this.excludedCount = this.excludedTransactions.length;
        } catch (error) {
            console.error('Error loading excluded transactions:', error);
            this.excludedTransactions = [];
            this.excludedCount = 0;
        } finally {
            this.loadingExcluded = false;
        }
    }
}