import { Bill } from "./bill.interface";
import { TransactionCategory } from "./transaction-category.interface";

export interface Transaction {
    id: string;
    user_id: string;
    account_id: string;
    transaction_id?: string;
    amount: number;
    date: string;
    name: string;
    merchant_name?: string;
    description?: string;
    category_id?: string;
    category_confidence?: number;
    embedding?: number[]; // Vector embedding for AI categorization
    bank_source?: string;
    import_method: 'plaid' | 'csv' | 'manual';
    csv_filename?: string;
    bill_id?: string;
    is_reconciled: boolean;
    pending: boolean;
    payment_channel?: string;
    location?: any;
    iso_currency_code: string;
    created_at: string;
    updated_at: string;
    
    // Joined fields
    category?: TransactionCategory;
    bill?: Bill;
    account?: BankAccount;
}

export interface BankAccount {
    id: string;
    user_id: string;
    name: string;
    account_number_last_four?: string;
    bank_name: string;
    account_type: 'checking' | 'savings' | 'credit';
    plaid_account_id?: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    created_by: string;
    updated_by: string;
}

export interface CsvImport {
    id: string;
    user_id: string;
    filename: string;
    bank_detected?: string;
    total_rows: number;
    imported_rows: number;
    failed_rows: number;
    status: 'processing' | 'completed' | 'failed';
    error_message?: string;
    processing_time_ms?: number;
    created_at: string;
}

export interface CategorizationRule {
    id: string;
    user_id: string;
    rule_name: string;
    rule_type: 'keyword' | 'merchant' | 'amount_range';
    rule_conditions: any; // JSONB conditions
    category_id: string;
    priority: number;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    created_by: string;
    updated_by: string;
} 