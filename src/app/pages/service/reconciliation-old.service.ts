import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { Transaction } from '../../interfaces';
import { Bill } from '../../interfaces/bill.interface';
import { Observable, from, map, switchMap } from 'rxjs';

export interface ReconciliationMatch {
    transaction: Transaction;
    bill: Bill;
    confidence: number;
    matchReason: string;
    accountName: string;
}

export interface ReconciliationResult {
    matched: ReconciliationMatch[];
    unmatchedTransactions: Transaction[];
    unmatchedBills: Bill[];
    summary: {
        totalTransactions: number;
        totalBills: number;
        matchedCount: number;
        unmatchedTransactionCount: number;
        unmatchedBillCount: number;
    };
}

@Injectable({
    providedIn: 'root'
})
export class ReconciliationOldService {
    constructor(private supabaseService: SupabaseService) {}

    /**
     * Reconcile transactions with bills for a given month
     */
    reconcileMonth(year: number, month: number): Observable<ReconciliationResult> {
        const startDate = new Date(year, month - 1, 1).toISOString().split('T')[0];
        const endDate = new Date(year, month, 0).toISOString().split('T')[0];

        return from(this.getTransactionsForPeriod(startDate, endDate)).pipe(
            switchMap(transactions => 
                from(this.getBillsForPeriod(startDate, endDate)).pipe(
                    map(bills => this.performReconciliation(transactions, bills))
                )
            )
        );
    }

    /**
     * Get transactions for a date period - FILTERED to only US Bank and Fidelity CHECKING
     */
    private async getTransactionsForPeriod(startDate: string, endDate: string): Promise<Transaction[]> {
        const { data: transactions, error } = await this.supabaseService.getClient()
            .from('hb_transactions')
            .select(`
                *,
                category:category_id(*),
                account:account_id(*)
            `)
            .gte('date', startDate)
            .lte('date', endDate)
            .or('bank_source.eq.us_bank,and(bank_source.ilike.%fidelity%,account_id.ilike.%checking%)')
            .order('date', { ascending: false });

        if (error) {
            console.error('Error fetching transactions:', error);
            return [];
        }

        console.log('Reconciliation: Raw transactions from DB:', transactions);
        console.log('Reconciliation: Sample transaction account data:', transactions?.[0]?.account);
        console.log('Reconciliation: Sample transaction account_id:', transactions?.[0]?.account_id);

        // Additional filtering to ensure only US Bank and Fidelity CHECKING accounts
        const filteredTransactions = (transactions || []).filter(t => {
            const bankSource = t.bank_source?.toLowerCase() || '';
            const accountId = t.account_id?.toLowerCase() || '';
            
            // US Bank
            if (bankSource === 'us_bank') {
                return true;
            }
            
            // Fidelity CHECKING accounts
            if (bankSource.includes('fidelity') && accountId.includes('checking')) {
                return true;
            }
            
            return false;
        });

        // Ensure data types are correct before returning
        const validatedTransactions = filteredTransactions.map(t => ({
            ...t,
            amount: this.validateAmount(t.amount),
            date: this.validateDate(t.date)
        }));
        
        console.log(`Reconciliation: Loaded ${validatedTransactions.length} transactions (US Bank + Fidelity CHECKING only)`);
        console.log(`Reconciliation: Filtering to show only debit transactions (amount < 0) in unmatched items`);
        console.log('Reconciliation: Sample transaction:', validatedTransactions[0]);
        return validatedTransactions;
    }

    /**
     * Validate and convert amount to number
     */
    private validateAmount(amount: any): number {
        if (amount === null || amount === undefined) return 0;
        
        if (typeof amount === 'number') return amount;
        
        if (typeof amount === 'string') {
            const cleanAmount = amount.replace(/[$,]/g, '');
            const parsed = parseFloat(cleanAmount);
            return isNaN(parsed) ? 0 : parsed;
        }
        
        return 0;
    }

    /**
     * Validate and convert date to proper format
     */
    private validateDate(date: any): string {
        if (date === null || date === undefined) return '';
        
        if (typeof date === 'string') {
            // Check if it's already in ISO format
            if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
                return date;
            }
            
            // Try to parse and convert
            const parsedDate = new Date(date);
            if (!isNaN(parsedDate.getTime())) {
                return parsedDate.toISOString().split('T')[0];
            }
        }
        
        if (date instanceof Date) {
            return date.toISOString().split('T')[0];
        }
        
        return '';
    }

    /**
     * Get bills for a date period
     */
    private async getBillsForPeriod(startDate: string, endDate: string): Promise<Bill[]> {
        const { data: bills, error } = await this.supabaseService.getClient()
            .from('hb_bills')
            .select('*')
            .eq('status', 'Active')
            .order('due_date', { ascending: true });

        if (error) {
            console.error('Error fetching bills:', error);
            return [];
        }

        // Ensure data types are correct before returning
        const validatedBills = (bills || []).map(b => ({
            ...b,
            amount_due: this.validateAmount(b.amount_due),
            due_date: this.validateDate(b.due_date)
        }));
        
        return validatedBills;
    }

    /**
     * Perform the actual reconciliation logic
     * Simple logic: if transaction has bill_id, it's matched; if not, it's unmatched
     */
    private performReconciliation(transactions: Transaction[], bills: Bill[]): ReconciliationResult {
        const matched: ReconciliationMatch[] = [];
        const unmatchedTransactions: Transaction[] = [];
        const unmatchedBills: Bill[] = []; // Empty array - only show transactions in unmatched items

        // Create a map of bills for quick lookup
        const billsMap = new Map(bills.map(bill => [bill.id, bill]));

        for (const transaction of transactions) {
            // If transaction has a bill_id, it's matched
            if (transaction.bill_id && billsMap.has(transaction.bill_id)) {
                const bill = billsMap.get(transaction.bill_id)!;
                matched.push({
                    transaction,
                    bill,
                    confidence: 1.0, // 100% confidence since it's explicitly matched
                    matchReason: 'Manual Match',
                    accountName: transaction.account?.name || transaction.account_id || 'Unknown Account'
                });
            } else {
                // Only add debit transactions (negative amounts) to unmatched
                if (transaction.amount < 0) {
                    unmatchedTransactions.push(transaction);
                }
            }
        }

        const result = {
            matched,
            unmatchedTransactions,
            unmatchedBills, // Always empty - only show transactions
            summary: {
                totalTransactions: transactions.length,
                totalBills: bills.length,
                matchedCount: matched.length,
                unmatchedTransactionCount: unmatchedTransactions.length,
                unmatchedBillCount: 0 // Always 0 - no bills shown in unmatched
            }
        };

        console.log('Reconciliation: Final result:', result);
        console.log('Reconciliation: Matched transactions:', matched.length);
        console.log('Reconciliation: Unmatched transactions:', unmatchedTransactions.length);
        
        return result;
    }




    /**
     * Apply reconciliation matches to database
     */
    applyReconciliation(matches: ReconciliationMatch[]): Observable<boolean> {
        const updates = matches.map(match => ({
            id: match.transaction.id,
            bill_id: match.bill.id,
            is_reconciled: true,
            updated_at: new Date().toISOString()
        }));

        return from(this.supabaseService.getClient()
            .from('hb_transactions')
            .upsert(updates)
        ).pipe(
            map(result => !result.error)
        );
    }

    /**
     * Get reconciliation statistics for a month
     */
    getReconciliationStats(year: number, month: number): Observable<any> {
        const startDate = new Date(year, month - 1, 1).toISOString().split('T')[0];
        const endDate = new Date(year, month, 0).toISOString().split('T')[0];

        return from(this.supabaseService.getClient()
            .from('hb_transactions')
            .select('is_reconciled, bill_id')
            .gte('date', startDate)
            .lte('date', endDate)
        ).pipe(
            map(result => {
                const transactions = result.data || [];
                const reconciled = transactions.filter(t => t.is_reconciled).length;
                const total = transactions.length;
                
                return {
                    total,
                    reconciled,
                    unreconciled: total - reconciled,
                    reconciliationRate: total > 0 ? (reconciled / total) * 100 : 0
                };
            })
        );
    }

    /**
     * Manually match a transaction to a bill
     */
    manualMatch(transactionId: string, billId: string): Observable<boolean> {
        return from(this.supabaseService.getClient()
            .from('hb_transactions')
            .update({
                bill_id: billId,
                is_reconciled: true,
                updated_at: new Date().toISOString()
            })
            .eq('id', transactionId)
        ).pipe(
            map(result => {
                if (result.error) {
                    console.error('Manual match error:', result.error);
                    console.error('Transaction ID:', transactionId);
                    console.error('Bill ID:', billId);
                }
                return !result.error;
            })
        );
    }

    /**
     * Remove a transaction-bill match
     */
    removeMatch(transactionId: string): Observable<boolean> {
        return from(this.supabaseService.getClient()
            .from('hb_transactions')
            .update({
                bill_id: null,
                is_reconciled: false,
                updated_at: new Date().toISOString()
            })
            .eq('id', transactionId)
        ).pipe(
            map(result => {
                if (result.error) {
                    console.error('Remove match error:', result.error);
                    console.error('Transaction ID:', transactionId);
                }
                return !result.error;
            })
        );
    }
} 