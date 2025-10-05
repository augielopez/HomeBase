export interface BillOwner {
    id: string;  // UUID
    bill_id: string;  // UUID - references hb_bills
    owner_type_id: string;  // UUID - references hb_owner_types
    created_at: Date;
    updated_at: Date;
}

