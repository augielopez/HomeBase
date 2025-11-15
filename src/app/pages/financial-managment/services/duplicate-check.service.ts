import { Injectable } from '@angular/core';
import { SupabaseService } from '../../service/supabase.service';

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class DuplicateCheckService {

  constructor(private supabaseService: SupabaseService) {}

  /**
   * Check if a transaction is a duplicate using the database function
   */
  async checkForDuplicate(
    accountId: string,
    date: string,
    amount: number,
    name: string,
    importMethod: 'csv' | 'manual' = 'manual',
    csvFilename?: string
  ): Promise<DuplicateCheckResult> {
    try {
      const userId = await this.supabaseService.getCurrentUserId();
      
      const { data, error } = await this.supabaseService.getClient()
        .rpc('check_duplicate_transaction', {
          p_user_id: userId,
          p_account_id: accountId,
          p_date: date,
          p_amount: amount,
          p_name: name,
          p_import_method: importMethod,
          p_csv_filename: csvFilename || null
        });

      if (error) {
        console.error('Error checking duplicate:', error);
        return { isDuplicate: false, error: error.message };
      }

      return { isDuplicate: data || false };
    } catch (error) {
      console.error('Error in checkForDuplicate:', error);
      return { 
        isDuplicate: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      };
    }
  }

  /**
   * Safely insert a transaction with duplicate checking
   */
  async safeInsertTransaction(
    accountId: string,
    amount: number,
    date: string,
    name: string,
    importMethod: 'csv' | 'manual' = 'manual',
    csvFilename?: string,
    additionalFields?: any
  ): Promise<{ success: boolean; transactionId?: string; error?: string }> {
    try {
      const userId = await this.supabaseService.getClient();
      
      // Prepare the parameters for the safe insert function
      const params = {
        p_user_id: userId,
        p_account_id: accountId,
        p_amount: amount,
        p_date: date,
        p_name: name,
        p_import_method: importMethod,
        p_csv_filename: csvFilename || null,
        p_transaction_id: additionalFields?.transaction_id || null,
        p_merchant_name: additionalFields?.merchant_name || null,
        p_description: additionalFields?.description || null,
        p_category_id: additionalFields?.category_id || null,
        p_bank_source: additionalFields?.bank_source || null,
        p_pending: additionalFields?.pending || false,
        p_iso_currency_code: additionalFields?.iso_currency_code || 'USD'
      };

      const { data, error } = await this.supabaseService.getClient()
        .rpc('safe_insert_transaction', params);

      if (error) {
        console.error('Error inserting transaction:', error);
        return { success: false, error: error.message };
      }

      if (data && data.length > 0) {
        const result = data[0];
        return {
          success: result.inserted,
          transactionId: result.inserted ? result.transaction_id : undefined,
          error: result.inserted ? undefined : result.error_message
        };
      }

      return { success: false, error: 'No result returned from database function' };
    } catch (error) {
      console.error('Error in safeInsertTransaction:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      };
    }
  }

  /**
   * Simple duplicate check using direct query (fallback method)
   */
  async checkForDuplicateSimple(
    accountId: string,
    date: string,
    amount: number,
    name: string,
    importMethod: 'csv' | 'manual' = 'manual',
    csvFilename?: string
  ): Promise<DuplicateCheckResult> {
    try {
      const userId = await this.supabaseService.getCurrentUserId();
      
      let query = this.supabaseService.getClient()
        .from('hb_transactions')
        .select('id')
        .eq('user_id', userId)
        .eq('account_id', accountId)
        .eq('date', date)
        .eq('amount', amount)
        .eq('name', name)
        .eq('import_method', importMethod);

      // Add CSV-specific conditions
      if (importMethod === 'csv' && csvFilename) {
        query = query.eq('csv_filename', csvFilename);
      }

      const { data: existingTransactions, error } = await query.limit(1);

      if (error) {
        console.error('Error checking for duplicates:', error);
        return { isDuplicate: false, error: error.message };
      }

      return { isDuplicate: (existingTransactions && existingTransactions.length > 0) };
    } catch (error) {
      console.error('Error in checkForDuplicateSimple:', error);
      return { 
        isDuplicate: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      };
    }
  }
}




