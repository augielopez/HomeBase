import { Injectable } from '@angular/core';
import { SupabaseService } from '../../service/supabase.service';
import { QuickBillForm } from '../reconciliation/bill-creation-dialog/bill-creation-dialog.component';

export interface CreatedBill {
  id: string;
  billName: string;
  amount: number;
  dueDate: string;
  billType: string;
  description?: string;
  status: string;
}

@Injectable({
  providedIn: 'root'
})
export class BillCreationService {

  constructor(private supabaseService: SupabaseService) {}

  /**
   * Create a new bill in the database
   */
  async createBill(formData: QuickBillForm): Promise<CreatedBill> {
    try {
      const userId = await this.supabaseService.getCurrentUserId();
      
      if (!userId) {
        throw new Error('User not authenticated');
      }

      // Map bill type to a default bill type ID
      // In a real implementation, you'd want to get this from the database
      const billTypeId = await this.getBillTypeId(formData.billType || 'other');

      // Create the bill payload
      const billPayload = {
        bill_name: formData.billName,
        amount_due: formData.amount,
        due_date: formData.dueDate.toISOString().split('T')[0], // Convert to YYYY-MM-DD format
        status: formData.status || 'Active',
        description: formData.description || `${formData.billName} - Bill`,
        priority_id: formData.priorityId || null,
        frequency_id: formData.frequencyId || null,
        bill_type_id: formData.billTypeId || billTypeId,
        payment_type_id: formData.paymentTypeId || null,
        tag_id: formData.tagId || null,
        is_fixed_bill: formData.isFixedBill || false,
        is_included_in_monthly_payment: formData.isIncludedInMonthlyPayment || false,
        created_by: 'USER',
        updated_by: 'USER'
      };

      // Insert the bill into hb_bills table
      const { data: newBill, error } = await this.supabaseService.getClient()
        .from('hb_bills')
        .insert([billPayload])
        .select('id, bill_name, amount_due, due_date, status, description, bill_type_id, account_id')
        .single();

      if (error) {
        console.error('Error creating bill:', error);
        throw new Error(`Failed to create bill: ${error.message}`);
      }

      // Return the created bill in the format expected by the reconciliation component
      return {
        id: newBill.id,
        billName: formData.billName,
        amount: newBill.amount_due,
        dueDate: newBill.due_date,
        billType: formData.billType || 'other',
        description: newBill.description,
        status: newBill.status
      };

    } catch (error) {
      console.error('Error in createBill:', error);
      throw error;
    }
  }

  /**
   * Get bill type ID for a given bill type string
   * This is a simplified implementation - in production you'd query the database
   */
  private async getBillTypeId(billType: string): Promise<string | null> {
    try {
      const { data: billTypes, error } = await this.supabaseService.getClient()
        .from('hb_bill_types')
        .select('id, name')
        .eq('name', billType);

      if (error) {
        console.error('Error fetching bill types:', error);
        // Return a default bill type ID
        return await this.getDefaultBillTypeId();
      }

      if (billTypes && billTypes.length > 0) {
        return billTypes[0].id;
      }

      // If no exact match, try to find a similar one or use default
      return await this.getDefaultBillTypeId();

    } catch (error) {
      console.error('Error getting bill type ID:', error);
      return await this.getDefaultBillTypeId();
    }
  }

  /**
   * Get default bill type ID
   */
  private async getDefaultBillTypeId(): Promise<string | null> {
    try {
      const { data: defaultBillType, error } = await this.supabaseService.getClient()
        .from('hb_bill_types')
        .select('id')
        .eq('name', 'Other')
        .single();

      if (error || !defaultBillType) {
        // If no default found, return null instead of invalid UUID
        console.warn('No default bill type found, will insert null');
        return null;
      }

      return defaultBillType.id;

    } catch (error) {
      console.error('Error getting default bill type ID:', error);
      return null; // Return null instead of invalid UUID
    }
  }

  /**
   * Get default owner type ID for the account
   */
  private async getDefaultOwnerTypeId(): Promise<string> {
    try {
      const { data: defaultOwnerType, error } = await this.supabaseService.getClient()
        .from('hb_owner_types')
        .select('id')
        .eq('name', 'Personal')
        .single();

      if (error || !defaultOwnerType) {
        console.warn('No default owner type found, using fallback');
        return 'default-owner-type-id'; // This should be a real UUID in production
      }

      return defaultOwnerType.id;

    } catch (error) {
      console.error('Error getting default owner type ID:', error);
      return 'default-owner-type-id'; // Fallback
    }
  }

  /**
   * Get all available bill types for the dropdown
   */
  async getBillTypes(): Promise<Array<{label: string, value: string}>> {
    try {
      const { data: billTypes, error } = await this.supabaseService.getClient()
        .from('hb_bill_types')
        .select('id, name')
        .order('name');

      if (error) {
        console.error('Error fetching bill types:', error);
        return this.getDefaultBillTypes();
      }

      return billTypes.map(bt => ({
        label: bt.name,
        value: bt.id
      }));

    } catch (error) {
      console.error('Error getting bill types:', error);
      return this.getDefaultBillTypes();
    }
  }

  /**
   * Get default bill types as fallback
   */
  private getDefaultBillTypes(): Array<{label: string, value: string}> {
    return [
      { label: 'Utilities', value: 'utilities' },
      { label: 'Rent/Mortgage', value: 'rent_mortgage' },
      { label: 'Insurance', value: 'insurance' },
      { label: 'Credit Card', value: 'credit_card' },
      { label: 'Loan Payment', value: 'loan_payment' },
      { label: 'Subscription', value: 'subscription' },
      { label: 'Phone/Internet', value: 'phone_internet' },
      { label: 'Medical', value: 'medical' },
      { label: 'Other', value: 'other' }
    ];
  }
}
