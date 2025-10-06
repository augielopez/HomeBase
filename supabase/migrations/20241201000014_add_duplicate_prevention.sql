-- Migration to add duplicate prevention for transactions
-- This migration adds constraints to prevent duplicate transactions

-- Step 1: Create partial unique indexes for duplicate prevention
-- This prevents duplicate CSV transactions based on key identifying fields
CREATE UNIQUE INDEX unique_csv_transaction 
ON hb_transactions(user_id, date, amount, name, account_id, csv_filename) 
WHERE import_method = 'csv';

-- Step 2: Create partial unique index for manual transactions
-- This prevents duplicate manual transactions based on key identifying fields
CREATE UNIQUE INDEX unique_manual_transaction 
ON hb_transactions(user_id, date, amount, name, account_id) 
WHERE import_method = 'manual';

-- Step 3: Create a function to check for duplicate transactions
CREATE OR REPLACE FUNCTION check_duplicate_transaction(
    p_user_id UUID,
    p_account_id TEXT,
    p_date DATE,
    p_amount DECIMAL(15,2),
    p_name TEXT,
    p_import_method TEXT,
    p_csv_filename TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
BEGIN
    -- Check for exact duplicates based on import method
    IF p_import_method = 'csv' THEN
        RETURN EXISTS (
            SELECT 1 FROM hb_transactions 
            WHERE user_id = p_user_id 
            AND account_id = p_account_id 
            AND date = p_date 
            AND amount = p_amount 
            AND name = p_name 
            AND import_method = 'csv'
            AND (csv_filename = p_csv_filename OR (csv_filename IS NULL AND p_csv_filename IS NULL))
        );
    ELSIF p_import_method = 'manual' THEN
        RETURN EXISTS (
            SELECT 1 FROM hb_transactions 
            WHERE user_id = p_user_id 
            AND account_id = p_account_id 
            AND date = p_date 
            AND amount = p_amount 
            AND name = p_name 
            AND import_method = 'manual'
        );
    ELSE
        -- For plaid transactions, check using transaction_id (existing logic)
        RETURN FALSE; -- Plaid duplicates are handled by the existing unique constraint
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Create a function to safely insert transactions with duplicate checking
CREATE OR REPLACE FUNCTION safe_insert_transaction(
    p_user_id UUID,
    p_account_id TEXT,
    p_transaction_id TEXT DEFAULT NULL,
    p_amount DECIMAL(15,2),
    p_date DATE,
    p_name TEXT,
    p_merchant_name TEXT DEFAULT NULL,
    p_description TEXT DEFAULT NULL,
    p_category_id UUID DEFAULT NULL,
    p_bank_source TEXT DEFAULT NULL,
    p_import_method TEXT DEFAULT 'manual',
    p_csv_filename TEXT DEFAULT NULL,
    p_pending BOOLEAN DEFAULT FALSE,
    p_iso_currency_code TEXT DEFAULT 'USD'
) RETURNS TABLE(inserted BOOLEAN, transaction_id UUID, error_message TEXT) AS $$
DECLARE
    v_transaction_id UUID;
    v_is_duplicate BOOLEAN;
BEGIN
    -- Check for duplicates
    v_is_duplicate := check_duplicate_transaction(
        p_user_id, 
        p_account_id, 
        p_date, 
        p_amount, 
        p_name, 
        p_import_method, 
        p_csv_filename
    );
    
    IF v_is_duplicate THEN
        RETURN QUERY SELECT FALSE, NULL::UUID, 'Duplicate transaction detected'::TEXT;
        RETURN;
    END IF;
    
    -- Insert the transaction
    INSERT INTO hb_transactions (
        user_id, account_id, transaction_id, amount, date, name, 
        merchant_name, description, category_id, bank_source, import_method,
        csv_filename, pending, iso_currency_code
    ) VALUES (
        p_user_id, p_account_id, p_transaction_id, p_amount, p_date, p_name,
        p_merchant_name, p_description, p_category_id, p_bank_source, p_import_method,
        p_csv_filename, p_pending, p_iso_currency_code
    ) RETURNING id INTO v_transaction_id;
    
    RETURN QUERY SELECT TRUE, v_transaction_id, NULL::TEXT;
END;
$$ LANGUAGE plpgsql;

-- Step 5: Create an index for faster duplicate checking
CREATE INDEX IF NOT EXISTS idx_transactions_duplicate_check 
ON hb_transactions(user_id, account_id, date, amount, name, import_method, csv_filename);

-- Step 6: Add comments explaining the indexes
COMMENT ON INDEX unique_csv_transaction IS 
'Prevents duplicate CSV transactions based on user, account, date, amount, name, and filename';

COMMENT ON INDEX unique_manual_transaction IS 
'Prevents duplicate manual transactions based on user, account, date, amount, and name';

COMMENT ON FUNCTION check_duplicate_transaction IS 
'Checks if a transaction would be a duplicate based on import method and key fields';

COMMENT ON FUNCTION safe_insert_transaction IS 
'Safely inserts a transaction with automatic duplicate checking and returns success status';