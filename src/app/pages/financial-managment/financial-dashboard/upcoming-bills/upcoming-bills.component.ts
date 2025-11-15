import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';

// PrimeNG imports
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { SkeletonModule } from 'primeng/skeleton';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { TableModule } from 'primeng/table';

// Services
import { SupabaseService } from '../../../service/supabase.service';
import { BillPaymentService, UpcomingBill } from '../../services/bill-payment.service';

@Component({
  selector: 'app-upcoming-bills',
  standalone: true,
  imports: [
    CommonModule,
    CardModule,
    ButtonModule,
    TagModule,
    SkeletonModule,
    ToastModule,
    TableModule
  ],
  providers: [MessageService],
  templateUrl: './upcoming-bills.component.html',
  styleUrls: ['./upcoming-bills.component.scss']
})
export class UpcomingBillsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  upcomingBills: UpcomingBill[] = [];
  loading = true;
  
  // Summary statistics
  totalAmount = 0;
  billsCount = 0;
  dueTodayCount = 0;
  overdueCount = 0;
  dueSoonCount = 0;

  constructor(
    private supabaseService: SupabaseService,
    private billPaymentService: BillPaymentService,
    private messageService: MessageService
  ) {}

  ngOnInit() {
    this.loadUpcomingBills();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  async loadUpcomingBills() {
    try {
      this.loading = true;

      const userId = await this.supabaseService.getCurrentUserId();
      
      // Fetch upcoming bills from the service
      this.upcomingBills = await this.billPaymentService.getUpcomingBills(userId);
      
      // Fetch summary statistics
      const summary = await this.billPaymentService.getBillsSummary(userId);
      this.totalAmount = summary.totalAmount;
      this.billsCount = summary.billsCount;
      this.dueTodayCount = summary.dueTodayCount;
      this.overdueCount = summary.overdueCount;
      this.dueSoonCount = summary.dueSoonCount;

    } catch (error) {
      console.error('Error loading upcoming bills:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to load upcoming bills'
      });
    } finally {
      this.loading = false;
    }
  }

  getDueStatus(daysUntilDue: number): 'overdue' | 'due-today' | 'due-soon' | 'due-later' {
    if (daysUntilDue < 0) return 'overdue';
    if (daysUntilDue === 0) return 'due-today';
    if (daysUntilDue <= 7) return 'due-soon';
    return 'due-later';
  }

  getDueStatusSeverity(status: 'overdue' | 'due-today' | 'due-soon' | 'due-later'): 'success' | 'info' | 'warning' | 'danger' | 'secondary' | 'contrast' | undefined {
    switch (status) {
      case 'overdue':
        return 'danger';
      case 'due-today':
        return 'warning';
      case 'due-soon':
        return 'warning';
      default:
        return 'success';
    }
  }

  getDueStatusText(daysUntilDue: number): string {
    if (daysUntilDue < 0) {
      return `${Math.abs(daysUntilDue)} days expected paid`;
    } else if (daysUntilDue === 0) {
      return 'Due today';
    } else {
      return `Due in ${daysUntilDue} days`;
    }
  }

  formatDueDate(dueDate: Date): string {
    return new Date(dueDate).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  formatLastPaymentDate(lastPaymentDate: Date | null): string {
    if (!lastPaymentDate) return 'No payment history';
    
    return new Date(lastPaymentDate).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  async refreshBills() {
    await this.loadUpcomingBills();
    this.messageService.add({
      severity: 'success',
      summary: 'Refreshed',
      detail: 'Bills list has been refreshed'
    });
  }
}
