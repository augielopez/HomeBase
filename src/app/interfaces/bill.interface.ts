export interface Bill {
    id: string;  // UUID
    amount_due: number | null;
    due_date: string | null;
    status: string | null;
    description: string | null;
    priority_id: string | null;  // UUID
    frequency_id: string | null;  // UUID
    last_paid: Date | null;
    is_fixed_bill: boolean;
    bill_type_id: string | null;  // UUID
    payment_type_id: string | null;  // UUID
    tag_id: string | null;  // UUID
    is_included_in_monthly_payment: boolean;
    created_at: Date;
    updated_at: Date;
    created_by: string;
    updated_by: string;
}
