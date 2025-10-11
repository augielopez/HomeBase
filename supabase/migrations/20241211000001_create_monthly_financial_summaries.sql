-- Create table for caching monthly financial summaries
CREATE TABLE IF NOT EXISTS hb_monthly_financial_summaries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL,
    
    -- Summary data
    total_spent DECIMAL(12, 2) NOT NULL DEFAULT 0,
    total_income DECIMAL(12, 2) NOT NULL DEFAULT 0,
    net_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
    transaction_count INTEGER NOT NULL DEFAULT 0,
    
    -- Category breakdown stored as JSONB
    category_breakdown JSONB NOT NULL DEFAULT '[]'::jsonb,
    
    -- AI insights stored as JSONB
    insights JSONB NOT NULL DEFAULT '[]'::jsonb,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by VARCHAR(50) DEFAULT 'SYSTEM',
    updated_by VARCHAR(50) DEFAULT 'SYSTEM',
    
    -- Ensure unique combination of user, year, and month
    UNIQUE(user_id, year, month)
);

-- Create index for faster lookups
CREATE INDEX idx_monthly_summaries_user_date ON hb_monthly_financial_summaries(user_id, year, month);

-- Add RLS policies
ALTER TABLE hb_monthly_financial_summaries ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own summaries
CREATE POLICY "Users can view own summaries"
    ON hb_monthly_financial_summaries
    FOR SELECT
    USING (auth.uid() = user_id);

-- Policy: Users can insert their own summaries
CREATE POLICY "Users can insert own summaries"
    ON hb_monthly_financial_summaries
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own summaries
CREATE POLICY "Users can update own summaries"
    ON hb_monthly_financial_summaries
    FOR UPDATE
    USING (auth.uid() = user_id);

-- Policy: Users can delete their own summaries
CREATE POLICY "Users can delete own summaries"
    ON hb_monthly_financial_summaries
    FOR DELETE
    USING (auth.uid() = user_id);

-- Add comment
COMMENT ON TABLE hb_monthly_financial_summaries IS 'Caches monthly financial summary data to avoid recalculating on every page load';

