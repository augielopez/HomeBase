import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { DuplicateCheckService } from './duplicate-check.service';

export interface ManualTransactionFormData {
  account_id: string;
  amount: number;
  date: string;
  name: string;
  merchant_name?: string;
  description?: string;
  category_id?: string;
  bank_source?: string;
}

export interface ManualTransactionResult {
  success: boolean;
  transactionId?: string;
  error?: string;
  isDuplicate?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ManualTransactionService {

  constructor(
    private supabaseService: SupabaseService,
    private duplicateCheckService: DuplicateCheckService
  ) {}

  /**
   * Create a manual transaction with duplicate detection
   */
  async createManualTransaction(
    formData: ManualTransactionFormData
  ): Promise<ManualTransactionResult> {
    try {
      // Check for duplicates first
      const duplicateCheck = await this.duplicateCheckService.checkForDuplicate(
        formData.account_id,
        formData.date,
        formData.amount,
        formData.name,
        'manual'
      );

      if (duplicateCheck.isDuplicate) {
        return {
          success: false,
          isDuplicate: true,
          error: 'This transaction already exists'
        };
      }

      // Create the transaction using safe insert
      const result = await this.duplicateCheckService.safeInsertTransaction(
        formData.account_id,
        formData.amount,
        formData.date,
        formData.name,
        'manual',
        undefined, // No CSV filename for manual transactions
        {
          merchant_name: formData.merchant_name,
          description: formData.description,
          category_id: formData.category_id,
          bank_source: formData.bank_source || 'manual'
        }
      );

      return result;
    } catch (error) {
      console.error('Error creating manual transaction:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Validate transaction data before creation
   */
  validateTransactionData(formData: ManualTransactionFormData): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!formData.account_id) {
      errors.push('Account is required');
    }

    if (!formData.amount || formData.amount === 0) {
      errors.push('Amount is required and must not be zero');
    }

    if (!formData.date) {
      errors.push('Date is required');
    } else {
      // Validate date format and ensure it's not in the future
      const transactionDate = new Date(formData.date);
      const today = new Date();
      today.setHours(23, 59, 59, 999); // End of today

      if (isNaN(transactionDate.getTime())) {
        errors.push('Invalid date format');
      } else if (transactionDate > today) {
        errors.push('Transaction date cannot be in the future');
      }
    }

    if (!formData.name || formData.name.trim().length === 0) {
      errors.push('Transaction name is required');
    }

    if (formData.name && formData.name.trim().length > 255) {
      errors.push('Transaction name is too long (maximum 255 characters)');
    }

    if (formData.merchant_name && formData.merchant_name.trim().length > 255) {
      errors.push('Merchant name is too long (maximum 255 characters)');
    }

    if (formData.description && formData.description.trim().length > 1000) {
      errors.push('Description is too long (maximum 1000 characters)');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Get available accounts for manual transaction creation
   */
  async getAvailableAccounts(): Promise<any[]> {
    try {
      const { data: accounts, error } = await this.supabaseService.getClient()
        .from('hb_accounts')
        .select('*')
        .order('name', { ascending: true });

      if (error) {
        console.error('Error loading accounts:', error);
        return [];
      }

      return accounts || [];
    } catch (error) {
      console.error('Error in getAvailableAccounts:', error);
      return [];
    }
  }

  /**
   * Get available categories for manual transaction creation
   */
  async getAvailableCategories(): Promise<any[]> {
    try {
      const { data: categories, error } = await this.supabaseService.getClient()
        .from('hb_transaction_categories')
        .select('*')
        .order('name', { ascending: true });

      if (error) {
        console.error('Error loading categories:', error);
        return [];
      }

      return categories || [];
    } catch (error) {
      console.error('Error in getAvailableCategories:', error);
      return [];
    }
  }
}


