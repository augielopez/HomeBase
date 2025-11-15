import { Component, OnInit, OnDestroy, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';

// PrimeNG imports
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';
import { MessageService } from 'primeng/api';

// Services
import { SupabaseService } from '../../../service/supabase.service';

export interface MonthlySpending {
  month: string;
  spending: number;
  income: number;
  net: number;
}

export interface CategorySpending {
  category: string;
  amount: number;
  percentage: number;
}

export interface TopMerchant {
  merchant: string;
  amount: number;
  count: number;
}

@Component({
  selector: 'app-spending-charts',
  standalone: true,
  imports: [
    CommonModule,
    CardModule,
    ButtonModule,
    SkeletonModule
  ],
  providers: [MessageService],
  templateUrl: './spending-charts.component.html',
  styleUrls: ['./spending-charts.component.scss']
})
export class SpendingChartsComponent implements OnInit, OnDestroy {
  @Output() loadingChange = new EventEmitter<boolean>();

  private destroy$ = new Subject<void>();
  
  loading = true;
  
  // Chart data
  monthlySpending: MonthlySpending[] = [];
  categorySpending: CategorySpending[] = [];
  topMerchants: TopMerchant[] = [];
  
  // Chart options
  selectedPeriod: '6months' | '12months' = '12months';

  constructor(
    private supabaseService: SupabaseService,
    private messageService: MessageService
  ) {}

  ngOnInit() {
    this.loadSpendingData();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  async loadSpendingData() {
    try {
      this.loading = true;
      this.loadingChange.emit(true);

      const userId = await this.supabaseService.getCurrentUserId();
      
      // Load all chart data in parallel
      await Promise.all([
        this.loadMonthlySpending(userId),
        this.loadCategorySpending(userId),
        this.loadTopMerchants(userId)
      ]);

    } catch (error) {
      console.error('Error loading spending data:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to load spending charts data'
      });
    } finally {
      this.loading = false;
      this.loadingChange.emit(false);
    }
  }

  private async loadMonthlySpending(userId: string) {
    try {
      const monthsBack = this.selectedPeriod === '6months' ? 6 : 12;
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - monthsBack);
      startDate.setDate(1);
      startDate.setHours(0, 0, 0, 0);

      const { data: transactions, error } = await this.supabaseService.getClient()
        .from('hb_transactions')
        .select('amount, date')
        .eq('user_id', userId)
        .gte('date', startDate.toISOString())
        .order('date', { ascending: true });

      if (error) throw error;

      // Group by month
      const monthlyData = new Map<string, { spending: number; income: number }>();
      
      transactions?.forEach(transaction => {
        const date = new Date(transaction.date);
        const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
        
        if (!monthlyData.has(monthKey)) {
          monthlyData.set(monthKey, { spending: 0, income: 0 });
        }
        
        const data = monthlyData.get(monthKey)!;
        if (transaction.amount < 0) {
          data.spending += Math.abs(transaction.amount);
        } else {
          data.income += transaction.amount;
        }
      });

      // Convert to array and format
      this.monthlySpending = Array.from(monthlyData.entries()).map(([month, data]) => ({
        month: this.formatMonthLabel(month),
        spending: data.spending,
        income: data.income,
        net: data.income - data.spending
      })).sort((a, b) => a.month.localeCompare(b.month));

    } catch (error) {
      console.error('Error loading monthly spending:', error);
    }
  }

  private async loadCategorySpending(userId: string) {
    try {
      const currentMonth = new Date();
      currentMonth.setDate(1);
      currentMonth.setHours(0, 0, 0, 0);

      const nextMonth = new Date(currentMonth);
      nextMonth.setMonth(nextMonth.getMonth() + 1);

      const { data: transactions, error } = await this.supabaseService.getClient()
        .from('hb_transactions')
        .select(`
          amount,
          category:category_id (
            name
          )
        `)
        .eq('user_id', userId)
        .gte('date', currentMonth.toISOString())
        .lt('date', nextMonth.toISOString())
        .lt('amount', 0) // Only spending
        .not('category_id', 'is', null);

      if (error) throw error;

      // Group by category
      const categoryData = new Map<string, number>();
      let totalSpending = 0;

      transactions?.forEach(transaction => {
        const categoryName = (transaction.category as any)?.name || 'Uncategorized';
        const amount = Math.abs(transaction.amount);
        
        categoryData.set(categoryName, (categoryData.get(categoryName) || 0) + amount);
        totalSpending += amount;
      });

      // Convert to array and calculate percentages
      this.categorySpending = Array.from(categoryData.entries()).map(([category, amount]) => ({
        category,
        amount,
        percentage: totalSpending > 0 ? (amount / totalSpending) * 100 : 0
      })).sort((a, b) => b.amount - a.amount).slice(0, 8); // Top 8 categories

    } catch (error) {
      console.error('Error loading category spending:', error);
    }
  }

  private async loadTopMerchants(userId: string) {
    try {
      const currentMonth = new Date();
      currentMonth.setDate(1);
      currentMonth.setHours(0, 0, 0, 0);

      const nextMonth = new Date(currentMonth);
      nextMonth.setMonth(nextMonth.getMonth() + 1);

      const { data: transactions, error } = await this.supabaseService.getClient()
        .from('hb_transactions')
        .select('name, amount')
        .eq('user_id', userId)
        .gte('date', currentMonth.toISOString())
        .lt('date', nextMonth.toISOString())
        .lt('amount', 0); // Only spending

      if (error) throw error;

      // Group by merchant
      const merchantData = new Map<string, { amount: number; count: number }>();

      transactions?.forEach(transaction => {
        const merchantName = transaction.name;
        const amount = Math.abs(transaction.amount);
        
        if (!merchantData.has(merchantName)) {
          merchantData.set(merchantName, { amount: 0, count: 0 });
        }
        
        const data = merchantData.get(merchantName)!;
        data.amount += amount;
        data.count += 1;
      });

      // Convert to array and sort
      this.topMerchants = Array.from(merchantData.entries()).map(([merchant, data]) => ({
        merchant,
        amount: data.amount,
        count: data.count
      })).sort((a, b) => b.amount - a.amount).slice(0, 10); // Top 10 merchants

    } catch (error) {
      console.error('Error loading top merchants:', error);
    }
  }

  private formatMonthLabel(monthKey: string): string {
    const [year, month] = monthKey.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  }

  onPeriodChange(period: '6months' | '12months') {
    this.selectedPeriod = period;
    this.loadSpendingData();
  }

  getTotalSpending(): number {
    return this.monthlySpending.reduce((sum, month) => sum + month.spending, 0);
  }

  getTotalIncome(): number {
    return this.monthlySpending.reduce((sum, month) => sum + month.income, 0);
  }

  getNetCashFlow(): number {
    return this.getTotalIncome() - this.getTotalSpending();
  }

  getCashFlowColor(): string {
    const net = this.getNetCashFlow();
    return net >= 0 ? 'text-green-600' : 'text-red-600';
  }

  getCategoryColor(index: number): string {
    const colors = [
      '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
      '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'
    ];
    return colors[index % colors.length];
  }

  // Mock chart data for demonstration (replace with actual chart library integration)
  getChartData() {
    return {
      monthlySpending: {
        labels: this.monthlySpending.map(m => m.month),
        datasets: [
          {
            label: 'Spending',
            data: this.monthlySpending.map(m => m.spending),
            borderColor: '#EF4444',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            tension: 0.4
          },
          {
            label: 'Income',
            data: this.monthlySpending.map(m => m.income),
            borderColor: '#10B981',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            tension: 0.4
          }
        ]
      },
      categorySpending: {
        labels: this.categorySpending.map(c => c.category),
        datasets: [{
          data: this.categorySpending.map(c => c.amount),
          backgroundColor: this.categorySpending.map((_, index) => this.getCategoryColor(index))
        }]
      }
    };
  }
}
