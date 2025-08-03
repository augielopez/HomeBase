import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/dropdown';
import { CalendarModule } from 'primeng/calendar';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { DialogModule } from 'primeng/dialog';
import { ChartModule } from 'primeng/chart';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MessageService } from 'primeng/api';
import { ConfirmationService } from 'primeng/api';
import { SupabaseService } from '../service/supabase.service';
import { CsvImportService } from '../service/csv-import.service';
import { ReconciliationService, ReconciliationResult, ReconciliationMatch } from '../service/reconciliation.service';
import { AiInsightsService, MonthlySpendingSummary, SpendingInsight } from '../service/ai-insights.service';
import { Transaction, TransactionCategory } from '../../interfaces';
import { Bill } from '../../interfaces/bill.interface';

@Component({
    selector: 'app-reconciliation',
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
        ProgressSpinnerModule,
        DialogModule,
        ChartModule,
        ToastModule,
        ConfirmDialogModule
    ],
    providers: [MessageService, ConfirmationService],
    template: `
        <div class="card">
            <!-- Header -->
            <div class="flex justify-between items-center mb-6">
                <div>
                    <h1 class="text-3xl font-bold">Financial Reconciliation & Insights</h1>
                    <p class="mt-2">Manage your transactions, reconcile bills, and get AI-powered insights</p>
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
                    <div class="flex gap-1 flex-wrap">
                        <div 
                            *ngFor="let month of recentMonths; let i = index" 
                            class="px-3 py-1.5 rounded-full cursor-pointer text-xs font-medium transition-all duration-200 hover:shadow-md border border-gray-300"
                            [style.background-color]="getBirthstoneColor(month.month)"
                            [style.color]="getContrastColor(getBirthstoneColor(month.month))"
                            [class.ring-2]="selectedMonth === month.value"
                            [class.ring-blue-500]="selectedMonth === month.value"
                            [class.ring-offset-2]="selectedMonth === month.value"
                            (click)="selectedMonth = month.value; loadMonthData()">
                            {{ month.label }}
                        </div>
                    </div>
                </div>
            </div>

            <!-- Summary Cards -->
            <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6" *ngIf="monthlySummary">
                <div class="p-6 rounded-lg border border-blue-200">
                    <div class="flex items-center justify-between">
                        <div>
                            <div class="text-2xl font-bold text-blue-600">{{ monthlySummary.totalSpent | currency }}</div>
                            <div class="text-sm text-blue-500">Total Spent</div>
                        </div>
                        <i class="pi pi-dollar text-2xl text-blue-400"></i>
                    </div>
                </div>
                <div class="p-6 rounded-lg border border-green-200">
                    <div class="flex items-center justify-between">
                        <div>
                            <div class="text-2xl font-bold text-green-600">{{ monthlySummary.totalIncome | currency }}</div>
                            <div class="text-sm text-green-500">Total Income</div>
                        </div>
                        <i class="pi pi-arrow-up text-2xl text-green-400"></i>
                    </div>
                </div>
                <div class="p-6 rounded-lg border border-purple-200">
                    <div class="flex items-center justify-between">
                        <div>
                            <div class="text-2xl font-bold text-purple-600">{{ monthlySummary.netAmount | currency }}</div>
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
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6" *ngIf="reconciliationResult">
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
                                            <div class="font-medium">{{ match.transaction.name }}</div>
                                            <div class="text-sm text-gray-500">{{ match.transaction.date | date:'MMM dd' }}</div>
                                        </div>
                                    </td>
                                    <td>
                                        <div>
                                            <div class="font-medium">{{ match.bill.description }}</div>
                                            <div class="text-sm text-gray-500">Due: {{ match.bill.due_date | date:'MMM dd' }}</div>
                                        </div>
                                    </td>
                                    <td>
                                        <span class="font-bold text-red-600">
                                            {{ match.transaction.amount | currency }}
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
                            <p-tag 
                                [value]="(reconciliationResult && reconciliationResult.summary ? reconciliationResult.summary.unmatchedBillCount : 0) + ' bills'" 
                                severity="danger">
                            </p-tag>
                        </div>
                    </div>
                    <div class="max-h-96 overflow-y-auto">
                        <p-table 
                            [value]="unmatchedItems || []" 
                            [tableStyle]="{ 'min-width': '50rem' }"
                            [rowHover]="true">
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
                                            {{ item.amount | currency }}
                                        </span>
                                    </td>
                                    <td>
                                        {{ item.type === 'transaction' ? (item.date | date:'MMM dd') : (item.due_date | date:'MMM dd') }}
                                    </td>
                                    <td>
                                        <p-button 
                                            icon="pi pi-link" 
                                            size="small"
                                            severity="info"
                                            [outlined]="true"
                                            (onClick)="showManualMatchDialog(item)"
                                            pTooltip="Manual match">
                                        </p-button>
                                    </td>
                                </tr>
                            </ng-template>
                            <ng-template pTemplate="emptymessage">
                                <tr>
                                    <td colspan="5" class="text-center py-8 text-gray-500">
                                        All items are matched!
                                    </td>
                                </tr>
                            </ng-template>
                        </p-table>
                    </div>
                </div>
            </div>

            <!-- Category Breakdown -->
            <div class="card mb-6" *ngIf="monthlySummary">
                <h3 class="text-lg font-semibold mb-4">Category Breakdown</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <p-chart 
                            type="pie" 
                            [data]="pieChartData" 
                            [options]="pieChartOptions"
                            [style]="{ width: '100%', height: '300px' }">
                        </p-chart>
                    </div>
                                            <div class="space-y-3">
                        <div 
                            *ngFor="let category of (monthlySummary?.categoryBreakdown || []).slice(0, 8)" 
                            class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div class="flex items-center gap-3">
                                <div 
                                    class="w-4 h-4 rounded-full" 
                                    [style.background-color]="getCategoryColor(category.category)">
                                </div>
                                <span class="font-medium">{{ category.category }}</span>
                            </div>
                            <div class="text-right">
                                <div class="font-bold">{{ category.amount | currency }}</div>
                                <div class="text-sm text-gray-500">{{ category.percentage.toFixed(1) }}%</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- AI Insights -->
            <div class="card" *ngIf="monthlySummary && monthlySummary.insights && monthlySummary.insights.length > 0">
                <h3 class="text-lg font-semibold mb-4">AI-Powered Insights</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    <div 
                    *ngFor="let insight of monthlySummary?.insights || []" 
                    class="p-4 rounded-lg border"
                    [class.border-red-200]="insight.severity === 'high'"
                    [class.border-yellow-200]="insight.severity === 'medium'"
                    [class.border-green-200]="insight.severity === 'low'"
                    [class.bg-red-50]="insight.severity === 'high'"
                    [class.bg-yellow-50]="insight.severity === 'medium'"
                    [class.bg-green-50]="insight.severity === 'low'">
                        <div class="flex items-start justify-between mb-2">
                            <h4 class="font-semibold">{{ insight.title }}</h4>
                            <p-tag 
                                [value]="insight.type.replace('_', ' ')" 
                                [severity]="getInsightSeverity(insight.severity)">
                            </p-tag>
                        </div>
                        <p class="text-sm text-gray-600 mb-2">{{ insight.description }}</p>
                        <div class="flex items-center justify-between text-sm">
                            <span *ngIf="insight.amount" class="font-medium">
                                {{ insight.amount | currency }}
                            </span>
                            <span *ngIf="insight.percentage" class="text-gray-500">
                                {{ insight.percentage.toFixed(1) }}% of total
                            </span>
                        </div>
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
                
                <div *ngIf="selectedFile" class="p-4 bg-blue-50 rounded-lg">
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
            [style]="{ width: '500px' }">
            <div class="space-y-4" *ngIf="selectedItem">
                <div class="p-4 bg-gray-50 rounded-lg">
                    <h4 class="font-medium mb-2">Selected Item:</h4>
                    <div class="text-sm">
                        <div><strong>Description:</strong> {{ selectedItem.type === 'transaction' ? selectedItem.name : selectedItem.description }}</div>
                        <div><strong>Amount:</strong> {{ selectedItem.amount | currency }}</div>
                        <div><strong>Date:</strong> {{ selectedItem.type === 'transaction' ? (selectedItem.date | date) : (selectedItem.due_date | date) }}</div>
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
                        [showClear]="true">
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
export class ReconciliationComponent implements OnInit {
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
    availableBills: Bill[] = [];
    
    reconciling = false;
    
    pieChartData: any;
    pieChartOptions: any;

    constructor(
        private supabaseService: SupabaseService,
        private csvImportService: CsvImportService,
        private reconciliationService: ReconciliationService,
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
                this.updatePieChart();
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
                this.reconciliationResult = result;
                this.updateUnmatchedItems();
            },
            error: (error) => {
                console.error('Error loading reconciliation data:', error);
            }
        });
    }

    /**
     * Update unmatched items list
     */
    private updateUnmatchedItems() {
        if (!this.reconciliationResult) {
            this.unmatchedItems = [];
            return;
        }

        this.unmatchedItems = [
            ...(this.reconciliationResult.unmatchedTransactions || []).map(t => ({ ...t, type: 'transaction' })),
            ...(this.reconciliationResult.unmatchedBills || []).map(b => ({ ...b, type: 'bill' }))
        ];
    }

    /**
     * Update pie chart data
     */
    private updatePieChart() {
        if (!this.monthlySummary || !this.monthlySummary.categoryBreakdown) {
            this.pieChartData = {
                labels: [],
                datasets: [{
                    data: [],
                    backgroundColor: [],
                    borderWidth: 2,
                    borderColor: '#ffffff'
                }]
            };
            return;
        }

        this.pieChartData = {
            labels: this.monthlySummary.categoryBreakdown.map(c => c.category),
            datasets: [{
                data: this.monthlySummary.categoryBreakdown.map(c => c.amount),
                backgroundColor: this.monthlySummary.categoryBreakdown.map(c => this.getCategoryColor(c.category)),
                borderWidth: 2,
                borderColor: '#ffffff'
            }]
        };

        this.pieChartOptions = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        usePointStyle: true,
                        padding: 20
                    }
                }
            }
        };
    }

    /**
     * Get birthstone color for month
     */
    getBirthstoneColor(month: string): string {
        const colors: { [key: string]: string } = {
            'Jan': '#FF6B6B', // Garnet
            'Feb': '#4ECDC4', // Amethyst
            'Mar': '#45B7D1', // Aquamarine
            'Apr': '#96CEB4', // Diamond
            'May': '#FFEAA7', // Emerald
            'Jun': '#DDA0DD', // Pearl
            'Jul': '#FF8B94', // Ruby
            'Aug': '#87CEEB', // Peridot
            'Sep': '#DDA0DD', // Sapphire
            'Oct': '#FFB347', // Opal
            'Nov': '#98D8C8', // Topaz
            'Dec': '#F7DC6F'  // Turquoise
        };
        return colors[month] || '#E5E7EB';
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
     * Get category color
     */
    getCategoryColor(category: string): string {
        const colors = [
            '#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6',
            '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1',
            '#14B8A6', '#64748B', '#F472B6', '#A78BFA', '#FBBF24'
        ];
        
        const index = category.charCodeAt(0) % colors.length;
        return colors[index];
    }

    /**
     * Get insight severity
     */
    getInsightSeverity(severity: string): string {
        switch (severity) {
            case 'high': return 'danger';
            case 'medium': return 'warning';
            case 'low': return 'info';
            default: return 'info';
        }
    }

    /**
     * Reconcile current month
     */
    reconcileCurrentMonth() {
        if (!this.selectedMonth) return;

        this.reconciling = true;
        const [year, month] = this.selectedMonth.split('-').map(Number);

        this.reconciliationService.reconcileMonth(year, month).subscribe({
            next: (result) => {
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
                            this.loadMonthData();
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
        this.selectedItem = item;
        this.selectedBillId = null;
        this.availableBills = this.reconciliationResult?.unmatchedBills || [];
        this.showManualMatch = true;
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
                        this.loadMonthData();
                        this.messageService.add({
                            severity: 'success',
                            summary: 'Match Applied',
                            detail: 'Transaction has been matched to bill'
                        });
                    }
                }
            });
        }
    }
} 