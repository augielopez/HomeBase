-- Create error log table for capturing errors from anywhere in the app
CREATE TABLE IF NOT EXISTS hb_error_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Error classification
    error_type VARCHAR(50) NOT NULL, -- 'csv_import', 'ai_categorization', 'database', 'api', 'validation', etc.
    error_category VARCHAR(50) NOT NULL, -- 'critical', 'warning', 'info'
    error_code VARCHAR(20), -- HTTP status codes, custom error codes
    
    -- Error details
    error_message TEXT NOT NULL,
    error_stack TEXT, -- Full stack trace if available
    
    -- Context information
    operation VARCHAR(100), -- 'csv_import', 'transaction_categorization', etc.
    component VARCHAR(100), -- 'csv-import.service', 'ai-categorization.service', etc.
    function_name VARCHAR(100), -- Specific function where error occurred
    
    -- Data that caused the error (JSON for flexibility)
    error_data JSONB, -- The actual data/row that caused the error
    
    -- Additional context
    file_name VARCHAR(255), -- For CSV imports, the original filename
    row_number INTEGER, -- For CSV imports, which row failed
    batch_id VARCHAR(100), -- For batch operations
    
    -- Request/response context
    request_data JSONB, -- Original request data
    response_data JSONB, -- Response data if available
    
    -- Environment info
    user_agent TEXT,
    ip_address INET,
    session_id VARCHAR(100),
    
    -- Metadata
    severity VARCHAR(20) DEFAULT 'error', -- 'critical', 'error', 'warning', 'info', 'debug'
    resolved BOOLEAN DEFAULT false,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID REFERENCES auth.users(id),
    resolution_notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'America/Los_Angeles'),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'America/Los_Angeles')
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_error_logs_user_id ON hb_error_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_error_logs_error_type ON hb_error_logs(error_type);
CREATE INDEX IF NOT EXISTS idx_error_logs_error_category ON hb_error_logs(error_category);
CREATE INDEX IF NOT EXISTS idx_error_logs_severity ON hb_error_logs(severity);
CREATE INDEX IF NOT EXISTS idx_error_logs_created_at ON hb_error_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_error_logs_operation ON hb_error_logs(operation);
CREATE INDEX IF NOT EXISTS idx_error_logs_file_name ON hb_error_logs(file_name);
CREATE INDEX IF NOT EXISTS idx_error_logs_resolved ON hb_error_logs(resolved);

-- Enable Row Level Security
ALTER TABLE hb_error_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own error logs" ON hb_error_logs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own error logs" ON hb_error_logs
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own error logs" ON hb_error_logs
    FOR UPDATE USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_error_logs_updated_at BEFORE UPDATE ON hb_error_logs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
