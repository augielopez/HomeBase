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
export class ReconciliationService {
    private readonly AMOUNT_TOLERANCE = 5.0; // $5 tolerance
    private readonly DATE_TOLERANCE_DAYS = 3; // ±3 days

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
     * Get transactions for a date period
     */
    private async getTransactionsForPeriod(startDate: string, endDate: string): Promise<Transaction[]> {
        const { data: transactions, error } = await this.supabaseService.getClient()
            .from('hb_transactions')
            .select(`
                *,
                category:category_id(*),
                bill:bill_id(*),
                account:account_id(*)
            `)
            .gte('date', startDate)
            .lte('date', endDate)
            .order('date', { ascending: false });

        if (error) {
            console.error('Error fetching transactions:', error);
            return [];
        }

        return transactions || [];
    }

    /**
     * Get bills for a date period
     */
    private async getBillsForPeriod(startDate: string, endDate: string): Promise<Bill[]> {
        const { data: bills, error } = await this.supabaseService.getClient()
            .from('hb_bills')
            .select('*')
            .gte('due_date', startDate)
            .lte('due_date', endDate)
            .eq('status', 'Active')
            .order('due_date', { ascending: true });

        if (error) {
            console.error('Error fetching bills:', error);
            return [];
        }

        return bills || [];
    }

    /**
     * Perform the actual reconciliation logic
     */
    private performReconciliation(transactions: Transaction[], bills: Bill[]): ReconciliationResult {
        const matched: ReconciliationMatch[] = [];
        const unmatchedTransactions: Transaction[] = [];
        const unmatchedBills: Bill[] = [...bills];

        // Sort transactions by amount (descending) for better matching
        const sortedTransactions = [...transactions].sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));

        for (const transaction of sortedTransactions) {
            const bestMatch = this.findBestBillMatch(transaction, unmatchedBills);
            
            if (bestMatch) {
                matched.push(bestMatch);
                // Remove matched bill from unmatched list
                const billIndex = unmatchedBills.findIndex(bill => bill.id === bestMatch.bill.id);
                if (billIndex !== -1) {
                    unmatchedBills.splice(billIndex, 1);
                }
            } else {
                unmatchedTransactions.push(transaction);
            }
        }

        return {
            matched,
            unmatchedTransactions,
            unmatchedBills,
            summary: {
                totalTransactions: transactions.length,
                totalBills: bills.length,
                matchedCount: matched.length,
                unmatchedTransactionCount: unmatchedTransactions.length,
                unmatchedBillCount: unmatchedBills.length
            }
        };
    }

    /**
     * Find the best matching bill for a transaction
     */
    private findBestBillMatch(transaction: Transaction, bills: Bill[]): ReconciliationMatch | null {
        let bestMatch: ReconciliationMatch | null = null;
        let bestConfidence = 0;

        for (const bill of bills) {
            const confidence = this.calculateMatchConfidence(transaction, bill);
            
            if (confidence > bestConfidence && confidence >= 0.7) { // Minimum 70% confidence
                bestConfidence = confidence;
                bestMatch = {
                    transaction,
                    bill,
                    confidence,
                    matchReason: this.getMatchReason(transaction, bill, confidence)
                };
            }
        }

        return bestMatch;
    }

    /**
     * Calculate confidence score for transaction-bill match
     */
    private calculateMatchConfidence(transaction: Transaction, bill: Bill): number {
        let confidence = 0;
        let factors = 0;

        // Amount matching (40% weight)
        if (bill.amount_due && transaction.amount) {
            const amountDiff = Math.abs(Math.abs(transaction.amount) - bill.amount_due);
            if (amountDiff <= this.AMOUNT_TOLERANCE) {
                const amountConfidence = 1 - (amountDiff / this.AMOUNT_TOLERANCE);
                confidence += amountConfidence * 0.4;
            }
            factors++;
        }

        // Date matching (30% weight)
        if (bill.due_date && transaction.date) {
            const transactionDate = new Date(transaction.date);
            const billDate = new Date(bill.due_date);
            const daysDiff = Math.abs(transactionDate.getTime() - billDate.getTime()) / (1000 * 60 * 60 * 24);
            
            if (daysDiff <= this.DATE_TOLERANCE_DAYS) {
                const dateConfidence = 1 - (daysDiff / this.DATE_TOLERANCE_DAYS);
                confidence += dateConfidence * 0.3;
            }
            factors++;
        }

        // Merchant/description matching (20% weight)
        if (bill.description && transaction.merchant_name) {
            const merchantSimilarity = this.calculateStringSimilarity(
                bill.description.toLowerCase(),
                transaction.merchant_name.toLowerCase()
            );
            confidence += merchantSimilarity * 0.2;
            factors++;
        }

        // Transaction name matching (10% weight)
        if (bill.description && transaction.name) {
            const nameSimilarity = this.calculateStringSimilarity(
                bill.description.toLowerCase(),
                transaction.name.toLowerCase()
            );
            confidence += nameSimilarity * 0.1;
            factors++;
        }

        // Normalize confidence if no factors were considered
        if (factors === 0) {
            return 0;
        }

        return Math.min(confidence, 1);
    }

    /**
     * Calculate string similarity using simple algorithm
     */
    private calculateStringSimilarity(str1: string, str2: string): number {
        if (str1 === str2) return 1;
        if (str1.length === 0 || str2.length === 0) return 0;

        const longer = str1.length > str2.length ? str1 : str2;
        const shorter = str1.length > str2.length ? str2 : str1;

        if (longer.length === 0) return 1;

        const editDistance = this.levenshteinDistance(longer, shorter);
        return (longer.length - editDistance) / longer.length;
    }

    /**
     * Calculate Levenshtein distance between two strings
     */
    private levenshteinDistance(str1: string, str2: string): number {
        const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));

        for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
        for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

        for (let j = 1; j <= str2.length; j++) {
            for (let i = 1; i <= str1.length; i++) {
                const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
                matrix[j][i] = Math.min(
                    matrix[j][i - 1] + 1,
                    matrix[j - 1][i] + 1,
                    matrix[j - 1][i - 1] + indicator
                );
            }
        }

        return matrix[str2.length][str1.length];
    }

    /**
     * Get human-readable match reason
     */
    private getMatchReason(transaction: Transaction, bill: Bill, confidence: number): string {
        const reasons: string[] = [];

        if (bill.amount_due && transaction.amount) {
            const amountDiff = Math.abs(Math.abs(transaction.amount) - bill.amount_due);
            if (amountDiff <= this.AMOUNT_TOLERANCE) {
                reasons.push(`Amount matches (${amountDiff.toFixed(2)} difference)`);
            }
        }

        if (bill.due_date && transaction.date) {
            const transactionDate = new Date(transaction.date);
            const billDate = new Date(bill.due_date);
            const daysDiff = Math.abs(transactionDate.getTime() - billDate.getTime()) / (1000 * 60 * 60 * 24);
            
            if (daysDiff <= this.DATE_TOLERANCE_DAYS) {
                reasons.push(`Date within ${daysDiff.toFixed(0)} days`);
            }
        }

        if (bill.description && transaction.merchant_name) {
            const similarity = this.calculateStringSimilarity(
                bill.description.toLowerCase(),
                transaction.merchant_name.toLowerCase()
            );
            if (similarity > 0.5) {
                reasons.push(`Merchant similarity: ${(similarity * 100).toFixed(0)}%`);
            }
        }

        return reasons.length > 0 ? reasons.join(', ') : 'General match';
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
            map(result => !result.error)
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
            map(result => !result.error)
        );
    }
} 