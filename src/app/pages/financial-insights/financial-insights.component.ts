import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { DropdownModule } from 'primeng/dropdown';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ChartModule } from 'primeng/chart';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { SupabaseService } from '../service/supabase.service';
import { AiInsightsService, MonthlySpendingSummary } from '../service/ai-insights.service';

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
        ChartModule,
        ToastModule
    ],
    providers: [MessageService],
    template: `
        <div class="card">
            <h1>Financial Insights & Analytics</h1>
            <p>AI-powered spending analysis and financial trends</p>
            
            <div class="flex gap-3 mb-4">
                <p-dropdown 
                    [options]="monthOptions" 
                    [(ngModel)]="selectedMonth"
                    optionLabel="label"
                    optionValue="value"
                    placeholder="Select Month">
                </p-dropdown>
                <p-button 
                    icon="pi pi-refresh" 
                    label="Refresh" 
                    (onClick)="loadInsights()"
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

                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div class="card flex flex-col gap-4">
                        <h3>Spending by Category</h3>
                        <p-chart 
                            type="pie" 
                            [data]="pieChartData" 
                            [options]="pieChartOptions"
                            [style]="{'width': '100%', 'height': '300px'}">
                        </p-chart>
                    </div>

                    <div class="card flex flex-col gap-4">
                        <h3>Monthly Spending Trends</h3>
                        <p-chart 
                            type="line" 
                            [data]="lineChartData" 
                            [options]="lineChartOptions"
                            [style]="{'width': '100%', 'height': '300px'}">
                        </p-chart>
                    </div>
                </div>

                <div class="card flex flex-col gap-4">
                    <h3>Category Breakdown</h3>
                    <table class="w-full">
                        <thead>
                            <tr class="border-b">
                                <th class="text-left p-3">Category</th>
                                <th class="text-right p-3">Amount</th>
                                <th class="text-right p-3">Percentage</th>
                                <th class="text-right p-3">Transactions</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr *ngFor="let category of monthlySummary.categoryBreakdown" class="border-b">
                                <td class="p-3">{{ category.category }}</td>
                                <td class="text-right p-3 font-medium">{{ category.amount | currency }}</td>
                                <td class="text-right p-3">{{ category.percentage.toFixed(1) }}%</td>
                                <td class="text-right p-3">{{ category.transactionCount }}</td>
                            </tr>
                        </tbody>
                    </table>
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

    // Chart data
    pieChartData: any;
    pieChartOptions: any;
    lineChartData: any;
    lineChartOptions: any;

    constructor(
        private supabaseService: SupabaseService,
        private aiInsightsService: AiInsightsService,
        private messageService: MessageService
    ) {}

    ngOnInit() {
        this.initializeMonthOptions();
        this.initializeCharts();
        // this.loadInsights();
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

    private initializeCharts() {
        // Pie chart options
        this.pieChartOptions = {
            plugins: {
                legend: {
                    position: 'bottom'
                }
            },
            responsive: true,
            maintainAspectRatio: false
        };

        // Line chart options
        this.lineChartOptions = {
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value: any) {
                            return '$' + value.toFixed(0);
                        }
                    }
                }
            },
            responsive: true,
            maintainAspectRatio: false
        };
    }

    async loadInsights() {
        if (!this.selectedMonth) return;

        this.loading = true;
        try {
            const [year, month] = this.selectedMonth.split('-').map(Number);
            const summary = await this.aiInsightsService.generateMonthlyInsights(year, month).toPromise();
            
            if (summary) {
                this.monthlySummary = summary;
                this.updateCharts();
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

    private updateCharts() {
        if (!this.monthlySummary) return;

        // Update pie chart
        this.pieChartData = {
            labels: this.monthlySummary.categoryBreakdown.map(c => c.category),
            datasets: [{
                data: this.monthlySummary.categoryBreakdown.map(c => c.amount),
                backgroundColor: this.monthlySummary.categoryBreakdown.map(c => this.getCategoryColor(c.category)),
                borderWidth: 2,
                borderColor: '#ffffff'
            }]
        };

        // Update line chart (last 6 months)
        this.loadSpendingTrends();
    }

    private async loadSpendingTrends() {
        try {
            const trends = await this.aiInsightsService.getSpendingTrends(6).toPromise();
            if (trends) {
                this.lineChartData = {
                    labels: trends.map((t: any) => t.month),
                    datasets: [{
                        label: 'Total Spending',
                        data: trends.map((t: any) => t.totalSpent),
                        borderColor: '#3B82F6',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        tension: 0.4,
                        fill: true
                    }]
                };
            }
        } catch (error) {
            console.error('Error loading spending trends:', error);
        }
    }

    getCategoryColor(category: string): string {
        const colors = [
            '#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6',
            '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1',
            '#14B8A6', '#64748B', '#F472B6', '#A78BFA', '#FBBF24'
        ];
        
        const index = category.charCodeAt(0) % colors.length;
        return colors[index];
    }
} 