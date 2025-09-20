import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { Transaction as DbTransaction } from '../../interfaces/transaction.interface';
import { TransactionMatchService } from './transaction-match.service';

@Injectable({
    providedIn: 'root'
})
export class ReconciliationService {
    constructor(
        private supabaseService: SupabaseService,
        private transactionMatchService: TransactionMatchService
    ) {}

    /**
     * Get unreconciled transactions for a specific month
     * Only includes transactions from CHECKING and Credit Card accounts
     * that don't have a bill_id (unreconciled)
     */
    async getUnreconciledTransactions(year: number, month: number): Promise<DbTransaction[]> {
        try {
            // Calculate start and end dates for the month
            const startDate = new Date(year, month - 1, 1); // month is 0-indexed
            const endDate = new Date(year, month, 0); // Last day of the month
            
            const startDateStr = startDate.toISOString().split('T')[0];
            const endDateStr = endDate.toISOString().split('T')[0];

            // Use account type strings directly
            const accountIds = ['CHECKING', 'Credit Card'];

            // Query transactions only - no joins needed
            const { data: transactions, error } = await this.supabaseService.getClient()
                .from('hb_transactions')
                .select('*')
                .is('bill_id', null) // No bill_id means unreconciled - use .is() for null checks
                .gte('date', startDateStr)
                .lte('date', endDateStr)
                .in('account_id', accountIds)
                .order('date', { ascending: false });

            if (error) {
                console.error('Error fetching unreconciled transactions:', error);
                throw error;
            }

            return transactions || [];
        } catch (error) {
            console.error('Error in getUnreconciledTransactions:', error);
            throw error;
        }
    }

    /**
     * Get bills that are not yet matched to transactions
     */
    async getUnmatchedBills(year: number, month: number): Promise<any[]> {
        try {
            // Calculate start and end dates for the month
            const startDate = new Date(year, month - 1, 1);
            const endDate = new Date(year, month, 0);
            
            const startDateStr = startDate.toISOString().split('T')[0];
            const endDateStr = endDate.toISOString().split('T')[0];

            // First get all bill IDs that have transactions in the selected month
            const { data: matchedBillIds, error: matchedError } = await this.supabaseService.getClient()
                .from('hb_transactions')
                .select('bill_id')
                .not('bill_id', 'is', null)
                .gte('date', startDateStr)
                .lte('date', endDateStr);

            if (matchedError) {
                console.error('Error fetching matched bill IDs:', matchedError);
                throw matchedError;
            }

            const matchedIds = (matchedBillIds || []).map((t: any) => t.bill_id);

            // Then get bills that are NOT in the matched list
            const { data: bills, error } = await this.supabaseService.getClient()
                .from('hb_accounts')
                .select(`
                    id,
                    name,
                    bill:hb_bills!inner(*)
                `)
                .eq('bill.status', 'Active')
                .not('bill.id', 'in', `(${matchedIds.join(',')})`)
                .order('name', { ascending: true });

            if (error) {
                console.error('Error fetching unmatched bills:', error);
                throw error;
            }

            return bills || [];
        } catch (error) {
            console.error('Error in getUnmatchedBills:', error);
            throw error;
        }
    }

    /**
     * Get matched transactions (transactions that have a bill_id)
     */
    async getMatchedTransactions(year: number, month: number): Promise<any[]> {
        try {
            // Calculate start and end dates for the month
            const startDate = new Date(year, month - 1, 1);
            const endDate = new Date(year, month, 0);
            
            const startDateStr = startDate.toISOString().split('T')[0];
            const endDateStr = endDate.toISOString().split('T')[0];

            // Use account type strings directly (same as unreconciled)
            const accountIds = ['CHECKING', 'Credit Card'];

            // Query matched transactions with proper joins
            const { data: transactions, error } = await this.supabaseService.getClient()
                .from('hb_transactions')
                .select(`
                    *,
                    bill:hb_bills!inner(
                        *,
                        account:hb_accounts!inner(
                            id,
                            name
                        )
                    )
                `)
                .not('bill_id', 'is', null) // Has a bill_id (matched)
                .in('account_id', accountIds) // Filter by transaction's account_id
                .gte('date', startDateStr)
                .lte('date', endDateStr)
                .order('date', { ascending: false });

            if (error) {
                console.error('Error fetching matched transactions:', error);
                throw error;
            }

            return transactions || [];
        } catch (error) {
            console.error('Error in getMatchedTransactions:', error);
            throw error;
        }
    }

    /**
     * Match a transaction to a bill
     * Delegates to TransactionMatchService with additional reconciliation logic
     */
    async matchTransactionToBill(transactionId: string, billId: string): Promise<void> {
        try {
            const userId = await this.supabaseService.getCurrentUserId();

            // Use the transaction match service for the core matching logic
            await this.transactionMatchService.matchTransactionToBill(transactionId, billId);

            // Additional reconciliation-specific logic
            const { error } = await this.supabaseService.getClient()
                .from('hb_transactions')
                .update({ 
                    is_reconciled: true,
                    updated_at: new Date().toISOString()
                })
                .eq('id', transactionId)
                .eq('user_id', userId);

            if (error) {
                console.error('Error updating reconciliation status:', error);
                throw error;
            }
        } catch (error) {
            console.error('Error in matchTransactionToBill:', error);
            throw error;
        }
    }

    /**
     * Unmatch a transaction from its bill
     * Delegates to TransactionMatchService with additional reconciliation logic
     */
    async unmatchTransaction(transactionId: string): Promise<void> {
        try {
            const userId = await this.supabaseService.getCurrentUserId();

            // Use the transaction match service for the core unmatching logic
            await this.transactionMatchService.unmatchTransaction(transactionId);

            // Additional reconciliation-specific logic
            const { error } = await this.supabaseService.getClient()
                .from('hb_transactions')
                .update({ 
                    is_reconciled: false,
                    updated_at: new Date().toISOString()
                })
                .eq('id', transactionId)
                .eq('user_id', userId);

            if (error) {
                console.error('Error updating reconciliation status:', error);
                throw error;
            }
        } catch (error) {
            console.error('Error in unmatchTransaction:', error);
            throw error;
        }
    }
}