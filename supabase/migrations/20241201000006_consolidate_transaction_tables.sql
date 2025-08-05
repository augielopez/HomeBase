-- Migration to consolidate transaction tables
-- This migration moves data from hb_plaid_transactions to hb_transactions
-- and sets up a unified transaction system

-- Step 1: Add missing columns to hb_transactions to accommodate Plaid data
ALTER TABLE hb_transactions 
ADD COLUMN IF NOT EXISTS item_id TEXT,
ADD COLUMN IF NOT EXISTS personal_finance_category JSONB,
ADD COLUMN IF NOT EXISTS unofficial_currency_code TEXT,
ADD COLUMN IF NOT EXISTS plaid_category JSONB; -- Store original Plaid category data

-- Step 2: Migrate existing Plaid transactions to the unified table
INSERT INTO hb_transactions (
    user_id,
    account_id,
    transaction_id,
    amount,
    date,
    name,
    merchant_name,
    category_id,
    pending,
    payment_channel,
    location,
    iso_currency_code,
    import_method,
    bank_source,
    item_id,
    personal_finance_category,
    unofficial_currency_code,
    plaid_category,
    created_at,
    updated_at
)
SELECT 
    pt.user_id,
    pt.account_id,
    pt.transaction_id,
    pt.amount,
    pt.date,
    pt.name,
    pt.merchant_name,
    NULL as category_id, -- Will be categorized later
    pt.pending,
    pt.payment_channel,
    pt.location,
    pt.iso_currency_code,
    'plaid' as import_method,
    'plaid' as bank_source,
    pt.item_id,
    pt.personal_finance_category,
    pt.unofficial_currency_code,
    pt.category as plaid_category,
    pt.created_at,
    pt.updated_at
FROM hb_plaid_transactions pt
WHERE NOT EXISTS (
    SELECT 1 FROM hb_transactions t 
    WHERE t.user_id = pt.user_id 
    AND t.transaction_id = pt.transaction_id 
    AND t.account_id = pt.account_id
);

-- Step 3: Create a view for backward compatibility (optional)
CREATE OR REPLACE VIEW hb_plaid_transactions_view AS
SELECT 
    id,
    user_id,
    item_id,
    account_id,
    transaction_id,
    amount,
    date,
    name,
    merchant_name,
    plaid_category as category,
    category_id,
    pending,
    payment_channel,
    personal_finance_category,
    location,
    iso_currency_code,
    unofficial_currency_code,
    created_at
FROM hb_transactions 
WHERE import_method = 'plaid';

-- Step 4: Update Plaid sync functions to use the unified table
-- (This will be done in the function files)

-- Step 5: Add indexes for better performance on the unified table
CREATE INDEX IF NOT EXISTS idx_transactions_item_id ON hb_transactions(item_id);
CREATE INDEX IF NOT EXISTS idx_transactions_import_method ON hb_transactions(import_method);
CREATE INDEX IF NOT EXISTS idx_transactions_bank_source ON hb_transactions(bank_source);
CREATE INDEX IF NOT EXISTS idx_transactions_plaid_category ON hb_transactions USING GIN(plaid_category);

-- Step 6: Create a function to get transactions from any source
CREATE OR REPLACE FUNCTION get_user_transactions(
    p_user_id UUID,
    p_start_date DATE DEFAULT NULL,
    p_end_date DATE DEFAULT NULL,
    p_import_method TEXT DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    account_id TEXT,
    transaction_id TEXT,
    amount DECIMAL(15,2),
    date DATE,
    name TEXT,
    merchant_name TEXT,
    description TEXT,
    category_id UUID,
    category_confidence DECIMAL(3,2),
    bank_source VARCHAR(100),
    import_method VARCHAR(50),
    pending BOOLEAN,
    is_reconciled BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.id,
        t.user_id,
        t.account_id,
        t.transaction_id,
        t.amount,
        t.date,
        t.name,
        t.merchant_name,
        t.description,
        t.category_id,
        t.category_confidence,
        t.bank_source,
        t.import_method,
        t.pending,
        t.is_reconciled,
        t.created_at
    FROM hb_transactions t
    WHERE t.user_id = p_user_id
    AND (p_start_date IS NULL OR t.date >= p_start_date)
    AND (p_end_date IS NULL OR t.date <= p_end_date)
    AND (p_import_method IS NULL OR t.import_method = p_import_method)
    ORDER BY t.date DESC, t.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 7: Grant permissions
GRANT EXECUTE ON FUNCTION get_user_transactions(UUID, DATE, DATE, TEXT) TO authenticated;

-- Note: The old hb_plaid_transactions table can be dropped after confirming migration success
-- DROP TABLE IF EXISTS hb_plaid_transactions CASCADE; 