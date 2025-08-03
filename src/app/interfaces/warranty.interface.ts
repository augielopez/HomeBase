export interface Warranty {
    id: string;                    // UUID in database
    account_id: string;            // UUID in database
    warranty_type_id: string;      // TEXT in database (standard, extended, premier lifetime)
    provider: string;            // VARCHAR(100) in database
    coverage_start: string;        // DATE in database
    coverage_end: string;          // DATE in database
    terms_and_conditions?: string; // Optional TEXT in database
    claim_procedure?: string;      // Optional TEXT in database
    created_at: string;           // TIMESTAMP WITH TIME ZONE
    updated_at: string;           // TIMESTAMP WITH TIME ZONE
    created_by: string;           // VARCHAR(50)
    updated_by: string;           // VARCHAR(50)
}
