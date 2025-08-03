export interface TransactionCategory {
    id: string;
    name: string;
    description?: string;
    color: string;
    icon?: string;
    parent_category_id?: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    created_by: string;
    updated_by: string;
} 