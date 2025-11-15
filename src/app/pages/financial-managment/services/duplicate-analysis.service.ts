import { Injectable } from '@angular/core';
import { SupabaseService } from '../../service/supabase.service';

export interface DuplicateTransaction {
  user_id: string;
  account_id: string;
  date: string;
  amount: number;
  name: string;
  import_method: string;
  csv_filename?: string;
  duplicate_count: number;
  transaction_ids: string;
}

export interface DuplicateSummary {
  import_method: string;
  duplicate_groups: number;
  total_duplicate_transactions: number;
}

export interface CleanupResult {
  deleted_count: number;
  kept_transaction_ids: string;
}

@Injectable({
  providedIn: 'root'
})
export class DuplicateAnalysisService {

  constructor(private supabaseService: SupabaseService) {}

  /**
   * Find all duplicate transactions in the database
   */
  async findDuplicateTransactions(): Promise<DuplicateTransaction[]> {
    try {
      const { data, error } = await this.supabaseService.getClient()
        .rpc('find_duplicate_transactions');

      if (error) {
        console.error('Error finding duplicate transactions:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error in findDuplicateTransactions:', error);
      throw error;
    }
  }

  /**
   * Get a summary of duplicate transactions by import method
   */
  async getDuplicateSummary(): Promise<DuplicateSummary[]> {
    try {
      const { data, error } = await this.supabaseService.getClient()
        .rpc('duplicate_summary');

      if (error) {
        console.error('Error getting duplicate summary:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error in getDuplicateSummary:', error);
      throw error;
    }
  }

  /**
   * Clean duplicate transactions (removes all but the oldest in each group)
   */
  async cleanDuplicateTransactions(): Promise<CleanupResult> {
    try {
      const { data, error } = await this.supabaseService.getClient()
        .rpc('clean_duplicate_transactions');

      if (error) {
        console.error('Error cleaning duplicate transactions:', error);
        throw error;
      }

      return data?.[0] || { deleted_count: 0, kept_transaction_ids: '' };
    } catch (error) {
      console.error('Error in cleanDuplicateTransactions:', error);
      throw error;
    }
  }

  /**
   * Simple duplicate check using direct query (alternative method)
   */
  async findDuplicatesSimple(): Promise<any[]> {
    try {
      const { data, error } = await this.supabaseService.getClient()
        .from('hb_transactions')
        .select('user_id, account_id, date, amount, name, import_method, csv_filename')
        .order('user_id')
        .order('account_id')
        .order('date');

      if (error) {
        console.error('Error finding duplicates (simple method):', error);
        throw error;
      }

      if (!data) {
        return [];
      }

      const grouped = new Map<string, any>();

      for (const row of data) {
        const key = [
          row.user_id,
          row.account_id,
          row.date,
          row.amount,
          row.name,
          row.import_method,
          row.csv_filename || 'null'
        ].join('|');

        if (!grouped.has(key)) {
          grouped.set(key, {
            user_id: row.user_id,
            account_id: row.account_id,
            date: row.date,
            amount: row.amount,
            name: row.name,
            import_method: row.import_method,
            csv_filename: row.csv_filename,
            count: 0
          });
        }

        grouped.get(key).count += 1;
      }

      return Array.from(grouped.values())
        .filter((item) => item.count > 1)
        .sort((a, b) => b.count - a.count);
    } catch (error) {
      console.error('Error in findDuplicatesSimple:', error);
      throw error;
    }
  }

  /**
   * Get detailed information about a specific duplicate group
   */
  async getDuplicateDetails(
    userId: string,
    accountId: string,
    date: string,
    amount: number,
    name: string,
    importMethod: string,
    csvFilename?: string
  ): Promise<any[]> {
    try {
      let query = this.supabaseService.getClient()
        .from('hb_transactions')
        .select('*')
        .eq('user_id', userId)
        .eq('account_id', accountId)
        .eq('date', date)
        .eq('amount', amount)
        .eq('name', name)
        .eq('import_method', importMethod)
        .order('created_at', { ascending: true });

      if (csvFilename) {
        query = query.eq('csv_filename', csvFilename);
      } else {
        query = query.is('csv_filename', null);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error getting duplicate details:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error in getDuplicateDetails:', error);
      throw error;
    }
  }
}




