export interface AccountOwner {
    id: string;  // UUID
    account_id: string;  // UUID - references hb_accounts
    owner_type_id: string;  // UUID - references hb_owner_types
    created_at: Date;
    updated_at: Date;
}

