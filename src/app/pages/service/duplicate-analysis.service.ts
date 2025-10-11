import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';

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
        .select(`
          user_id,
          account_id,
          date,
          amount,
          name,
          import_method,
          csv_filename,
          count:count(*)
        `)
        .group('user_id, account_id, date, amount, name, import_method, csv_filename')
        .having('count(*)', 'gt', 1)
        .order('count', { ascending: false });

      if (error) {
        console.error('Error finding duplicates (simple method):', error);
        throw error;
      }

      return data || [];
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




