-- Add matching fields to hb_transactions table
ALTER TABLE hb_transactions 
ADD COLUMN IF NOT EXISTS match_method TEXT DEFAULT 'unmatched' CHECK (match_method IN ('unmatched', 'manual', 'auto', 'ai')),
ADD COLUMN IF NOT EXISTS match_confidence INTEGER DEFAULT 0 CHECK (match_confidence >= 0 AND match_confidence <= 100),
ADD COLUMN IF NOT EXISTS match_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Create hb_matching_patterns table for learning patterns
CREATE TABLE IF NOT EXISTS hb_matching_patterns (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    transaction_pattern TEXT NOT NULL,
    bill_pattern TEXT NOT NULL,
    confidence_score INTEGER NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 100),
    match_count INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(transaction_pattern, bill_pattern)
);

-- Create index for faster pattern lookups
CREATE INDEX IF NOT EXISTS idx_matching_patterns_transaction ON hb_matching_patterns(transaction_pattern);
CREATE INDEX IF NOT EXISTS idx_matching_patterns_bill ON hb_matching_patterns(bill_pattern);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for hb_matching_patterns
DROP TRIGGER IF EXISTS update_hb_matching_patterns_updated_at ON hb_matching_patterns;
CREATE TRIGGER update_hb_matching_patterns_updated_at
    BEFORE UPDATE ON hb_matching_patterns
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Update existing transactions to have 'manual' match_method if they have bill_id
UPDATE hb_transactions 
SET match_method = 'manual', 
    match_confidence = 100,
    match_timestamp = updated_at
WHERE bill_id IS NOT NULL 
AND match_method = 'unmatched';

-- Enable RLS on hb_matching_patterns
ALTER TABLE hb_matching_patterns ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for hb_matching_patterns
CREATE POLICY "Users can manage their own matching patterns" ON hb_matching_patterns
FOR ALL USING (auth.uid() IS NOT NULL);
