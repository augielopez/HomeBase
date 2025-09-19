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
import { ReconciliationService } from '../service/reconciliation.service';
import { Transaction as DbTransaction } from '../../interfaces/transaction.interface';

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
        PaginatorModule
    ],
    templateUrl: './reconciliation.component.html',
    styleUrls: ['./reconciliation.component.scss']
})
export class ReconciliationComponent {
    selectedMonth: string = '';
    monthOptions: any[] = [];
    activeTabValue: string = '0';
    selectedAccount: string = '';
    accountOptions: any[] = [];
    unreconciledCount: number = 3;
    billsCount: number = 3;
    matchedCount: number = 0;
    
    // Data arrays
    transactions: Transaction[] = [];
    bills: Bill[] = [];
    matchedTransactions: MatchedTransaction[] = [];
    
    // Loading states
    loadingTransactions = false;
    loadingBills = false;
    loadingMatched = false;
    
    // Selected transaction and bill data
    selectedTransaction: Transaction | null = null;
    selectedBill: Bill | null = null;

    // Search functionality
    transactionSearchTerm: string = '';
    billSearchTerm: string = '';

    // Pagination
    itemsPerPage: number = 30;
    currentTransactionPage: number = 1;
    currentBillPage: number = 1;

    constructor(private reconciliationService: ReconciliationService) {
        this.initializeMonthOptions();
        this.initializeAccountOptions();
        this.initializeTransactionData();
        this.initializeBillData();
        this.initializeMatchedTransactionsData();
        this.loadData();
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
        // Sample account options - in a real app, this would come from a service
        this.accountOptions = [
            { id: '1', name: 'Bank Checking Account' },
            { id: '2', name: 'US Bank Checking' },
            { id: '3', name: 'Fidelity Checking' },
            { id: '4', name: 'First Tech Checking' },
            { id: '5', name: 'Marcus Savings' }
        ];
        
        // Set default selection
        this.selectedAccount = this.accountOptions[0]?.id || '';
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

    // Filtered data for search functionality with pagination
    get filteredTransactions(): Transaction[] {
        let filtered = this.transactions;
        
        // Apply search filter if search term exists
        if (this.transactionSearchTerm.trim()) {
            const searchTerm = this.transactionSearchTerm.toLowerCase();
            filtered = this.transactions.filter(transaction => 
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
        if (!this.transactionSearchTerm.trim()) {
            return this.transactions.length;
        }
        
        const searchTerm = this.transactionSearchTerm.toLowerCase();
        return this.transactions.filter(transaction => 
            transaction.description.toLowerCase().includes(searchTerm) ||
            transaction.amount.toLowerCase().includes(searchTerm) ||
            (transaction.subtext && transaction.subtext.toLowerCase().includes(searchTerm))
        ).length;
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
            await this.loadUnreconciledTransactions();
            await this.loadUnmatchedBills();
            await this.loadMatchedTransactions();
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
                amount: `$${t.amount.toFixed(2)} USD`,
                type: t.amount >= 0 ? 'positive' : 'negative',
                isRefund: false, // You can add logic to detect refunds
                subtext: t.bank_source || undefined
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
                id: item.bill.id, // bill id
                date: item.bill.due_date,
                merchant: item.name, // account_name
                amount: `-$${item.bill.amount_due} USD`,
                category: {
                    icon: 'pi pi-file', // You can customize this based on bill type
                    name: 'Other'
                }
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
                transactionAmount: `$${t.amount.toFixed(2)} USD`,
                billDate: t.bill.due_date,
                billName: t.bill?.account?.[0]?.name || t.bill?.account?.name || 'Unknown Bill',
                billAmount: t.bill ? `-$${t.bill.amount_due.toFixed(2)} USD` : '',
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
    onMonthChange() {
        this.loadData();
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
}