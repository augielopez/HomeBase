import { Injectable } from '@angular/core';
import { SupabaseService } from '../../service/supabase.service';

@Injectable({
    providedIn: 'root'
})
export class TransactionMatchService {

    constructor(private supabaseService: SupabaseService) {}

    /**
     * Match a transaction to a bill
     * @param transactionId - The ID of the transaction to match
     * @param billId - The ID of the bill to match to
     * @returns Promise<void>
     */
    async matchTransactionToBill(transactionId: string, billId: string): Promise<void> {
        try {
            const { error } = await this.supabaseService.getClient()
                .from('hb_transactions')
                .update({ 
                    bill_id: billId,
                    updated_at: new Date().toISOString()
                })
                .eq('id', transactionId);

            if (error) {
                console.error('Error matching transaction to bill:', error);
                throw error;
            }

            console.log(`Successfully matched transaction ${transactionId} to bill ${billId}`);
        } catch (error) {
            console.error('Error in matchTransactionToBill:', error);
            throw error;
        }
    }

    /**
     * Unmatch a transaction from its bill
     * @param transactionId - The ID of the transaction to unmatch
     * @returns Promise<void>
     */
    async unmatchTransaction(transactionId: string): Promise<void> {
        try {
            const { error } = await this.supabaseService.getClient()
                .from('hb_transactions')
                .update({ 
                    bill_id: null,
                    updated_at: new Date().toISOString()
                })
                .eq('id', transactionId);

            if (error) {
                console.error('Error unmatching transaction:', error);
                throw error;
            }

            console.log(`Successfully unmatched transaction ${transactionId}`);
        } catch (error) {
            console.error('Error in unmatchTransaction:', error);
            throw error;
        }
    }

    /**
     * Load available bills for matching
     * @returns Promise<any[]> - Array of available bills
     */
    async loadAvailableBills(): Promise<any[]> {
        try {
            const { data: bills, error } = await this.supabaseService.getClient()
                .from('hb_bills')
                .select(`
                    id,
                    bill_name,
                    account_id
                `)
                .eq('status', 'Active')
                .order('bill_name', { ascending: true });

            if (error) {
                console.error('Error loading bills:', error);
                throw error;
            }

            // Transform the data to match the expected structure
            // Since bills now have bill_name directly, we don't need to join with accounts
            const availableBills = (bills?.map(bill => ({
                id: bill.id,
                bill_name: bill.bill_name
            })) as unknown as any[]) || [];

            console.log('Available bills for matching:', availableBills);
            return availableBills;
        } catch (error) {
            console.error('Error in loadAvailableBills:', error);
            throw error;
        }
    }
}
