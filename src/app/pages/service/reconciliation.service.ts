import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { Transaction as DbTransaction } from '../../interfaces/transaction.interface';
import { TransactionMatchService } from './transaction-match.service';

@Injectable({
    providedIn: 'root'
})
export class ReconciliationService {
    // Special UUID to mark transactions as excluded (not a bill)
    // Using a fixed UUID so it's consistent across the application
    public readonly EXCLUDED_TRANSACTION_ID = '00000000-0000-0000-0000-000000000001';

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
            // Exclude transactions that are matched to bills OR marked as excluded
            const { data: transactions, error } = await this.supabaseService.getClient()
                .from('hb_transactions')
                .select('*')
                .is('bill_id', null) // No bill_id means unreconciled
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
     * Filters based on frequency type rules and includes match count
     */
    async getUnmatchedBills(year: number, month: number): Promise<any[]> {
        try {
            // Calculate start and end dates for the month
            const startDate = new Date(year, month - 1, 1);
            const endDate = new Date(year, month, 0);
            
            const startDateStr = startDate.toISOString().split('T')[0];
            const endDateStr = endDate.toISOString().split('T')[0];

            // Get the month name for filtering Yearly bills
            const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                               'July', 'August', 'September', 'October', 'November', 'December'];
            const currentMonthName = monthNames[month - 1];

            // Get all active bills with frequency type information using database join
            const { data: bills, error: billsError } = await this.supabaseService.getClient()
                .from('hb_bills')
                .select(`
                    *,
                    frequency:hb_frequency_types(id, name)
                `)
                .eq('status', 'Active')
                .neq('id', this.EXCLUDED_TRANSACTION_ID) // Exclude the special "excluded" marker bill
                .order('bill_name', { ascending: true });

            if (billsError) {
                console.error('Error fetching bills:', billsError);
                throw billsError;
            }

            console.log('ReconciliationService: Bills fetched:', bills?.length || 0);

            if (!bills || bills.length === 0) {
                return [];
            }

            // Get all matches for these bills in the current month
            const billIds = bills.map(b => b.id);
            const { data: matches, error: matchesError } = await this.supabaseService.getClient()
                .from('hb_transactions')
                .select('bill_id')
                .in('bill_id', billIds)
                .lt('amount', 0) // Only negative amounts (debits)
                .gte('date', startDateStr)
                .lte('date', endDateStr);

            if (matchesError) {
                console.error('Error fetching matches:', matchesError);
                throw matchesError;
            }

            // Count matches per bill
            const matchCounts = new Map<string, number>();
            (matches || []).forEach((match: any) => {
                const count = matchCounts.get(match.bill_id) || 0;
                matchCounts.set(match.bill_id, count + 1);
            });

            // Filter and transform bills based on frequency rules
            const filteredBills = bills.filter(bill => {
                const frequencyName = bill.frequency?.name || 'Monthly';
                const matchCount = matchCounts.get(bill.id) || 0;

                // If frequency types aren't available, default to old behavior (show if not matched)
                if (!bill.frequency) {
                    return matchCount === 0;
                }

                switch (frequencyName) {
                    case 'AsNeeded':
                        // Always show AsNeeded bills
                        return true;

                    case 'Weekly':
                        // Show until 4 matches in current month
                        return matchCount < 4;

                    case 'Monthly':
                        // Show until 1 match in current month (default behavior)
                        return matchCount === 0;

                    case 'Yearly':
                        // Only show if due_date matches current month name
                        // and hasn't been matched yet this month
                        if (bill.due_date && bill.due_date.includes(currentMonthName)) {
                            return matchCount === 0;
                        }
                        return false;

                    default:
                        // Default to Monthly behavior
                        return matchCount === 0;
                }
            });

            console.log('ReconciliationService: Total bills fetched:', bills.length);
            console.log('ReconciliationService: Filtered bills count:', filteredBills.length);
            console.log('ReconciliationService: Match counts:', Object.fromEntries(matchCounts));
            console.log('ReconciliationService: Sample bill data:', bills[0]);
            console.log('ReconciliationService: Current month name:', currentMonthName);

            // Transform the data to match the expected format
            return filteredBills.map(bill => ({
                id: bill.id,
                name: bill.bill_name || 'Unnamed Bill',
                matchCount: matchCounts.get(bill.id) || 0,
                frequencyName: bill.frequency?.name || 'Monthly',
                bill: {
                    id: bill.id,
                    bill_name: bill.bill_name,
                    amount_due: bill.amount_due,
                    due_date: bill.due_date,
                    status: bill.status,
                    description: bill.description,
                    frequency_id: bill.frequency_id
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
                .neq('bill_id', this.EXCLUDED_TRANSACTION_ID) // Exclude the special "excluded" marker
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

    /**
     * Mark a transaction as excluded (not a bill)
     */
    async excludeTransaction(transactionId: string): Promise<boolean> {
        try {
            const { error } = await this.supabaseService.getClient()
                .from('hb_transactions')
                .update({ bill_id: this.EXCLUDED_TRANSACTION_ID })
                .eq('id', transactionId);

            if (error) {
                console.error('Error excluding transaction:', error);
                throw error;
            }

            return true;
        } catch (error) {
            console.error('Error in excludeTransaction:', error);
            throw error;
        }
    }

    /**
     * Undo exclusion (mark transaction as unreconciled again)
     */
    async undoExcludeTransaction(transactionId: string): Promise<boolean> {
        try {
            const { error } = await this.supabaseService.getClient()
                .from('hb_transactions')
                .update({ bill_id: null })
                .eq('id', transactionId);

            if (error) {
                console.error('Error undoing exclusion:', error);
                throw error;
            }

            return true;
        } catch (error) {
            console.error('Error in undoExcludeTransaction:', error);
            throw error;
        }
    }

    /**
     * Bulk exclude multiple transactions (mark as not bills)
     */
    async bulkExcludeTransactions(transactionIds: string[]): Promise<boolean> {
        try {
            const { error } = await this.supabaseService.getClient()
                .from('hb_transactions')
                .update({ bill_id: this.EXCLUDED_TRANSACTION_ID })
                .in('id', transactionIds);

            if (error) {
                console.error('Error bulk excluding transactions:', error);
                throw error;
            }

            return true;
        } catch (error) {
            console.error('Error in bulkExcludeTransactions:', error);
            throw error;
        }
    }

    /**
     * Get excluded transactions for a specific month
     */
    async getExcludedTransactions(year: number, month: number): Promise<any[]> {
        try {
            // Calculate start and end dates for the month
            const startDate = new Date(year, month - 1, 1);
            const endDate = new Date(year, month, 0);
            
            const startDateStr = startDate.toISOString().split('T')[0];
            const endDateStr = endDate.toISOString().split('T')[0];

            // Use account type strings directly
            const accountIds = ['CHECKING', 'Credit Card'];

            // Query transactions marked as excluded
            const { data: transactions, error } = await this.supabaseService.getClient()
                .from('hb_transactions')
                .select('*')
                .eq('bill_id', this.EXCLUDED_TRANSACTION_ID)
                .lt('amount', 0) // Only negative amounts (debits)
                .in('account_id', accountIds)
                .gte('date', startDateStr)
                .lte('date', endDateStr)
                .order('date', { ascending: false });

            if (error) {
                console.error('Error fetching excluded transactions:', error);
                throw error;
            }

            console.log('ReconciliationService: Excluded transactions:', transactions);
            return transactions || [];
        } catch (error) {
            console.error('Error in getExcludedTransactions:', error);
            throw error;
        }
    }
}