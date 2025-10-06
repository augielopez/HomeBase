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
                .lt('amount', 0) // Only negative amounts (debits), exclude deposits
                .gte('date', startDateStr)
                .lte('date', endDateStr)
                .in('account_id', accountIds)
                .order('date', { ascending: false });

            if (error) {
                console.error('Error fetching unreconciled transactions:', error);
                throw error;
            }

            console.log('ReconciliationService: Raw transactions data:', transactions);
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
                .lt('amount', 0) // Only negative amounts (debits)
                .gte('date', startDateStr)
                .lte('date', endDateStr);

            if (matchedError) {
                console.error('Error fetching matched bill IDs:', matchedError);
                throw matchedError;
            }

            const matchedIds = (matchedBillIds || []).map((t: any) => t.bill_id);

            // Now get bills directly from hb_bills table
            let { data: bills, error } = await this.supabaseService.getClient()
                .from('hb_bills')
                .select('*')
                .eq('status', 'Active')
                .order('bill_name', { ascending: true });

            // If there are matched bill IDs, filter them out in JavaScript
            if (matchedIds.length > 0 && bills) {
                bills = bills.filter(bill => !matchedIds.includes(bill.id));
            }

            if (error) {
                console.error('Error fetching unmatched bills:', error);
                throw error;
            }

            console.log('ReconciliationService: Raw bills data:', bills);
            console.log('ReconciliationService: Matched bill IDs:', matchedIds);

            // Transform the data to match the expected format
            return (bills || []).map(bill => ({
                id: bill.id, // Use bill id as the main id
                name: bill.bill_name || 'Unnamed Bill', // Use bill name
                bill: {
                    id: bill.id,
                    bill_name: bill.bill_name,
                    amount_due: bill.amount_due,
                    due_date: bill.due_date,
                    status: bill.status,
                    description: bill.description
                }
            }));
        } catch (error) {
            console.error('Error in getUnmatchedBills:', error);
            throw error;
        }
    }

    /**
     * Get transactions that are already matched to bills
     */
    async getMatchedTransactions(year: number, month: number): Promise<any[]> {
        try {
            // Calculate start and end dates for the month
            const startDate = new Date(year, month - 1, 1);
            const endDate = new Date(year, month, 0);
            
            const startDateStr = startDate.toISOString().split('T')[0];
            const endDateStr = endDate.toISOString().split('T')[0];

            // Use account type strings directly
            const accountIds = ['CHECKING', 'Credit Card'];

            // First get matched transactions
            const { data: transactions, error } = await this.supabaseService.getClient()
                .from('hb_transactions')
                .select('*')
                .not('bill_id', 'is', null) // Has a bill_id (matched)
                .lt('amount', 0) // Only negative amounts (debits)
                .in('account_id', accountIds) // Filter by transaction's account_id
                .gte('date', startDateStr)
                .lte('date', endDateStr)
                .order('date', { ascending: false });

            if (error) {
                console.error('Error fetching matched transactions:', error);
                throw error;
            }

            // Then get bills for the matched transactions
            const billIds = [...new Set((transactions || []).map(t => t.bill_id).filter(id => id != null))];
            
            let billsData = [];
            if (billIds.length > 0) {
                const { data: bills, error: billsError } = await this.supabaseService.getClient()
                    .from('hb_bills')
                    .select('*')
                    .in('id', billIds);

                if (billsError) {
                    console.error('Error fetching bills for matched transactions:', billsError);
                    throw billsError;
                }

                billsData = bills || [];
            }

            // Create a map of bills by ID
            const billsMap = new Map();
            billsData.forEach(bill => {
                billsMap.set(bill.id, bill);
            });

            // Combine transactions with their bills
            return (transactions || []).map(transaction => ({
                ...transaction,
                bill: billsMap.get(transaction.bill_id) || null
            }));
        } catch (error) {
            console.error('Error in getMatchedTransactions:', error);
            throw error;
        }
    }

    /**
     * Manually match a transaction to a bill
     */
    async manualMatch(transactionId: string, billId: string): Promise<boolean> {
        try {
            const { error } = await this.supabaseService.getClient()
                .from('hb_transactions')
                .update({ bill_id: billId })
                .eq('id', transactionId);

            if (error) {
                console.error('Error matching transaction to bill:', error);
                throw error;
            }

            return true;
        } catch (error) {
            console.error('Error in manualMatch:', error);
            throw error;
        }
    }

    /**
     * Match a transaction to a bill (alias for manualMatch for backward compatibility)
     */
    async matchTransactionToBill(transactionId: string, billId: string): Promise<boolean> {
        return this.manualMatch(transactionId, billId);
    }
}