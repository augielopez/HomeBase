import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { DropdownModule } from 'primeng/dropdown';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ToastModule } from 'primeng/toast';
import { TableModule } from 'primeng/table';
import { MessageService } from 'primeng/api';
import { SupabaseService } from '../../service/supabase.service';
import { AiInsightsService, MonthlySpendingSummary } from '../services/ai-insights.service';

@Component({
    selector: 'app-financial-insights',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        RouterModule,
        ButtonModule,
        CardModule,
        DropdownModule,
        ProgressSpinnerModule,
        TableModule,
        ToastModule
    ],
    providers: [MessageService],
    styles: [`
        .text-gray-600 {
            color: #4b5563;
        }

        .text-red-600 {
            color: #dc2626;
        }

        .text-green-600 {
            color: #16a34a;
        }
    `],
    template: `
        <div class="card">
            <h1>Financial Insights & Analytics</h1>
            <p>AI-powered spending analysis and financial trends</p>
            
            <div class="flex gap-3 mb-4">
                <p-dropdown 
                    [options]="monthOptions" 
                    [(ngModel)]="selectedMonth"
                    (onChange)="onMonthChange()"
                    optionLabel="label"
                    optionValue="value"
                    placeholder="Select Month">
                </p-dropdown>
                <p-button 
                    icon="pi pi-refresh" 
                    label="Refresh" 
                    (onClick)="loadInsights(true)"
                    [loading]="loading">
                </p-button>
            </div>

            <div *ngIf="loading" class="flex justify-center items-center py-12">
                <p-progressSpinner></p-progressSpinner>
            </div>

            <div *ngIf="!loading && monthlySummary" class="space-y-6">
                <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div class="p-6 rounded-lg border border-blue-200">
                        <p class="text-sm text-blue-600 font-medium">Total Spent</p>
                        <p class="text-2xl font-bold text-blue-600">{{ monthlySummary.totalSpent | currency }}</p>
                    </div>
                    
                    <div class="p-6 rounded-lg border border-green-200">
                        <p class="text-sm text-green-600 font-medium">Total Income</p>
                        <p class="text-2xl font-bold text-green-600">{{ monthlySummary.totalIncome | currency }}</p>
                    </div>
                    
                    <div class="p-6 rounded-lg border border-purple-200">
                        <p class="text-sm text-purple-600 font-medium">Net Amount</p>
                        <p class="text-2xl font-bold" [class.text-purple-600]="monthlySummary.netAmount >= 0" [class.text-red-600]="monthlySummary.netAmount < 0">
                            {{ monthlySummary.netAmount | currency }}
                        </p>
                    </div>
                    
                    <div class="p-6 rounded-lg border border-orange-200">
                        <p class="text-sm text-orange-600 font-medium">Transactions</p>
                        <p class="text-2xl font-bold text-orange-600">{{ monthlySummary.transactionCount }}</p>
                    </div>
                </div>

                <div class="card flex flex-col gap-4">
                    <h3>Category Breakdown</h3>
                    <p-table 
                        [value]="monthlySummary.categoryBreakdown" 
                        dataKey="category"
                        [expandedRowKeys]="expandedRows"
                        (onRowExpand)="onRowExpand($event)" 
                        (onRowCollapse)="onRowCollapse($event)"
                        [tableStyle]="{ 'min-width': '50rem' }">
                        <ng-template #caption>
                            <div class="flex flex-wrap justify-end gap-2">
                                <p-button label="Expand All" icon="pi pi-plus" [text]="true" (onClick)="expandAll()" />
                                <p-button label="Collapse All" icon="pi pi-minus" [text]="true" (onClick)="collapseAll()" />
                            </div>
                        </ng-template>
                        <ng-template #header>
                            <tr>
                                <th style="width: 5rem"></th>
                                <th>Category</th>
                                <th class="text-right">Amount</th>
                                <th class="text-right">Percentage</th>
                                <th class="text-right">Transactions</th>
                            </tr>
                        </ng-template>
                        <ng-template #body let-category let-expanded="expanded">
                            <tr>
                                <td>
                                    <p-button 
                                        type="button" 
                                        [pRowToggler]="category" 
                                        [text]="true" 
                                        severity="secondary" 
                                        [rounded]="true" 
                                        [icon]="expanded ? 'pi pi-chevron-down' : 'pi pi-chevron-right'" />
                                </td>
                                <td class="font-medium">{{ category.category }}</td>
                                <td class="text-right font-medium">{{ category.amount | currency }}</td>
                                <td class="text-right">{{ category.percentage.toFixed(1) }}%</td>
                                <td class="text-right">{{ category.transactionCount }}</td>
                            </tr>
                        </ng-template>
                        <ng-template #expandedrow let-category>
                            <tr>
                                <td colspan="5">
                                    <div class="p-4">
                                        <h5 class="mb-3">Transactions in {{ category.category }}</h5>
                                        
                                        <div *ngIf="loadingTransactions[category.category]" class="text-center py-4">
                                            <p-progressSpinner [style]="{ width: '50px', height: '50px' }" />
                                            <p class="mt-2">Loading transactions...</p>
                                        </div>
                                        
                                        <p-table 
                                            *ngIf="!loadingTransactions[category.category] && categoryTransactions[category.category]"
                                            [value]="categoryTransactions[category.category]" 
                                            dataKey="id">
                                            <ng-template #header>
                                                <tr>
                                                    <th>Date</th>
                                                    <th>Description</th>
                                                    <th>Merchant</th>
                                                    <th>Matched Bill</th>
                                                    <th class="text-right">Amount</th>
                                                </tr>
                                            </ng-template>
                                            <ng-template #body let-transaction>
                                                <tr>
                                                    <td>{{ transaction.date | date:'MM/dd/yyyy' }}</td>
                                                    <td>{{ transaction.name }}</td>
                                                    <td class="text-gray-600">{{ transaction.merchantName }}</td>
                                                    <td class="text-gray-600">{{ transaction.billName }}</td>
                                                    <td class="text-right font-medium"
                                                        [class.text-red-600]="transaction.amount < 0"
                                                        [class.text-green-600]="transaction.amount > 0">
                                                        {{ transaction.amount | currency }}
                                                    </td>
                                                </tr>
                                            </ng-template>
                                            <ng-template #emptymessage>
                                                <tr>
                                                    <td colspan="5" class="text-center py-4">
                                                        No transactions found for this category.
                                                    </td>
                                                </tr>
                                            </ng-template>
                                        </p-table>
                                    </div>
                                </td>
                            </tr>
                        </ng-template>
                    </p-table>
                </div>

                <div class="card flex flex-col gap-4" *ngIf="monthlySummary.insights.length > 0">
                    <h3>AI-Powered Insights</h3>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div *ngFor="let insight of monthlySummary.insights" 
                             class="p-4 rounded-lg border"
                             [class.border-red-200]="insight.severity === 'high'"
                             [class.border-yellow-200]="insight.severity === 'medium'"
                             [class.border-green-200]="insight.severity === 'low'">
                            <h4 class="font-semibold mb-1">{{ insight.title }}</h4>
                            <p class="text-sm">{{ insight.description }}</p>
                            <div *ngIf="insight.amount" class="mt-2 text-sm font-medium">
                                Amount: {{ insight.amount }}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div *ngIf="!loading && !monthlySummary" class="text-center py-12">
                <h3>No Data Available</h3>
                <p>Import some transactions to see your financial insights.</p>
            </div>
        </div>

        <p-toast></p-toast>
    `
})
export class FinancialInsightsComponent implements OnInit {
    selectedMonth: string = '';
    monthOptions: any[] = [];
    monthlySummary: MonthlySpendingSummary | null = null;
    loading = false;
    
    // Category expansion tracking for p-table
    expandedRows: { [key: string]: boolean } = {};
    categoryTransactions: { [category: string]: any[] } = {};
    loadingTransactions: { [category: string]: boolean } = {};

    constructor(
        private supabaseService: SupabaseService,
        private aiInsightsService: AiInsightsService,
        private messageService: MessageService
    ) {}

    ngOnInit() {
        this.initializeMonthOptions();
        this.loadInsights(); // Load on init to show cached data
    }

    private initializeMonthOptions() {
        const currentDate = new Date();
        const options = [];
        
        for (let i = 0; i < 12; i++) {
            const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
            const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            const label = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
            
            options.push({ label, value });
        }
        
        this.monthOptions = options;
        this.selectedMonth = options[0].value;
    }

    onMonthChange() {
        // Clear expanded categories and transaction data when month changes
        this.expandedRows = {};
        this.categoryTransactions = {};
        this.loadingTransactions = {};
        
        // Load cached data when month changes (don't force refresh)
        this.loadInsights(false);
    }

    async loadInsights(forceRefresh: boolean = false) {
        if (!this.selectedMonth) return;

        this.loading = true;
        try {
            const [year, month] = this.selectedMonth.split('-').map(Number);
            
            // If not forcing refresh, try to load from cache first
            if (!forceRefresh) {
                const cachedSummary = await this.loadFromCache(year, month);
                if (cachedSummary) {
                    this.monthlySummary = cachedSummary;
                    this.loading = false;
                    return;
                }
            }
            
            // No cache or force refresh - calculate fresh data
            const summary = await this.aiInsightsService.generateMonthlyInsights(year, month).toPromise();
            
            if (summary) {
                this.monthlySummary = summary;
                // Save to cache
                await this.saveToCache(year, month, summary);
                
                this.messageService.add({
                    severity: 'success',
                    summary: 'Data Refreshed',
                    detail: 'Financial insights have been updated'
                });
            }
        } catch (error) {
            console.error('Error loading insights:', error);
            this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Failed to load financial insights'
            });
        } finally {
            this.loading = false;
        }
    }

    private async loadFromCache(year: number, month: number): Promise<MonthlySpendingSummary | null> {
        try {
            const userId = await this.supabaseService.getCurrentUserId();
            if (!userId) return null;

            const { data, error } = await this.supabaseService.getClient()
                .from('hb_monthly_financial_summaries')
                .select('*')
                .eq('user_id', userId)
                .eq('year', year)
                .eq('month', month)
                .single();

            if (error || !data) return null;

            // Convert cached data back to MonthlySpendingSummary format
            const categoryBreakdown = data.category_breakdown || [];
            return {
                totalSpent: parseFloat(data.total_spent),
                totalIncome: parseFloat(data.total_income),
                netAmount: parseFloat(data.net_amount),
                transactionCount: data.transaction_count,
                categoryBreakdown: categoryBreakdown,
                topCategories: categoryBreakdown.slice(0, 5).map((c: any) => c.category),
                insights: data.insights || []
            };
        } catch (error) {
            console.error('Error loading from cache:', error);
            return null;
        }
    }

    private async saveToCache(year: number, month: number, summary: MonthlySpendingSummary): Promise<void> {
        try {
            const userId = await this.supabaseService.getCurrentUserId();
            if (!userId) return;

            const cacheData = {
                user_id: userId,
                year: year,
                month: month,
                total_spent: summary.totalSpent,
                total_income: summary.totalIncome,
                net_amount: summary.netAmount,
                transaction_count: summary.transactionCount,
                category_breakdown: summary.categoryBreakdown,
                insights: summary.insights,
                updated_at: new Date().toISOString(),
                updated_by: 'USER'
            };

            // Use upsert to insert or update
            const { error } = await this.supabaseService.getClient()
                .from('hb_monthly_financial_summaries')
                .upsert(cacheData, {
                    onConflict: 'user_id,year,month'
                });

            if (error) {
                console.error('Error saving to cache:', error);
            }
        } catch (error) {
            console.error('Error saving to cache:', error);
        }
    }

    onRowExpand(event: any) {
        const category = event.data.category;
        // Load transactions for this category if not already loaded
        if (!this.categoryTransactions[category]) {
            this.loadCategoryTransactions(category);
        }
    }

    onRowCollapse(event: any) {
        // Optional: Clean up data when row is collapsed
        // For now, we'll keep the data cached
    }

    expandAll() {
        if (!this.monthlySummary) return;
        
        this.expandedRows = {};
        this.monthlySummary.categoryBreakdown.forEach((category) => {
            this.expandedRows[category.category] = true;
            // Load transactions for each category if not already loaded
            if (!this.categoryTransactions[category.category]) {
                this.loadCategoryTransactions(category.category);
            }
        });
    }

    collapseAll() {
        this.expandedRows = {};
    }

    async loadCategoryTransactions(category: string) {
        if (!this.selectedMonth) return;

        this.loadingTransactions[category] = true;
        
        try {
            const [year, month] = this.selectedMonth.split('-').map(Number);
            const userId = await this.supabaseService.getCurrentUserId();
            
            console.log('Loading transactions for category:', category);
            console.log('User ID:', userId);
            console.log('Year/Month:', year, month);
            
            if (!userId) {
                console.error('No user ID found');
                return;
            }

            // Get start and end dates for the month
            const startDate = new Date(year, month - 1, 1);
            const endDate = new Date(year, month, 0, 23, 59, 59);
            
            console.log('Date range:', startDate.toISOString(), 'to', endDate.toISOString());

            // First, get the category ID from the category name
            const { data: categoryData, error: categoryError } = await this.supabaseService.getClient()
                .from('hb_transaction_categories')
                .select('id')
                .eq('name', category)
                .single();

            console.log('Category lookup result:', { categoryData, categoryError });

            if (categoryError || !categoryData) {
                console.error('Error finding category:', categoryError);
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: `Failed to find category: ${category}. Error: ${categoryError?.message || 'Unknown'}`
                });
                return;
            }

            console.log('Found category ID:', categoryData.id);

            // Then fetch transactions for this category
            const { data: transactions, error } = await this.supabaseService.getClient()
                .from('hb_transactions')
                .select(`
                    id,
                    date,
                    name,
                    amount,
                    merchant_name,
                    bill:hb_bills(bill_name)
                `)
                .eq('user_id', userId)
                .eq('category_id', categoryData.id)
                .gte('date', startDate.toISOString())
                .lte('date', endDate.toISOString())
                .order('date', { ascending: false });

            console.log('Transactions query result:', { 
                count: transactions?.length || 0, 
                error,
                sample: transactions?.[0]
            });

            if (error) {
                console.error('Error loading category transactions:', error);
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: `Failed to load transactions: ${error.message}`
                });
            } else {
                this.categoryTransactions[category] = (transactions || []).map((t: any) => ({
                    id: t.id,
                    date: t.date,
                    name: t.name,
                    amount: t.amount,
                    merchantName: t.merchant_name || '-',
                    billName: t.bill?.bill_name || 'Not Matched'
                }));
                
                console.log('Loaded transactions:', this.categoryTransactions[category].length);
                console.log('Sample transaction:', this.categoryTransactions[category][0]);
            }
        } catch (error) {
            console.error('Exception in loadCategoryTransactions:', error);
            this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: `An unexpected error occurred: ${error}`
            });
        } finally {
            this.loadingTransactions[category] = false;
        }
    }
} 