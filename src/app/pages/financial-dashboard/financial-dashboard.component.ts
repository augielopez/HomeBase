import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { MasterDataService } from '../service/master-data.service';
import { SupabaseService } from '../service/supabase.service';
import { MessageService } from 'primeng/api';

// PrimeNG imports
import { CardModule } from 'primeng/card';
import { ProgressBarModule } from 'primeng/progressbar';
import { SkeletonModule } from 'primeng/skeleton';
import { ToastModule } from 'primeng/toast';
import { ButtonModule } from 'primeng/button';

// Component imports
import { CreditCardCarouselComponent } from './credit-card-carousel/credit-card-carousel.component';
import { AccountSummaryComponent } from './account-summary/account-summary.component';
import { SpendingChartsComponent } from './spending-charts/spending-charts.component';
import { RecentTransactionsTableComponent } from './recent-transactions-table/recent-transactions-table.component';
import { UpcomingBillsComponent } from './upcoming-bills/upcoming-bills.component';
import { AlertsInsightsComponent } from './alerts-insights/alerts-insights.component';
import { QuickActionsBarComponent } from './quick-actions-bar/quick-actions-bar.component';

export interface DashboardSummary {
  totalNetWorth: number;
  totalCash: number;
  totalCreditCardBalance: number;
  upcomingBillsCount: number;
  upcomingBillsTotal: number;
  monthlySpending: number;
  savingsGoalProgress?: number;
}

@Component({
  selector: 'app-financial-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    CardModule,
    ProgressBarModule,
    SkeletonModule,
    ToastModule,
    ButtonModule,
    CreditCardCarouselComponent,
    AccountSummaryComponent,
    SpendingChartsComponent,
    RecentTransactionsTableComponent,
    UpcomingBillsComponent,
    AlertsInsightsComponent,
    QuickActionsBarComponent
  ],
  providers: [MessageService],
  templateUrl: './financial-dashboard.component.html',
  styleUrls: ['./financial-dashboard.component.scss']
})
export class FinancialDashboardComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  // Dashboard state
  loading = true;
  summary: DashboardSummary | null = null;
  lastUpdated: Date | null = null;
  
  // Loading states for individual sections
  summaryLoading = true;
  cardsLoading = true;
  accountsLoading = true;
  chartsLoading = true;
  transactionsLoading = true;
  billsLoading = true;
  alertsLoading = true;

  constructor(
    private masterDataService: MasterDataService,
    private supabaseService: SupabaseService,
    private messageService: MessageService
  ) {}

  ngOnInit() {
    this.initializeDashboard();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private async initializeDashboard() {
    try {
      // Load master data first
      await this.masterDataService.loadAllMasterData().toPromise();
      
      // Load dashboard summary
      await this.loadDashboardSummary();
      
      this.loading = false;
      this.lastUpdated = new Date();
    } catch (error) {
      console.error('Error initializing dashboard:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to load dashboard data'
      });
      this.loading = false;
    }
  }

  private async loadDashboardSummary() {
    try {
      this.summaryLoading = true;
      
      const userId = await this.supabaseService.getCurrentUserId();
      
      // Load accounts for net worth calculation
      const { data: accounts, error: accountsError } = await this.supabaseService.getClient()
        .from('hb_accounts')
        .select('balance, account_type')
        .eq('user_id', userId);

      if (accountsError) throw accountsError;

      // Load credit cards for balance calculation
      const { data: creditCards, error: cardsError } = await this.supabaseService.getClient()
        .from('hb_credit_cards')
        .select('balance, credit_limit')
        .eq('user_id', userId);

      if (cardsError) throw cardsError;

      // Load upcoming bills (next 30 days)
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      
      const { data: upcomingBills, error: billsError } = await this.supabaseService.getClient()
        .from('hb_bills')
        .select('amount, due_date')
        .eq('user_id', userId)
        .eq('status', 'Active')
        .lte('due_date', thirtyDaysFromNow.toISOString())
        .gte('due_date', new Date().toISOString());

      if (billsError) throw billsError;

      // Load monthly spending (current month)
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      
      const endOfMonth = new Date();
      endOfMonth.setMonth(endOfMonth.getMonth() + 1, 0);
      endOfMonth.setHours(23, 59, 59, 999);

      const { data: monthlyTransactions, error: transactionsError } = await this.supabaseService.getClient()
        .from('hb_transactions')
        .select('amount')
        .eq('user_id', userId)
        .gte('date', startOfMonth.toISOString())
        .lte('date', endOfMonth.toISOString())
        .lt('amount', 0); // Only spending (negative amounts)

      if (transactionsError) throw transactionsError;

      // Calculate summary metrics
      const totalCash = (accounts || [])
        .filter(acc => acc.account_type === 'Checking' || acc.account_type === 'Savings')
        .reduce((sum, acc) => sum + (acc.balance || 0), 0);

      const totalCreditCardBalance = (creditCards || [])
        .reduce((sum, card) => sum + (card.balance || 0), 0);

      const totalNetWorth = (accounts || [])
        .reduce((sum, acc) => sum + (acc.balance || 0), 0) - totalCreditCardBalance;

      const upcomingBillsCount = (upcomingBills || []).length;
      const upcomingBillsTotal = (upcomingBills || [])
        .reduce((sum, bill) => sum + (bill.amount || 0), 0);

      const monthlySpending = Math.abs((monthlyTransactions || [])
        .reduce((sum, tx) => sum + (tx.amount || 0), 0));

      this.summary = {
        totalNetWorth,
        totalCash,
        totalCreditCardBalance,
        upcomingBillsCount,
        upcomingBillsTotal,
        monthlySpending
      };

    } catch (error) {
      console.error('Error loading dashboard summary:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to load dashboard summary'
      });
    } finally {
      this.summaryLoading = false;
    }
  }

  async refreshDashboard() {
    this.loading = true;
    this.lastUpdated = null;
    await this.loadDashboardSummary();
    this.loading = false;
    this.lastUpdated = new Date();
  }

  onSectionLoadingChange(section: string, loading: boolean) {
    switch (section) {
      case 'cards':
        this.cardsLoading = loading;
        break;
      case 'accounts':
        this.accountsLoading = loading;
        break;
      case 'charts':
        this.chartsLoading = loading;
        break;
      case 'transactions':
        this.transactionsLoading = loading;
        break;
      case 'bills':
        this.billsLoading = loading;
        break;
      case 'alerts':
        this.alertsLoading = loading;
        break;
    }
  }
}




