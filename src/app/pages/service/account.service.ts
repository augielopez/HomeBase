import { Injectable } from '@angular/core';
import { SupabaseService } from '../service/supabase.service';
import { AccountExtended } from '../accounts/account-extended.interface';
import { Account } from '../../interfaces/account.interface';

export interface AccountFormData {
  account: {
    accountName: string;
    ownerTypeId: string;
    username?: string;
    password?: string;
    url?: string;
    description?: string;
  };
  bill: {
    hasBill: boolean;
    linkExistingBill?: boolean;
    existingBillId?: string;
    billTypeId?: string;
    billAmount?: number;
    dueDate?: string;
    isActive?: boolean;
    priorityId?: string;
    frequencyId?: string;
    lastPaid?: string;
    isFixedBill?: boolean;
    paymentTypeId?: string;
    tagId?: string;
    isIncludedInMonthlyPayment?: boolean;
  };
  creditCard: {
    hasCreditCard: boolean;
    cardType?: string;
    cardNumber?: string;
    cardHolderName?: string;
    expiryDate?: string | Date;
    creditLimit?: number;
    balance?: number;
    apr?: number;
    purchaseRate?: number;
    cashAdvanceRate?: number;
    balanceTransferRate?: number;
    annualFee?: number;
  };
  warranty: {
    hasWarranty: boolean;
    warrantyTypeId?: string;
    provider?: string;
    coverageStart?: string;
    coverageEnd?: string;
    terms?: string;
    claimProcedure?: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class AccountService {
  constructor(private supabaseService: SupabaseService) {}

  /**
   * Check if a login combination already exists
   */
  async checkExistingLogin(username: string, password: string): Promise<boolean> {
    const encodedPassword = btoa(password);
    const { data, error } = await this.supabaseService
      .getClient()
      .from('hb_logins')
      .select('id')
      .eq('username', username)
      .eq('password', encodedPassword)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error checking existing login:', error);
    }

    return !!data;
  }

  /**
   * Create or update a login record
   */
  private async handleLogin(accountData: AccountFormData['account'], existingLoginId?: string): Promise<string | null> {
    const { username, password } = accountData;

    if (!username || !password) {
      return null;
    }

    const encodedPassword = btoa(password);

    if (existingLoginId) {
      // Update existing login
      const { error } = await this.supabaseService
        .getClient()
        .from('hb_logins')
        .update({
          username,
          password: encodedPassword,
          updated_by: 'USER'
        })
        .eq('id', existingLoginId);

      if (error) throw error;
      return existingLoginId;
    } else {
      // Check if login already exists
      const { data: existingLogin } = await this.supabaseService
        .getClient()
        .from('hb_logins')
        .select('id')
        .eq('username', username)
        .eq('password', encodedPassword)
        .single();

      if (existingLogin) {
        return existingLogin.id;
      }

      // Create new login
      const { data: newLogin, error } = await this.supabaseService
        .getClient()
        .from('hb_logins')
        .insert([{
          username,
          password: encodedPassword,
          created_by: 'USER',
          updated_by: 'USER'
        }])
        .select('id')
        .single();

      if (error) throw error;
      return newLogin.id;
    }
  }

  /**
   * Create or update a bill record
   */
  private async handleBill(billData: AccountFormData['bill'], accountName: string, accountId: string, existingBillId?: string): Promise<string | null> {
    if (!billData.hasBill) {
      return null;
    }

    // If linking to an existing bill, just update its account_id
    if (billData.linkExistingBill && billData.existingBillId) {
      const { error } = await this.supabaseService
        .getClient()
        .from('hb_bills')
        .update({
          account_id: accountId,
          updated_by: 'USER'
        })
        .eq('id', billData.existingBillId);

      if (error) throw error;
      return billData.existingBillId;
    }

    // Otherwise, create new bill or update existing one
    const billPayload = {
      bill_name: `${accountName} - Bill`,
      amount_due: billData.billAmount,
      due_date: billData.dueDate,
      status: billData.isActive ? 'Active' : 'Inactive',
      description: `${accountName} - Bill`,
      priority_id: billData.priorityId,
      frequency_id: billData.frequencyId,
      last_paid: billData.lastPaid,
      is_fixed_bill: billData.isFixedBill,
      bill_type_id: billData.billTypeId,
      payment_type_id: billData.paymentTypeId,
      tag_id: billData.tagId,
      is_included_in_monthly_payment: billData.isIncludedInMonthlyPayment,
      account_id: accountId,
      updated_by: 'USER'
    };

    if (existingBillId) {
      // Update existing bill
      const { error } = await this.supabaseService
        .getClient()
        .from('hb_bills')
        .update(billPayload)
        .eq('id', existingBillId);

      if (error) throw error;
      return existingBillId;
    } else {
      // Create new bill
      const { data: newBill, error } = await this.supabaseService
        .getClient()
        .from('hb_bills')
        .insert([{ ...billPayload, created_by: 'USER' }])
        .select('id')
        .single();

      if (error) throw error;
      return newBill.id;
    }
  }

  /**
   * Create or update a credit card record
   */
  private async handleCreditCard(creditCardData: AccountFormData['creditCard'], accountId: string, existingCreditCardId?: string): Promise<void> {
    if (!creditCardData.hasCreditCard) {
      return;
    }

    const ccPayload = {
      account_id: accountId,
      cardholder_name: creditCardData.cardHolderName,
      card_number_last_four: creditCardData.cardNumber?.slice(-4),
      expiration_date: this.formatExpiryDate(creditCardData.expiryDate),
      card_type_id: creditCardData.cardType,
      credit_limit: creditCardData.creditLimit,
      apr: creditCardData.apr,
      purchase_rate: creditCardData.purchaseRate,
      cash_advance_rate: creditCardData.cashAdvanceRate,
      balance_transfer_rate: creditCardData.balanceTransferRate,
      annual_fee: creditCardData.annualFee,
      is_active: true,
      updated_by: 'USER'
    };

    if (existingCreditCardId) {
      // Update existing credit card
      const { error } = await this.supabaseService
        .getClient()
        .from('hb_credit_cards')
        .update(ccPayload)
        .eq('id', existingCreditCardId);

      if (error) throw error;
    } else {
      // Create new credit card
      const { error } = await this.supabaseService
        .getClient()
        .from('hb_credit_cards')
        .insert([{ ...ccPayload, created_by: 'USER' }]);

      if (error) throw error;
    }
  }

  /**
   * Create or update a warranty record
   */
  private async handleWarranty(warrantyData: AccountFormData['warranty'], accountId: string, existingWarrantyId?: string): Promise<void> {
    if (!warrantyData.hasWarranty) {
      return;
    }

    const warrantyPayload = {
      warranty_type_id: warrantyData.warrantyTypeId,
      provider: warrantyData.provider,
      coverage_start: warrantyData.coverageStart ? new Date(warrantyData.coverageStart).toISOString().split('T')[0] : null,
      coverage_end: warrantyData.coverageEnd ? new Date(warrantyData.coverageEnd).toISOString().split('T')[0] : null,
      terms_and_conditions: warrantyData.terms,
      claim_procedure: warrantyData.claimProcedure,
      updated_by: 'USER'
    };

    if (existingWarrantyId) {
      // Update existing warranty
      const { error } = await this.supabaseService
        .getClient()
        .from('hb_warranties')
        .update(warrantyPayload)
        .eq('id', existingWarrantyId);

      if (error) throw error;
    } else {
      // Create new warranty
      const { error } = await this.supabaseService
        .getClient()
        .from('hb_warranties')
        .insert([{ ...warrantyPayload, account_id: accountId, created_by: 'USER' }]);

      if (error) throw error;
    }
  }

  /**
   * Handle account owner relationship
   */
  private async handleAccountOwner(accountId: string, ownerTypeId: string): Promise<void> {
    // Check if relationship already exists
    const { data: existingOwner, error: checkError } = await this.supabaseService
      .getClient()
      .from('hb_account_owners')
      .select('id')
      .eq('account_id', accountId)
      .eq('owner_type_id', ownerTypeId)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      throw checkError;
    }

    if (!existingOwner) {
      // Create new relationship
      const { error } = await this.supabaseService
        .getClient()
        .from('hb_account_owners')
        .insert([{
          account_id: accountId,
          owner_type_id: ownerTypeId
        }]);

      if (error) throw error;
    }
  }

  /**
   * Save account (create or update)
   */
  async saveAccount(formData: AccountFormData, isEditMode: boolean = false, accountToEdit?: AccountExtended): Promise<void> {
    try {
      // Handle login
      const loginId = await this.handleLogin(
        formData.account,
        isEditMode ? accountToEdit?.login?.id : undefined
      );

      // Handle account
      const accountPayload = {
        name: formData.account.accountName,
        url: formData.account.url,
        login_id: loginId,
        updated_by: 'USER'
      };

      let accountId: string;
      if (isEditMode && accountToEdit) {
        // Update existing account
        const { error } = await this.supabaseService
          .getClient()
          .from('hb_accounts')
          .update(accountPayload)
          .eq('id', accountToEdit.account.id);

        if (error) throw error;
        accountId = accountToEdit.account.id;
      } else {
        // Create new account
        const { data: newAccount, error } = await this.supabaseService
          .getClient()
          .from('hb_accounts')
          .insert([{ ...accountPayload, created_by: 'USER' }])
          .select('id')
          .single();

        if (error) throw error;
        accountId = newAccount.id;
      }

      // Handle account owner relationship
      if (formData.account.ownerTypeId) {
        await this.handleAccountOwner(accountId, formData.account.ownerTypeId);
      }

      // Handle bill (now with account_id)
      const billId = await this.handleBill(
        formData.bill,
        formData.account.accountName,
        accountId,
        isEditMode ? accountToEdit?.bill?.id : undefined
      );

      // Handle credit card
      await this.handleCreditCard(
        formData.creditCard,
        accountId,
        isEditMode ? accountToEdit?.creditCard?.id : undefined
      );

      // Handle warranty
      await this.handleWarranty(
        formData.warranty,
        accountId,
        isEditMode ? accountToEdit?.warranty?.id : undefined
      );
    } catch (error) {
      console.error('Error saving account:', error);
      throw error;
    }
  }

  /**
   * Load owner types for dropdown
   */
  async loadOwnerTypes(): Promise<any[]> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('hb_owner_types')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error loading owner types:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Format expiry date to MM/YYYY format
   */
  private formatExpiryDate(date: string | Date | undefined): string {
    if (!date) return '';
    
    // If it's already a Date object
    if (date instanceof Date) {
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      return `${month}/${year}`;
    }
    
    // If it's a string, handle MM/YYYY format (from database)
    if (typeof date === 'string' && date.includes('/')) {
      const parts = date.split('/');
      if (parts.length === 2) {
        const month = parts[0].padStart(2, '0');
        const year = parts[1];
        return `${month}/${year}`;
      }
    }
    
    // Handle full date string format
    try {
      const dateObj = new Date(date);
      if (isNaN(dateObj.getTime())) {
        return '';
      }
      const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
      const year = dateObj.getFullYear();
      return `${month}/${year}`;
    } catch (error) {
      console.error('Error formatting expiry date:', error);
      return '';
    }
  }

  /**
   * Encode password using base64
   */
  encodePassword(password: string): string {
    return btoa(password);
  }

  /**
   * Format date to MM/YY format
   */
  formatDateToMonthYear(date: Date | string): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
    const year = dateObj.getFullYear().toString().slice(-2);
    return `${month}/${year}`;
  }

  /**
   * Delete account and all related entities in proper order
   */
  async deleteAccount(accountId: string): Promise<void> {
    try {
      // 1. Delete warranties first (child of account)
      await this.supabaseService
        .getClient()
        .from('hb_warranties')
        .delete()
        .eq('account_id', accountId);

      // 2. Delete credit cards (child of account)
      await this.supabaseService
        .getClient()
        .from('hb_credit_cards')
        .delete()
        .eq('account_id', accountId);

      // 3. Delete the account
      await this.supabaseService
        .getClient()
        .from('hb_accounts')
        .delete()
        .eq('id', accountId);

      // 4. Delete bills (orphaned after account deletion)
      // Note: Bills are referenced by account_id, so they should be deleted with the account
      // But if there are any orphaned bills, we can clean them up here
      await this.supabaseService
        .getClient()
        .from('hb_bills')
        .delete()
        .eq('account_id', accountId);

      // Note: Login credentials are preserved and not deleted
    } catch (error) {
      console.error('Error deleting account:', error);
      throw error;
    }
  }

  /**
   * Delete multiple accounts
   */
  async deleteMultipleAccounts(accountIds: string[]): Promise<void> {
    try {
      for (const accountId of accountIds) {
        await this.deleteAccount(accountId);
      }
    } catch (error) {
      console.error('Error deleting multiple accounts:', error);
      throw error;
    }
  }

  /**
   * Load all accounts with related data
   */
  async loadAccounts(): Promise<AccountExtended[]> {
    try {
      // First, load accounts with basic relationships
      const { data: accountsData, error: accountsError } = await this.supabaseService
        .getClient()
        .from('hb_accounts')
        .select(`
          *,
          login:hb_logins!login_id (*),
          creditCard:hb_credit_cards(*),
          warranty:hb_warranties(*),
          account_owners:hb_account_owners(
            owner_type:hb_owner_types(*)
          )
        `)
        .order('created_at', { ascending: false });

      if (accountsError) throw accountsError;

      // Then load bills separately and match them by account_id
      const { data: billsData, error: billsError } = await this.supabaseService
        .getClient()
        .from('hb_bills')
        .select('*');

      if (billsError) throw billsError;

      // Create a map of bills by account_id
      const billsMap = new Map();
      (billsData || []).forEach(bill => {
        if (bill.account_id) {
          if (!billsMap.has(bill.account_id)) {
            billsMap.set(bill.account_id, []);
          }
          billsMap.get(bill.account_id).push(bill);
        }
      });

      // Transform the data to match AccountExtended interface
      return (accountsData || []).map(rawAccount => ({
        account: {
          id: rawAccount.id,
          name: rawAccount.name,
          url: rawAccount.url,
          loginId: rawAccount.login_id,
          createdAt: new Date(rawAccount.created_at),
          updatedAt: new Date(rawAccount.updated_at),
          createdBy: rawAccount.created_by,
          updatedBy: rawAccount.updated_by,
          notes: rawAccount.notes || ''
        },
        owner: rawAccount.account_owners?.[0]?.owner_type || null,
        login: rawAccount.login,
        bill: billsMap.get(rawAccount.id)?.[0] || null,
        creditCard: rawAccount.creditCard?.[0] || undefined,
        warranty: rawAccount.warranty?.[0] || undefined
      }));
    } catch (error) {
      console.error('Error loading accounts:', error);
      throw error;
    }
  }

  /**
   * Delete a single account by Account object
   */
  async deleteAccountByObject(account: Account): Promise<void> {
    await this.deleteAccount(account.id);
  }
} 