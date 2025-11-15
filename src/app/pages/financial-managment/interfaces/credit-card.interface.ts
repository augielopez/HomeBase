export interface CreditCard {
    id: string;  // UUID
    account_id: string | null;  // UUID
    cardholder_name: string | null;
    card_number_last_four: number | null;
    expiration_date: string | null;
    card_type_id: string | null;
    balance: number;
    credit_limit: number | null;
    is_active: boolean;
    apr: number | null;
    purchase_rate: number | null;
    cash_advance_rate: number | null;
    balance_transfer_rate: number | null;
    annual_fee: number | null;
    created_at: Date;
    updated_at: Date;
    created_by: string;
    updated_by: string;
}
