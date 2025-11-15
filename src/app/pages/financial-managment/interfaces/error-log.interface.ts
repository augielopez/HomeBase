export interface ErrorLog {
    id: string;
    user_id: string;
    
    // Error classification
    error_type: ErrorType;
    error_category: ErrorCategory;
    error_code?: string;
    
    // Error details
    error_message: string;
    error_stack?: string;
    
    // Context information
    operation?: string;
    component?: string;
    function_name?: string;
    
    // Data that caused the error
    error_data?: any;
    
    // Additional context
    file_name?: string;
    row_number?: number;
    batch_id?: string;
    
    // Request/response context
    request_data?: any;
    response_data?: any;
    
    // Environment info
    user_agent?: string;
    ip_address?: string;
    session_id?: string;
    
    // Metadata
    severity: ErrorSeverity;
    resolved: boolean;
    resolved_at?: string;
    resolved_by?: string;
    resolution_notes?: string;
    
    // Timestamps
    created_at: string;
    updated_at: string;
}

export type ErrorType = 
    | 'csv_import'
    | 'ai_categorization'
    | 'database'
    | 'api'
    | 'validation'
    | 'authentication'
    | 'authorization'
    | 'network'
    | 'file_processing'
    | 'transaction_processing'
    | 'category_management'
    | 'account_management'
    | 'other';

export type ErrorCategory = 
    | 'critical'
    | 'error'
    | 'warning'
    | 'info';

export type ErrorSeverity = 
    | 'critical'
    | 'error'
    | 'warning'
    | 'info'
    | 'debug';

export interface CreateErrorLogRequest {
    error_type: ErrorType;
    error_category: ErrorCategory;
    error_code?: string;
    error_message: string;
    error_stack?: string;
    operation?: string;
    component?: string;
    function_name?: string;
    error_data?: any;
    file_name?: string;
    row_number?: number;
    batch_id?: string;
    request_data?: any;
    response_data?: any;
    user_agent?: string;
    ip_address?: string;
    session_id?: string;
    severity?: ErrorSeverity;
}

export interface ErrorLogFilters {
    user_id?: string;
    error_type?: ErrorType;
    error_category?: ErrorCategory;
    severity?: ErrorSeverity;
    operation?: string;
    component?: string;
    file_name?: string;
    resolved?: boolean;
    date_from?: string;
    date_to?: string;
    limit?: number;
    offset?: number;
}

export interface ErrorLogStats {
    total_errors: number;
    errors_by_type: Partial<Record<ErrorType, number>>;
    errors_by_category: Partial<Record<ErrorCategory, number>>;
    errors_by_severity: Partial<Record<ErrorSeverity, number>>;
    recent_errors: ErrorLog[];
    unresolved_count: number;
}
