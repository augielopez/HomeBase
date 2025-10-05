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
import { SupabaseService } from '../../service/supabase.service';
import { MasterDataService } from '../../service/master-data.service';

export interface UpcomingBill {
  id: string;
  name: string;
  amount: number;
  due_date: string;
  status: string;
  category?: {
    name: string;
  };
  account?: {
    name: string;
  };
  frequency?: string;
  notes?: string;
}

@Component({
  selector: 'app-upcoming-bills',
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
  templateUrl: './upcoming-bills.component.html',
  styleUrls: ['./upcoming-bills.component.scss']
})
export class UpcomingBillsComponent implements OnInit, OnDestroy {
  @Output() loadingChange = new EventEmitter<boolean>();

  private destroy$ = new Subject<void>();
  
  upcomingBills: UpcomingBill[] = [];
  loading = true;
  
  // Summary calculations
  totalAmount = 0;
  billsDueToday = 0;
  billsOverdue = 0;

  constructor(
    private supabaseService: SupabaseService,
    private masterDataService: MasterDataService,
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
      this.loadingChange.emit(true);

      const userId = await this.supabaseService.getCurrentUserId();
      
      // Get bills due in the next 30 days
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      
      const { data, error } = await this.supabaseService.getClient()
        .from('hb_bills')
        .select(`
          id,
          bill_name,
          amount_due,
          due_date,
          status,
          description,
          category:category_id (
            name
          ),
          account:account_id (
            name
          ),
          frequency:frequency_id (
            name
          )
        `)
        .eq('status', 'Active')
        .lte('due_date', thirtyDaysFromNow.toISOString())
        .order('due_date', { ascending: true });

      if (error) throw error;

      this.upcomingBills = (data || []).map((bill: any) => ({
        id: bill.id,
        name: bill.bill_name,
        amount: bill.amount_due,
        due_date: bill.due_date,
        status: bill.status,
        notes: bill.description,
        category: bill.category || { name: 'Uncategorized' },
        account: bill.account || { name: 'Unknown' },
        frequency: bill.frequency || { name: 'Monthly' }
      }));
      this.calculateSummary();

    } catch (error) {
      console.error('Error loading upcoming bills:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to load upcoming bills'
      });
    } finally {
      this.loading = false;
      this.loadingChange.emit(false);
    }
  }

  private calculateSummary() {
    this.totalAmount = 0;
    this.billsDueToday = 0;
    this.billsOverdue = 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    this.upcomingBills.forEach(bill => {
      this.totalAmount += bill.amount || 0;
      
      const dueDate = new Date(bill.due_date);
      dueDate.setHours(0, 0, 0, 0);
      
      if (dueDate.getTime() === today.getTime()) {
        this.billsDueToday++;
      } else if (dueDate < today) {
        this.billsOverdue++;
      }
    });
  }

  getDaysUntilDue(dueDate: string): number {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    
    const diffTime = due.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  getDueStatus(dueDate: string): 'overdue' | 'due-today' | 'due-soon' | 'due-later' {
    const daysUntilDue = this.getDaysUntilDue(dueDate);
    
    if (daysUntilDue < 0) return 'overdue';
    if (daysUntilDue === 0) return 'due-today';
    if (daysUntilDue <= 3) return 'due-soon';
    return 'due-later';
  }

  getDueStatusColor(status: 'overdue' | 'due-today' | 'due-soon' | 'due-later'): string {
    switch (status) {
      case 'overdue':
        return 'text-red-600';
      case 'due-today':
        return 'text-orange-600';
      case 'due-soon':
        return 'text-yellow-600';
      default:
        return 'text-green-600';
    }
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

  getDueStatusText(status: 'overdue' | 'due-today' | 'due-soon' | 'due-later', dueDate: string): string {
    const daysUntilDue = this.getDaysUntilDue(dueDate);
    
    switch (status) {
      case 'overdue':
        return `${Math.abs(daysUntilDue)} days overdue`;
      case 'due-today':
        return 'Due today';
      case 'due-soon':
        return `Due in ${daysUntilDue} days`;
      default:
        return `Due in ${daysUntilDue} days`;
    }
  }

  async markAsPaid(bill: UpcomingBill) {
    try {
      const { error } = await this.supabaseService.getClient()
        .from('hb_bills')
        .update({ 
          status: 'Paid',
          updated_at: new Date().toISOString(),
          updated_by: 'USER'
        })
        .eq('id', bill.id);

      if (error) throw error;

      this.messageService.add({
        severity: 'success',
        summary: 'Success',
        detail: `Marked "${bill.name}" as paid`
      });

      await this.loadUpcomingBills();
    } catch (error) {
      console.error('Error marking bill as paid:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to mark bill as paid'
      });
    }
  }

  async schedulePayment(bill: UpcomingBill) {
    // TODO: Implement schedule payment functionality
    // This could open a payment scheduling dialog
    this.messageService.add({
      severity: 'info',
      summary: 'Coming Soon',
      detail: 'Payment scheduling functionality will be implemented'
    });
  }

  viewBillDetails(bill: UpcomingBill) {
    // TODO: Implement bill details view
    // This could open a dialog or navigate to bill details page
    this.messageService.add({
      severity: 'info',
      summary: 'Bill Details',
      detail: `Viewing details for ${bill.name}`
    });
  }

  addNewBill() {
    // TODO: Implement add new bill functionality
    // This could open a dialog or navigate to bill creation form
    this.messageService.add({
      severity: 'info',
      summary: 'Coming Soon',
      detail: 'Add new bill functionality will be implemented'
    });
  }

  formatDueDate(dueDate: string): string {
    return new Date(dueDate).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  get overdueCount(): number {
    return this.upcomingBills.filter(bill => this.getDueStatus(bill.due_date) === 'overdue').length;
  }

  get dueTodayCount(): number {
    return this.upcomingBills.filter(bill => this.getDueStatus(bill.due_date) === 'due-today').length;
  }

  get dueSoonCount(): number {
    return this.upcomingBills.filter(bill => this.getDueStatus(bill.due_date) === 'due-soon').length;
  }
}
