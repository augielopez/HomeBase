import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ChipModule } from 'primeng/chip';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/dropdown';
import { CalendarModule } from 'primeng/calendar';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { DialogModule } from 'primeng/dialog';

import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MessageService } from 'primeng/api';
import { ConfirmationService } from 'primeng/api';
import { SupabaseService } from '../service/supabase.service';
import { CsvImportService } from '../service/csv-import.service';
import { ReconciliationOldService, ReconciliationResult, ReconciliationMatch } from '../service/reconciliation-old.service';
import { AiInsightsService, MonthlySpendingSummary, SpendingInsight } from '../service/ai-insights.service';
import { Transaction, TransactionCategory } from '../../interfaces';
import { Bill } from '../../interfaces/bill.interface';

@Component({
    selector: 'app-reconciliation-old',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        RouterModule,
        ButtonModule,
        CardModule,
        TableModule,
        TagModule,
        ChipModule,
        InputTextModule,
        DropdownModule,
        CalendarModule,
        ProgressSpinnerModule,
        DialogModule,
        ToastModule,
        ConfirmDialogModule
    ],
    providers: [MessageService, ConfirmationService],
    template: `
        <div class="card">
            <!-- Header -->
            <div class="flex justify-between items-center mb-6">
                <div>
                    <h1 class="text-3xl font-bold">Financial Reconciliation</h1>
                    <p class="mt-2">Manage your transactions and reconcile bills</p>
                </div>
                <div class="flex gap-3">
                    <p-button 
                        icon="pi pi-upload" 
                        label="Import CSV" 
                        (onClick)="showCsvUpload = true"
                        severity="secondary">
                    </p-button>
                    <p-button 
                        icon="pi pi-refresh" 
                        label="Reconcile Month" 
                        (onClick)="reconcileCurrentMonth()"
                        [loading]="reconciling"
                        severity="primary">
                    </p-button>
                </div>
            </div>

            <!-- Month Selector -->
            <div class="card mb-6">
                <div class="flex items-center gap-4">
                    <label class="font-medium">Select Month:</label>
                    <div class="flex gap-2 flex-wrap">
                        <p-chip 
                            *ngFor="let month of recentMonths; let i = index" 
                            [label]="month.label"
                            [removable]="false"
                            [style.background-color]="getTransparentBirthstoneColor(month.month)"
                            [style.color]="getBirthstoneColor(month.month)"
                            [style.border-color]="getBirthstoneColor(month.month)"
                            [style.border-width]="'2px'"
                            [style.border-style]="'solid'"
                            [class.ring-2]="selectedMonth === month.value"
                            [class.ring-blue-500]="selectedMonth === month.value"
                            [class.ring-offset-2]="selectedMonth === month.value"
                            [class.cursor-pointer]="true"
                            [class.hover:shadow-lg]="true"
                            [class.transition-all]="true"
                            [class.duration-200]="true"
                            (click)="selectedMonth = month.value; loadMonthData()">
                        </p-chip>
                    </div>
                </div>
            </div>

            <!-- Summary Cards -->
            <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6" *ngIf="monthlySummary">
                <div class="p-6 rounded-lg border border-blue-200">
                    <div class="flex items-center justify-between">
                        <div>
                            <div class="text-2xl font-bold text-blue-600">
                                <span *ngIf="monthlySummary.totalSpent !== null && monthlySummary.totalSpent !== undefined; else noSpent">
                                    {{ monthlySummary.totalSpent | currency }}
                                </span>
                                <ng-template #noSpent>
                                    <span class="text-gray-400">N/A</span>
                                </ng-template>
                            </div>
                            <div class="text-sm text-blue-500">Total Spent</div>
                        </div>
                        <i class="pi pi-dollar text-2xl text-blue-400"></i>
                    </div>
                </div>
                <div class="p-6 rounded-lg border border-green-200">
                    <div class="flex items-center justify-between">
                        <div>
                            <div class="text-2xl font-bold text-green-600">
                                <span *ngIf="monthlySummary.totalIncome !== null && monthlySummary.totalIncome !== undefined; else noIncome">
                                    {{ monthlySummary.totalIncome | currency }}
                                </span>
                                <ng-template #noIncome>
                                    <span class="text-gray-400">N/A</span>
                                </ng-template>
                            </div>
                            <div class="text-sm text-green-500">Total Income</div>
                        </div>
                        <i class="pi pi-arrow-up text-2xl text-green-400"></i>
                    </div>
                </div>
                <div class="p-6 rounded-lg border border-purple-200">
                    <div class="flex items-center justify-between">
                        <div>
                            <div class="text-2xl font-bold text-purple-600">
                                <span *ngIf="monthlySummary.netAmount !== null && monthlySummary.netAmount !== undefined; else noNetAmount">
                                    {{ monthlySummary.netAmount | currency }}
                                </span>
                                <ng-template #noNetAmount>
                                    <span class="text-gray-400">N/A</span>
                                </ng-template>
                            </div>
                            <div class="text-sm text-purple-500">Net Amount</div>
                        </div>
                        <i class="pi pi-chart-line text-2xl text-purple-400"></i>
                    </div>
                </div>
                <div class="p-6 rounded-lg border border-orange-200">
                    <div class="flex items-center justify-between">
                        <div>
                            <div class="text-2xl font-bold text-orange-600">{{ monthlySummary.transactionCount }}</div>
                            <div class="text-sm text-orange-500">Transactions</div>
                        </div>
                        <i class="pi pi-list text-2xl text-orange-400"></i>
                    </div>
                </div>
            </div>

            <!-- Reconciliation Results -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <!-- Matched Transactions -->
                <div class="card">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="text-lg font-semibold">Matched Transactions</h3>
                        <p-tag 
                            [value]="(reconciliationResult && reconciliationResult.summary ? reconciliationResult.summary.matchedCount : 0) + ' matches'" 
                            severity="success">
                        </p-tag>
                    </div>
                    <div class="max-h-96 overflow-y-auto">
                        <p-table 
                            [value]="reconciliationResult ? reconciliationResult.matched : []" 
                            [tableStyle]="{ 'min-width': '50rem' }"
                            [rowHover]="true">
                            <!-- Debug info -->
                            <ng-template pTemplate="caption">
                                <div class="text-xs text-gray-500">
                                    Debug: reconciliationResult = {{ reconciliationResult ? 'exists' : 'null' }}, 
                                    matched = {{ reconciliationResult?.matched?.length || 0 }} items
                                </div>
                            </ng-template>
                            <ng-template pTemplate="header">
                                <tr>
                                    <th>Transaction</th>
                                    <th>Bill</th>
                                    <th>Amount</th>
                                    <th>Confidence</th>
                                    <th>Actions</th>
                                </tr>
                            </ng-template>
                            <ng-template pTemplate="body" let-match>
                                <tr>
                                    <td>
                                        <div>
                                            <div class="font-medium">{{ match.accountName }}</div>
                                            <div class="text-sm text-gray-500">
                                                <span *ngIf="match.transaction.date; else noTransactionDate">
                                                    {{ match.transaction.date | date:'MMM dd' }}
                                                </span>
                                                <ng-template #noTransactionDate>
                                                    <span class="text-gray-400">N/A</span>
                                                </ng-template>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <div>
                                            <div class="font-medium">{{ match.bill.description }}</div>
                                            <div class="text-sm text-gray-500">
                                                Due: <span *ngIf="match.bill.due_date; else noBillDate">
                                                    {{ match.bill.due_date | date:'MMM dd' }}
                                                </span>
                                                <ng-template #noBillDate>
                                                    <span class="text-gray-400">N/A</span>
                                                </ng-template>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <span class="font-bold text-red-600">
                                            <span *ngIf="match.transaction.amount !== null && match.transaction.amount !== undefined; else noAmount">
                                                {{ match.transaction.amount | currency }}
                                            </span>
                                            <ng-template #noAmount>
                                                <span class="text-gray-400">N/A</span>
                                            </ng-template>
                                        </span>
                                    </td>
                                    <td>
                                        <div class="flex items-center gap-2">
                                            <div class="w-16 bg-gray-200 rounded-full h-2">
                                                <div 
                                                    class="bg-green-500 h-2 rounded-full" 
                                                    [style.width.%]="match.confidence * 100">
                                                </div>
                                            </div>
                                            <span class="text-sm">{{ (match.confidence * 100).toFixed(0) }}%</span>
                                        </div>
                                    </td>
                                    <td>
                                        <p-button 
                                            icon="pi pi-times" 
                                            size="small"
                                            severity="danger"
                                            [outlined]="true"
                                            (onClick)="removeMatch(match.transaction.id)"
                                            pTooltip="Remove match">
                                        </p-button>
                                    </td>
                                </tr>
                            </ng-template>
                            <ng-template pTemplate="emptymessage">
                                <tr>
                                    <td colspan="5" class="text-center py-8 text-gray-500">
                                        No matched transactions found
                                    </td>
                                </tr>
                            </ng-template>
                        </p-table>
                    </div>
                </div>

                <!-- Unmatched Items -->
                <div class="card">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="text-lg font-semibold">Unmatched Items</h3>
                        <div class="flex gap-2">
                            <p-tag 
                                [value]="(reconciliationResult && reconciliationResult.summary ? reconciliationResult.summary.unmatchedTransactionCount : 0) + ' transactions'" 
                                severity="warning">
                            </p-tag>
                        </div>
                    </div>
                    <div class="max-h-96 overflow-y-auto">
                        <p-table 
                            [value]="unmatchedItems || []" 
                            [tableStyle]="{ 'min-width': '50rem' }"
                            [rowHover]="true"
                            [loading]="!unmatchedItems || unmatchedItems.length === 0">
                            <!-- Debug info -->
                            <ng-template pTemplate="caption">
                                <div class="text-xs text-gray-500">
                                    Debug: unmatchedItems = {{ unmatchedItems?.length || 0 }} items, 
                                    reconciliationResult = {{ reconciliationResult ? 'exists' : 'null' }}
                                </div>
                            </ng-template>
                            <ng-template pTemplate="header">
                                <tr>
                                    <th>Type</th>
                                    <th>Description</th>
                                    <th>Amount</th>
                                    <th>Date</th>
                                    <th>Actions</th>
                                </tr>
                            </ng-template>
                            <ng-template pTemplate="body" let-item>
                                <tr>
                                    <td>
                                        <p-tag 
                                            [value]="item.type" 
                                            [severity]="item.type === 'transaction' ? 'warning' : 'danger'">
                                        </p-tag>
                                    </td>
                                    <td>
                                        <div class="font-medium">
                                            {{ item.type === 'transaction' ? item.name : item.description }}
                                        </div>
                                    </td>
                                    <td>
                                        <span class="font-bold" 
                                              [class.text-red-600]="item.type === 'transaction' && item.amount < 0"
                                              [class.text-green-600]="item.type === 'transaction' && item.amount > 0">
                                            <span *ngIf="item.amount !== null && item.amount !== undefined; else noAmount">
                                                {{ item.amount | currency }}
                                            </span>
                                            <ng-template #noAmount>
                                                <span class="text-gray-400">N/A</span>
                                            </ng-template>
                                        </span>
                                    </td>
                                    <td>
                                        <span *ngIf="item.type === 'transaction' && item.date; else billDate">
                                            {{ item.date | date:'MMM dd' }}
                                        </span>
                                        <ng-template #billDate>
                                            <span *ngIf="item.due_date; else noDate">
                                                {{ item.due_date | date:'MMM dd' }}
                                            </span>
                                            <ng-template #noDate>
                                                <span class="text-gray-400">N/A</span>
                                            </ng-template>
                                        </ng-template>
                                    </td>
                                    <td>
                                        <p-button 
                                            icon="pi pi-link" 
                                            size="small"
                                            severity="info"
                                            [outlined]="true"
                                            (onClick)="showManualMatchDialog(item); $event.stopPropagation()"
                                            pTooltip="Manual match"
                                            type="button">
                                        </p-button>
                                    </td>
                                </tr>
                            </ng-template>
                            <ng-template pTemplate="emptymessage">
                                <tr>
                                    <td colspan="5" class="text-center py-8 text-gray-500">
                                        <div *ngIf="!unmatchedItems || unmatchedItems.length === 0; else allMatched">
                                            <p-progressSpinner *ngIf="reconciling"></p-progressSpinner>
                                            <p *ngIf="!reconciling">No unmatched items found</p>
                                        </div>
                                        <ng-template #allMatched>
                                            All items are matched!
                                        </ng-template>
                                    </td>
                                </tr>
                            </ng-template>
                        </p-table>
                    </div>
                </div>
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
                <div class="rounded-lg">
                    <h4 class="font-medium mb-2">Selected Item:</h4>
                    <div class="text-sm">
                        <div><strong>Description:</strong> {{ selectedItem.type === 'transaction' ? selectedItem.name : selectedItem.description }}</div>
                                        <div><strong>Amount:</strong> 
                    <span *ngIf="selectedItem.amount !== null && selectedItem.amount !== undefined; else noAmount">
                        {{ selectedItem.amount | currency }}
                    </span>
                    <ng-template #noAmount>
                        <span class="text-gray-400">N/A</span>
                    </ng-template>
                </div>
                <div><strong>Date:</strong> 
                    <span *ngIf="selectedItem.type === 'transaction' && selectedItem.date; else billDate">
                        {{ selectedItem.date | date }}
                    </span>
                    <ng-template #billDate>
                        <span *ngIf="selectedItem.due_date; else noDate">
                            {{ selectedItem.due_date | date }}
                        </span>
                        <ng-template #noDate>
                            <span class="text-gray-400">N/A</span>
                        </ng-template>
                    </ng-template>
                </div>
                    </div>
                </div>

                <div>
                    <label class="block text-sm font-medium mb-2">Select Bill to Match:</label>
                    <p-dropdown 
                        [options]="availableBills || []" 
                        [(ngModel)]="selectedBillId"
                        optionLabel="account.name"
                        optionValue="id"
                        placeholder="Choose a bill"
                        [showClear]="true"
                        appendTo="body">
                        <ng-template let-bill pTemplate="item">
                            <div class="flex flex-col">        
                                <div class="text-sm">{{ bill.account?.name || 'No Account' }}</div>
                            </div>
                        </ng-template>
                        <ng-template let-bill pTemplate="selectedItem">
                            <div class="flex flex-col">
                                <div class="text-sm">{{ bill.account?.name || 'No Account' }}</div>
                            </div>
                        </ng-template>
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
                    [disabled]="!selectedItem || !selectedBillId">
                </p-button>
            </ng-template>
        </p-dialog>

        <!-- Toast for messages -->
        <p-toast></p-toast>
        
        <!-- Confirm dialog for confirmations -->
        <p-confirmDialog></p-confirmDialog>
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
export class ReconciliationOldComponent implements OnInit {
    selectedMonth: string = '';
    recentMonths: any[] = [];
    monthlySummary: MonthlySpendingSummary | null = null;
    reconciliationResult: ReconciliationResult | null = null;
    unmatchedItems: any[] = [];
    
    showCsvUpload = false;
    selectedFile: File | null = null;
    importing = false;
    
    showManualMatch = false;
    selectedItem: any = null;
    selectedBillId: string | null = null;
    availableBills: any[] = [];
    
    reconciling = false;

    constructor(
        private supabaseService: SupabaseService,
        private csvImportService: CsvImportService,
        private reconciliationService: ReconciliationOldService,
        private aiInsightsService: AiInsightsService,
        private messageService: MessageService,
        private confirmationService: ConfirmationService
    ) {}

    ngOnInit() {
        this.initializeMonthOptions();
        this.loadMonthData();
    }

    /**
     * Refresh month options and data
     */
    refreshMonthData() {
        this.initializeMonthOptions();
        this.loadMonthData();
    }

    /**
     * Initialize month options for chips
     */
    private initializeMonthOptions() {
        const currentDate = new Date();
        const recent = [];

        // Always show 12 months: current month + 11 previous months
        for (let i = 0; i < 12; i++) {
            const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
            const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            const label = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
            
            recent.push({ 
                label, 
                value, 
                month: date.toLocaleDateString('en-US', { month: 'short' })
            });
        }
        
        this.recentMonths = recent;
        this.selectedMonth = recent[0].value; // Always select current month
    }

    /**
     * Load data for selected month
     */
    loadMonthData() {
        if (!this.selectedMonth) return;

        const [year, month] = this.selectedMonth.split('-').map(Number);
        
        // Load monthly summary and insights
        this.aiInsightsService.generateMonthlyInsights(year, month).subscribe({
            next: (summary) => {
                this.monthlySummary = summary;
            },
            error: (error) => {
                console.error('Error loading monthly data:', error);
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'Failed to load monthly data'
                });
            }
        });

        // Load reconciliation data
        this.reconciliationService.reconcileMonth(year, month).subscribe({
            next: (result) => {
                try {
                    this.reconciliationResult = result;
                    this.updateUnmatchedItems();
                } catch (error) {
                    console.error('Error processing reconciliation result:', error);
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Processing Error',
                        detail: 'Failed to process reconciliation data'
                    });
                }
            },
            error: (error) => {
                console.error('Error loading reconciliation data:', error);
                this.messageService.add({
                    severity: 'error',
                    summary: 'Loading Error',
                    detail: 'Failed to load reconciliation data'
                });
            }
        });
    }

    /**
     * Load all available bills for manual matching
     */
    private async loadAvailableBills() {
        try {
            const { data: bills, error } = await this.supabaseService.getClient()
                .from('hb_bills')
                .select(`
                    id,
                    bill_name,
                    account_id
                `)
                .eq('status', 'Active')
                .order('bill_name', { ascending: true });

            if (error) {
                console.error('Error loading bills:', error);
                this.availableBills = [];
                return;
            }

            // Get account information for each bill
            const accountIds = [...new Set(bills?.map(bill => bill.account_id).filter(id => id != null) || [])];
            const { data: accounts, error: accountError } = await this.supabaseService.getClient()
                .from('hb_accounts')
                .select('id, name')
                .in('id', accountIds);

            if (accountError) {
                console.error('Error loading accounts:', accountError);
                this.availableBills = [];
                return;
            }

            // Create a map of account_id to account info
            const accountMap = new Map(accounts?.map(account => [account.id, account]) || []);

            // Transform the data to match the expected structure
            this.availableBills = (bills?.map(bill => ({
                id: bill.id,
                bill_name: bill.bill_name,
                account: {
                    id: bill.account_id,
                    name: bill.account_id ? (accountMap.get(bill.account_id)?.name || 'Unknown Account') : 'No Account'
                }
            })) as unknown as Bill[]) || [];
            
            console.log('Available bills for matching:', this.availableBills);
        } catch (error) {
            console.error('Error loading available bills:', error);
            this.availableBills = [];
        }
    }

    /**
     * Update unmatched items list
     */
    private updateUnmatchedItems() {
        try {
            console.log('updateUnmatchedItems: reconciliationResult:', this.reconciliationResult);
            
            if (!this.reconciliationResult) {
                console.log('updateUnmatchedItems: No reconciliation result, clearing unmatched items');
                this.unmatchedItems = [];
                return;
            }

            console.log('updateUnmatchedItems: unmatchedTransactions:', this.reconciliationResult.unmatchedTransactions);

            // Only include unmatched transactions, exclude bills
            const transactions = (this.reconciliationResult.unmatchedTransactions || []).map(t => ({ 
                ...t, 
                type: 'transaction',
                // Ensure amount is a number
                amount: this.parseAmount(t.amount),
                // Ensure date is a valid date string
                date: this.parseDate(t.date)
            }));
            
            // Only show transactions in unmatched items
            this.unmatchedItems = [...transactions];
            console.log('Updated unmatched items (debit transactions only):', this.unmatchedItems);
            
            // Log any data validation issues for debugging
            this.logDataValidationIssues(transactions, 'transactions');
        } catch (error) {
            console.error('Error updating unmatched items:', error);
            this.unmatchedItems = [];
            this.messageService.add({
                severity: 'error',
                summary: 'Data Error',
                detail: 'Failed to process reconciliation data'
            });
        }
    }

    /**
     * Parse and validate amount values
     */
    private parseAmount(amount: any): number {
        try {
            if (amount === null || amount === undefined) return 0;
            
            // If it's already a number, return it
            if (typeof amount === 'number') {
                return isNaN(amount) ? 0 : amount;
            }
            
            // If it's a string, try to parse it
            if (typeof amount === 'string') {
                // Remove currency symbols, commas, and spaces
                const cleanAmount = amount.replace(/[$,]/g, '').trim();
                if (cleanAmount === '') return 0;
                
                const parsed = parseFloat(cleanAmount);
                return isNaN(parsed) ? 0 : parsed;
            }
            
            return 0;
        } catch (error) {
            console.warn('Error parsing amount:', amount, error);
            return 0;
        }
    }

    /**
     * Parse and validate date values
     */
    private parseDate(date: any): string {
        try {
            if (date === null || date === undefined) return '';
            
            // If it's already a valid date string, return it
            if (typeof date === 'string' && this.isValidDateString(date)) {
                return date;
            }
            
            // If it's a Date object, convert to ISO string
            if (date instanceof Date) {
                return date.toISOString().split('T')[0];
            }
            
            // Try to parse the date string
            if (typeof date === 'string') {
                const parsedDate = new Date(date);
                if (!isNaN(parsedDate.getTime())) {
                    return parsedDate.toISOString().split('T')[0];
                }
            }
            
            return '';
        } catch (error) {
            console.warn('Error parsing date:', date, error);
            return '';
        }
    }

    /**
     * Check if a string is a valid date string
     */
    private isValidDateString(dateString: string): boolean {
        try {
            if (!dateString || typeof dateString !== 'string') return false;
            
            // Check if it's in ISO format (YYYY-MM-DD)
            if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
                const date = new Date(dateString);
                return !isNaN(date.getTime());
            }
            
            // Check if it's a valid date format
            const date = new Date(dateString);
            return !isNaN(date.getTime());
        } catch (error) {
            console.warn('Error validating date string:', dateString, error);
            return false;
        }
    }

    /**
     * Log data validation issues for debugging
     */
    private logDataValidationIssues(items: any[], type: string) {
        const issues = items.filter(item => {
            const hasAmountIssue = item.amount !== null && item.amount !== undefined && 
                                 (typeof item.amount !== 'number' || isNaN(item.amount));
            const hasDateIssue = item.date && !this.isValidDateString(item.date);
            const hasDueDateIssue = item.due_date && !this.isValidDateString(item.due_date);
            
            return hasAmountIssue || hasDateIssue || hasDueDateIssue;
        });
        
        if (issues.length > 0) {
            console.warn(`Data validation issues found in ${type}:`, issues);
        }
    }


    /**
     * Get birthstone color for the given month
     */
    getBirthstoneColor(month: string): string {
        const colors: { [key: string]: string } = {
            'Jan': '#DC2626', // Garnet - Softer red
            'Feb': '#7C3AED', // Amethyst - Softer purple
            'Mar': '#06B6D4', // Aquamarine - Softer blue
            'Apr': '#6B7280', // Diamond - Neutral gray
            'May': '#059669', // Emerald - Softer green
            'Jun': '#8B5CF6', // Alexandrite - Softer lavender
            'Jul': '#B91C1C', // Ruby - Softer red
            'Aug': '#10B981', // Peridot - Softer green
            'Sep': '#3B82F6', // Sapphire - Softer blue
            'Oct': '#EC4899', // Tourmaline - Softer pink
            'Nov': '#F59E0B', // Topaz - Softer amber
            'Dec': '#0891B2'  // Blue Topaz - Softer turquoise
        };
        return colors[month] || '#6B7280';
    }

    /**
     * Get transparent birthstone color for chips
     */
    getTransparentBirthstoneColor(month: string): string {
        const baseColor = this.getBirthstoneColor(month);
        // Convert to transparent version with 15% opacity for better balance
        return baseColor + '26'; // Adding 26 hex for 15% opacity
    }

    /**
     * Get contrast color for text readability
     */
    getContrastColor(backgroundColor: string): string {
        // Convert hex to RGB
        const hex = backgroundColor.replace('#', '');
        const r = parseInt(hex.substr(0, 2), 16);
        const g = parseInt(hex.substr(2, 2), 16);
        const b = parseInt(hex.substr(4, 2), 16);
        
        // Calculate luminance
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        
        // Return black for light backgrounds, white for dark backgrounds
        return luminance > 0.5 ? '#000000' : '#FFFFFF';
    }



    /**
     * Reconcile current month
     */
    reconcileCurrentMonth() {
        if (!this.selectedMonth) {
            console.log('Reconciliation: No month selected');
            return;
        }

        console.log('Reconciliation: Starting reconciliation for month:', this.selectedMonth);
        this.reconciling = true;
        const [year, month] = this.selectedMonth.split('-').map(Number);

        this.reconciliationService.reconcileMonth(year, month).subscribe({
            next: (result) => {
                console.log('Reconciliation Component: Received result:', result);
                this.reconciliationResult = result;
                this.updateUnmatchedItems();
                this.reconciling = false;
                
                this.messageService.add({
                    severity: 'success',
                    summary: 'Reconciliation Complete',
                    detail: `Found ${result.summary.matchedCount} matches`
                });
            },
            error: (error) => {
                console.error('Error during reconciliation:', error);
                this.reconciling = false;
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'Failed to reconcile transactions'
                });
            }
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
     * Import CSV file
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
                
                // Reload month data
                this.loadMonthData();
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
     * Remove a match
     */
    removeMatch(transactionId: string) {
        this.confirmationService.confirm({
            message: 'Are you sure you want to remove this match?',
            accept: () => {
                this.reconciliationService.removeMatch(transactionId).subscribe({
                    next: (success) => {
                        if (success) {
                            this.reconcileCurrentMonth(); // Reload reconciliation data
                            this.messageService.add({
                                severity: 'success',
                                summary: 'Match Removed',
                                detail: 'Transaction-bill match has been removed'
                            });
                        }
                    }
                });
            }
        });
    }

    /**
     * Show manual match dialog
     */
    showManualMatchDialog(item: any) {
        console.log('Opening manual match dialog for item:', item);
        
        // Ensure the item has proper data types before setting it
        const validatedItem = {
            ...item,
            amount: this.parseAmount(item.amount),
            date: this.parseDate(item.date),
            due_date: this.parseDate(item.due_date)
        };
        
        this.selectedItem = validatedItem;
        this.selectedBillId = null;
        this.loadAvailableBills();
        this.showManualMatch = true;
        console.log('Dialog should be visible:', this.showManualMatch);
        
        // Force change detection
        setTimeout(() => {
            console.log('Dialog visibility after timeout:', this.showManualMatch);
            const dialogElement = document.querySelector('p-dialog');
            console.log('Dialog element found:', dialogElement);
        }, 100);
    }



    /**
     * Apply manual match
     */
    applyManualMatch() {
        if (!this.selectedItem || !this.selectedBillId) return;

        if (this.selectedItem.type === 'transaction') {
            this.reconciliationService.manualMatch(this.selectedItem.id, this.selectedBillId).subscribe({
                next: (success) => {
                    if (success) {
                        this.showManualMatch = false;
                        this.reconcileCurrentMonth(); // Reload reconciliation data
                        this.messageService.add({
                            severity: 'success',
                            summary: 'Match Applied',
                            detail: 'Transaction has been matched to bill'
                        });
                    } else {
                        this.messageService.add({
                            severity: 'error',
                            summary: 'Match Failed',
                            detail: 'Failed to match transaction to bill. Check console for details.'
                        });
                    }
                },
                error: (error) => {
                    console.error('Manual match subscription error:', error);
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Match Error',
                        detail: 'An error occurred while matching transaction to bill. Check console for details.'
                    });
                }
            });
        }
    }

} 