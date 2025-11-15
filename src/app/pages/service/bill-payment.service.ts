import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';

export interface BillPaymentHistory {
  bill_id: string;
  bill_name: string;
  amount_due: number;
  status: string;
  cleared_dates: string[];
  bank_source: string | null;
}

export interface UpcomingBill {
  bill_id: string;
  bill_name: string;
  amount_due: number;
  status: string;
  next_due_date: Date;
  days_until_due: number;
  payment_pattern: string;
  last_payment_date: Date | null;
  bank_source: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class BillPaymentService {
  constructor(private supabaseService: SupabaseService) {}

  /**
   * Fetch bill payment history from the view (includes bank_source from transactions)
   * Only fetches active bills
   */
  async getBillPaymentHistory(userId: string): Promise<BillPaymentHistory[]> {
    const { data, error } = await this.supabaseService.getClient()
      .from('v_bill_payment_history')
      .select('*')
      .eq('status', 'Active'); // Only fetch active bills

    if (error) {
      console.error('Error fetching bill payment history:', error);
      throw error;
    }

    return (data || []).map((bill: any) => ({
      bill_id: bill.bill_id,
      bill_name: bill.bill_name,
      amount_due: bill.amount_due,
      status: bill.status,
      cleared_dates: bill.cleared_dates,
      bank_source: bill.bank_source || null
    }));
  }

  /**
   * Calculate the average interval between payments in days
   */
  private calculateAverageInterval(dates: string[]): number {
    if (dates.length < 2) {
      return 30; // Default to monthly if not enough data
    }

    const intervals: number[] = [];
    for (let i = 1; i < dates.length; i++) {
      const prevDate = new Date(dates[i - 1]);
      const currDate = new Date(dates[i]);
      const diffTime = currDate.getTime() - prevDate.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      intervals.push(diffDays);
    }

    const sum = intervals.reduce((acc, val) => acc + val, 0);
    return Math.round(sum / intervals.length);
  }

  /**
   * Determine payment pattern description based on average interval
   */
  private getPaymentPattern(avgInterval: number): string {
    if (avgInterval <= 7) return 'Weekly';
    if (avgInterval <= 14) return 'Bi-weekly';
    if (avgInterval <= 21) return 'Every 3 weeks';
    if (avgInterval <= 31) return 'Monthly';
    if (avgInterval <= 45) return 'Every 6 weeks';
    if (avgInterval <= 62) return 'Bi-monthly';
    if (avgInterval <= 92) return 'Quarterly';
    if (avgInterval <= 183) return 'Semi-annually';
    if (avgInterval <= 366) return 'Annually';
    return 'Custom';
  }

  /**
   * Calculate next due date based on payment history
   * Simply adds 1 month to the last payment date
   */
  private calculateNextDueDate(cleared_dates: string[]): Date {
    if (cleared_dates.length === 0) {
      // No payment history - return today
      return new Date();
    }

    const lastPaymentDate = new Date(cleared_dates[cleared_dates.length - 1]);
    
    // Add exactly 1 month
    const nextDueDate = new Date(lastPaymentDate);
    nextDueDate.setMonth(nextDueDate.getMonth() + 1);
    
    return nextDueDate;
  }

  /**
   * Calculate days until due
   */
  private calculateDaysUntilDue(dueDate: Date): number {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    
    const diffTime = due.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Get upcoming bills sorted by oldest payment first
   */
  async getUpcomingBills(userId: string): Promise<UpcomingBill[]> {
    const history = await this.getBillPaymentHistory(userId);
    
    const upcomingBills: UpcomingBill[] = history.map(bill => {
      const nextDueDate = this.calculateNextDueDate(bill.cleared_dates);
      const daysUntilDue = this.calculateDaysUntilDue(nextDueDate);
      const avgInterval = this.calculateAverageInterval(bill.cleared_dates);
      const paymentPattern = this.getPaymentPattern(avgInterval);
      const lastPaymentDate = bill.cleared_dates.length > 0 
        ? new Date(bill.cleared_dates[bill.cleared_dates.length - 1])
        : null;

      return {
        bill_id: bill.bill_id,
        bill_name: bill.bill_name,
        amount_due: bill.amount_due,
        status: bill.status,
        next_due_date: nextDueDate,
        days_until_due: daysUntilDue,
        payment_pattern: paymentPattern,
        last_payment_date: lastPaymentDate,
        bank_source: bill.bank_source
      };
    });

    // Sort by next due date (DESC) - oldest/most overdue bills appear at the top
    upcomingBills.sort((a, b) => {
      return b.next_due_date.getTime() - a.next_due_date.getTime();
    });

    return upcomingBills;
  }

  /**
   * Get start of current week (Sunday)
   */
  private getStartOfWeek(date: Date): Date {
    const start = new Date(date);
    const day = start.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const diff = day; // Days since Sunday
    start.setDate(start.getDate() - diff);
    start.setHours(0, 0, 0, 0);
    return start;
  }

  /**
   * Get end of current week (next Sunday)
   */
  private getEndOfWeek(date: Date): Date {
    const start = this.getStartOfWeek(date);
    const end = new Date(start);
    end.setDate(start.getDate() + 7); // Add 7 days to get to next Sunday
    end.setHours(23, 59, 59, 999);
    return end;
  }

  /**
   * Get summary statistics for upcoming bills
   */
  async getBillsSummary(userId: string): Promise<{
    totalAmount: number;
    billsCount: number;
    dueTodayCount: number;
    overdueCount: number;
    dueSoonCount: number;
  }> {
    const upcomingBills = await this.getUpcomingBills(userId);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const weekStart = this.getStartOfWeek(today);
    const weekEnd = this.getEndOfWeek(today);

    const totalAmount = upcomingBills.reduce((sum, bill) => sum + (bill.amount_due || 0), 0);
    const billsCount = upcomingBills.length;
    const dueTodayCount = upcomingBills.filter(bill => bill.days_until_due === 0).length;
    const overdueCount = upcomingBills.filter(bill => bill.days_until_due < 0).length;
    
    // Count bills due this week (including all bills between previous Sunday and next Sunday)
    const dueSoonCount = upcomingBills.filter(bill => {
      const dueDate = new Date(bill.next_due_date);
      dueDate.setHours(0, 0, 0, 0);
      return dueDate >= weekStart && dueDate <= weekEnd;
    }).length;

    return {
      totalAmount,
      billsCount,
      dueTodayCount,
      overdueCount,
      dueSoonCount
    };
  }
}

