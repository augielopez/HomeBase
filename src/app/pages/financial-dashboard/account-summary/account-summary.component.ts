import { Component, OnInit, OnDestroy, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';

// PrimeNG imports
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { ProgressBarModule } from 'primeng/progressbar';
import { TagModule } from 'primeng/tag';
import { SkeletonModule } from 'primeng/skeleton';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';

// Services
import { SupabaseService } from '../../service/supabase.service';

export interface Account {
  id: string;
  name: string;
  account_type: string;
  balance: number;
  last_updated?: string;
  institution?: string;
  account_number?: string;
  routing_number?: string;
  is_active: boolean;
}

@Component({
  selector: 'app-account-summary',
  standalone: true,
    imports: [
        CommonModule,
        CardModule,
        ButtonModule,
        ProgressBarModule,
        TagModule,
        SkeletonModule,
        ToastModule
    ],
  providers: [MessageService],
  templateUrl: './account-summary.component.html',
  styleUrls: ['./account-summary.component.scss']
})
export class AccountSummaryComponent implements OnInit, OnDestroy {
  @Output() loadingChange = new EventEmitter<boolean>();

  private destroy$ = new Subject<void>();
  
  accounts: Account[] = [];
  loading = true;
  
  // Summary calculations
  totalBalance = 0;
  checkingBalance = 0;
  savingsBalance = 0;
  investmentBalance = 0;

  constructor(
    private supabaseService: SupabaseService,
    private messageService: MessageService
  ) {}

  ngOnInit() {
    this.loadAccounts();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  async loadAccounts() {
    try {
      this.loading = true;
      this.loadingChange.emit(true);

      const userId = await this.supabaseService.getCurrentUserId();
      
      const { data, error } = await this.supabaseService.getClient()
        .from('hb_accounts')
        .select(`
          id,
          name,
          account_type,
          balance,
          last_updated,
          institution,
          account_number,
          routing_number,
          is_active
        `)
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('account_type, name');

      if (error) throw error;

      this.accounts = data || [];
      this.calculateSummary();

    } catch (error) {
      console.error('Error loading accounts:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to load accounts'
      });
    } finally {
      this.loading = false;
      this.loadingChange.emit(false);
    }
  }

  private calculateSummary() {
    this.totalBalance = 0;
    this.checkingBalance = 0;
    this.savingsBalance = 0;
    this.investmentBalance = 0;

    this.accounts.forEach(account => {
      const balance = account.balance || 0;
      this.totalBalance += balance;

      switch (account.account_type?.toLowerCase()) {
        case 'checking':
          this.checkingBalance += balance;
          break;
        case 'savings':
          this.savingsBalance += balance;
          break;
        case 'investment':
        case 'brokerage':
          this.investmentBalance += balance;
          break;
      }
    });
  }

  getAccountTypeIcon(accountType: string): string {
    const type = accountType?.toLowerCase();
    switch (type) {
      case 'checking':
        return 'pi pi-credit-card';
      case 'savings':
        return 'pi pi-piggy-bank';
      case 'investment':
      case 'brokerage':
        return 'pi pi-chart-line';
      case 'loan':
      case 'mortgage':
        return 'pi pi-home';
      case 'credit':
        return 'pi pi-id-card';
      default:
        return 'pi pi-building';
    }
  }

  getAccountTypeColor(accountType: string): string {
    const type = accountType?.toLowerCase();
    switch (type) {
      case 'checking':
        return 'blue';
      case 'savings':
        return 'green';
      case 'investment':
      case 'brokerage':
        return 'purple';
      case 'loan':
      case 'mortgage':
        return 'orange';
      case 'credit':
        return 'red';
      default:
        return 'gray';
    }
  }

  getAccountTypeSeverity(accountType: string): 'success' | 'info' | 'warning' | 'danger' | 'secondary' | 'contrast' | undefined {
    const type = accountType?.toLowerCase();
    switch (type) {
      case 'checking':
        return 'info';
      case 'savings':
        return 'success';
      case 'investment':
      case 'brokerage':
        return 'info';
      case 'loan':
      case 'mortgage':
        return 'warning';
      case 'credit':
        return 'danger';
      default:
        return 'secondary';
    }
  }

  formatLastUpdated(lastUpdated: string): string {
    if (!lastUpdated) return 'Never';
    
    const date = new Date(lastUpdated);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays}d ago`;
    }
  }

  viewAccountDetails(account: Account) {
    // TODO: Implement account details view
    // This could open a dialog or navigate to account details page
    this.messageService.add({
      severity: 'info',
      summary: 'Account Details',
      detail: `Viewing details for ${account.name}`
    });
  }

  getBalanceColor(balance: number): string {
    if (balance >= 0) return 'text-green-600';
    return 'text-red-600';
  }

  getTotalBalanceColor(): string {
    if (this.totalBalance >= 0) return 'text-green-600';
    return 'text-red-600';
  }

  addNewAccount() {
    // TODO: Implement add new account functionality
    // This could open a dialog or navigate to account creation form
    this.messageService.add({
      severity: 'info',
      summary: 'Coming Soon',
      detail: 'Add new account functionality will be implemented'
    });
  }

  get positiveBalanceCount(): number {
    return this.accounts.filter(acc => acc.balance >= 0).length;
  }

  get negativeBalanceCount(): number {
    return this.accounts.filter(acc => acc.balance < 0).length;
  }
}
