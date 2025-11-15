import { Component, OnInit, OnDestroy, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';

// PrimeNG imports
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { SkeletonModule } from 'primeng/skeleton';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';

// Services
import { SupabaseService } from '../../../service/supabase.service';

export interface FinancialAlert {
  id: string;
  type: 'low-balance' | 'large-transaction' | 'upcoming-due' | 'budget-exceeded' | 'unusual-spending';
  severity: 'low' | 'medium' | 'high';
  title: string;
  message: string;
  amount?: number;
  date?: string;
  account?: string;
  category?: string;
  actionable: boolean;
}

export interface FinancialInsight {
  id: string;
  type: 'spending-trend' | 'savings-goal' | 'category-analysis' | 'budget-progress';
  title: string;
  message: string;
  value?: number;
  change?: number;
  changeType?: 'increase' | 'decrease';
  period?: string;
}

@Component({
  selector: 'app-alerts-insights',
  standalone: true,
    imports: [
        CommonModule,
        CardModule,
        ButtonModule,
        TagModule,
        SkeletonModule,
        ToastModule
    ],
  providers: [MessageService],
  templateUrl: './alerts-insights.component.html',
  styleUrls: ['./alerts-insights.component.scss']
})
export class AlertsInsightsComponent implements OnInit, OnDestroy {
  @Output() loadingChange = new EventEmitter<boolean>();

  private destroy$ = new Subject<void>();
  
  alerts: FinancialAlert[] = [];
  insights: FinancialInsight[] = [];
  loading = true;

  constructor(
    private supabaseService: SupabaseService,
    private messageService: MessageService
  ) {}

  ngOnInit() {
    this.loadAlertsAndInsights();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  async loadAlertsAndInsights() {
    try {
      this.loading = true;
      this.loadingChange.emit(true);

      const userId = await this.supabaseService.getCurrentUserId();
      
      // Load alerts and insights in parallel
      await Promise.all([
        this.loadFinancialAlerts(userId),
        this.loadFinancialInsights(userId)
      ]);

    } catch (error) {
      console.error('Error loading alerts and insights:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to load alerts and insights'
      });
    } finally {
      this.loading = false;
      this.loadingChange.emit(false);
    }
  }

  private async loadFinancialAlerts(userId: string) {
    // Generate alerts based on current financial data
    const alerts: FinancialAlert[] = [];

    try {
      // Check for low balance alerts
      const { data: accounts } = await this.supabaseService.getClient()
        .from('hb_accounts')
        .select('name, balance, account_type')
        .eq('user_id', userId)
        .eq('is_active', true);

      if (accounts) {
        accounts.forEach(account => {
          if (account.balance < 100 && account.account_type === 'Checking') {
            alerts.push({
              id: `low-balance-${account.name}`,
              type: 'low-balance',
              severity: 'high',
              title: 'Low Balance Alert',
              message: `${account.name} has a low balance of $${account.balance.toFixed(2)}`,
              amount: account.balance,
              account: account.name,
              actionable: true
            });
          }
        });
      }

      // Check for large transactions
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: largeTransactions } = await this.supabaseService.getClient()
        .from('hb_transactions')
        .select('name, amount, date, account_name')
        .eq('user_id', userId)
        .lt('amount', -500) // Large spending transactions
        .gte('date', sevenDaysAgo.toISOString())
        .order('amount', { ascending: true });

      if (largeTransactions && largeTransactions.length > 0) {
        largeTransactions.slice(0, 3).forEach(transaction => {
          alerts.push({
            id: `large-transaction-${transaction.date}`,
            type: 'large-transaction',
            severity: 'medium',
            title: 'Large Transaction',
              message: `Large transaction: ${transaction.name} for $${Math.abs(transaction.amount).toFixed(2)}`,
            amount: transaction.amount,
            date: transaction.date,
            account: transaction.account_name,
            actionable: false
          });
        });
      }

      // Check for upcoming due dates
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const { data: upcomingBills } = await this.supabaseService.getClient()
        .from('hb_bills')
        .select('name, amount, due_date')
        .eq('user_id', userId)
        .eq('status', 'Active')
        .lte('due_date', tomorrow.toISOString());

      if (upcomingBills && upcomingBills.length > 0) {
        upcomingBills.forEach(bill => {
          alerts.push({
            id: `upcoming-due-${bill.name}`,
            type: 'upcoming-due',
            severity: 'medium',
            title: 'Bill Due Soon',
            message: `${bill.name} is due for $${bill.amount.toFixed(2)}`,
            amount: bill.amount,
            date: bill.due_date,
            actionable: true
          });
        });
      }

    } catch (error) {
      console.error('Error loading financial alerts:', error);
    }

    this.alerts = alerts;
  }

  private async loadFinancialInsights(userId: string) {
    const insights: FinancialInsight[] = [];

    try {
      // Current month spending vs previous month
      const currentMonth = new Date();
      currentMonth.setDate(1);
      currentMonth.setHours(0, 0, 0, 0);

      const lastMonth = new Date(currentMonth);
      lastMonth.setMonth(lastMonth.getMonth() - 1);

      const currentMonthStart = currentMonth.toISOString();
      const currentMonthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).toISOString();
      const lastMonthStart = lastMonth.toISOString();
      const lastMonthEnd = new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0).toISOString();

      const { data: currentMonthSpending } = await this.supabaseService.getClient()
        .from('hb_transactions')
        .select('amount')
        .eq('user_id', userId)
        .gte('date', currentMonthStart)
        .lte('date', currentMonthEnd)
        .lt('amount', 0);

      const { data: lastMonthSpending } = await this.supabaseService.getClient()
        .from('hb_transactions')
        .select('amount')
        .eq('user_id', userId)
        .gte('date', lastMonthStart)
        .lte('date', lastMonthEnd)
        .lt('amount', 0);

      if (currentMonthSpending && lastMonthSpending) {
        const currentTotal = Math.abs(currentMonthSpending.reduce((sum, t) => sum + t.amount, 0));
        const lastTotal = Math.abs(lastMonthSpending.reduce((sum, t) => sum + t.amount, 0));
        const change = currentTotal - lastTotal;
        const changePercent = lastTotal > 0 ? (change / lastTotal) * 100 : 0;

        insights.push({
          id: 'monthly-spending-trend',
          type: 'spending-trend',
          title: 'Monthly Spending Trend',
          message: changePercent > 0 
            ? `You spent ${changePercent.toFixed(1)}% more this month than last month`
            : `You spent ${Math.abs(changePercent).toFixed(1)}% less this month than last month`,
          value: currentTotal,
          change: Math.abs(changePercent),
          changeType: changePercent > 0 ? 'increase' : 'decrease',
          period: 'month'
        });
      }

      // Top spending category
      const { data: categorySpending } = await this.supabaseService.getClient()
        .from('hb_transactions')
        .select(`
          amount,
          category:category_id (
            name
          )
        `)
        .eq('user_id', userId)
        .gte('date', currentMonthStart)
        .lte('date', currentMonthEnd)
        .lt('amount', 0)
        .not('category_id', 'is', null);

      if (categorySpending && categorySpending.length > 0) {
        const categoryTotals = categorySpending.reduce((acc, transaction) => {
          const categoryName = (transaction.category as any)?.name || 'Uncategorized';
          acc[categoryName] = (acc[categoryName] || 0) + Math.abs(transaction.amount);
          return acc;
        }, {} as Record<string, number>);

        const topCategory = Object.entries(categoryTotals)
          .sort(([,a], [,b]) => b - a)[0];

        if (topCategory) {
          insights.push({
            id: 'top-spending-category',
            type: 'category-analysis',
            title: 'Top Spending Category',
            message: `You spent $${topCategory[1].toFixed(2)} on ${topCategory[0]} this month`,
            value: topCategory[1],
            period: 'month'
          });
        }
      }

      // Simple savings insight (if total cash is increasing)
      const { data: savingsAccounts } = await this.supabaseService.getClient()
        .from('hb_accounts')
        .select('balance')
        .eq('user_id', userId)
        .eq('account_type', 'Savings')
        .eq('is_active', true);

      if (savingsAccounts && savingsAccounts.length > 0) {
        const totalSavings = savingsAccounts.reduce((sum, acc) => sum + acc.balance, 0);
        
        if (totalSavings > 1000) {
          insights.push({
            id: 'savings-progress',
            type: 'savings-goal',
            title: 'Savings Progress',
            message: `Great job! You have $${totalSavings.toFixed(2)} in savings`,
            value: totalSavings,
            changeType: 'increase'
          });
        }
      }

    } catch (error) {
      console.error('Error loading financial insights:', error);
    }

    this.insights = insights;
  }

  getAlertIcon(type: string): string {
    switch (type) {
      case 'low-balance':
        return 'pi pi-exclamation-triangle';
      case 'large-transaction':
        return 'pi pi-dollar';
      case 'upcoming-due':
        return 'pi pi-calendar';
      case 'budget-exceeded':
        return 'pi pi-chart-line';
      case 'unusual-spending':
        return 'pi pi-eye';
      default:
        return 'pi pi-info-circle';
    }
  }

  getAlertSeverity(severity: string): 'success' | 'info' | 'warning' | 'danger' | 'secondary' | 'contrast' | undefined {
    switch (severity) {
      case 'high':
        return 'danger';
      case 'medium':
        return 'warning';
      case 'low':
        return 'info';
      default:
        return 'secondary';
    }
  }

  getInsightIcon(type: string): string {
    switch (type) {
      case 'spending-trend':
        return 'pi pi-chart-line';
      case 'savings-goal':
        return 'pi pi-piggy-bank';
      case 'category-analysis':
        return 'pi pi-tag';
      case 'budget-progress':
        return 'pi pi-chart-pie';
      default:
        return 'pi pi-lightbulb';
    }
  }

  getChangeIcon(changeType?: string): string {
    switch (changeType) {
      case 'increase':
        return 'pi pi-arrow-up';
      case 'decrease':
        return 'pi pi-arrow-down';
      default:
        return 'pi pi-minus';
    }
  }

  getChangeColor(changeType?: string): string {
    switch (changeType) {
      case 'increase':
        return 'text-red-600';
      case 'decrease':
        return 'text-green-600';
      default:
        return 'text-gray-600';
    }
  }

  dismissAlert(alert: FinancialAlert) {
    this.alerts = this.alerts.filter(a => a.id !== alert.id);
    this.messageService.add({
      severity: 'info',
      summary: 'Alert Dismissed',
      detail: `Dismissed: ${alert.title}`
    });
  }

  handleAlertAction(alert: FinancialAlert) {
    // TODO: Implement specific actions for different alert types
    this.messageService.add({
      severity: 'info',
      summary: 'Action Required',
      detail: `Handling action for: ${alert.title}`
    });
  }
}
