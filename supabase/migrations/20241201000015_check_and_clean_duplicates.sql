-- Migration to check for and handle existing duplicate transactions
-- Run this BEFORE applying the duplicate prevention constraints

-- Step 1: Create a function to find duplicate transactions
CREATE OR REPLACE FUNCTION find_duplicate_transactions()
RETURNS TABLE(
    user_id UUID,
    account_id TEXT,
    date DATE,
    amount DECIMAL(15,2),
    name TEXT,
    import_method TEXT,
    csv_filename TEXT,
    duplicate_count BIGINT,
    transaction_ids TEXT
) AS $$
BEGIN
    RETURN QUERY
    WITH duplicates AS (
        SELECT 
            t.user_id,
            t.account_id,
            t.date,
            t.amount,
            t.name,
            t.import_method,
            t.csv_filename,
            COUNT(*) as dup_count,
            STRING_AGG(t.id::TEXT, ', ' ORDER BY t.created_at) as ids
        FROM hb_transactions t
        GROUP BY t.user_id, t.account_id, t.date, t.amount, t.name, t.import_method, t.csv_filename
        HAVING COUNT(*) > 1
    )
    SELECT 
        d.user_id,
        d.account_id,
        d.date,
        d.amount,
        d.name,
        d.import_method,
        d.csv_filename,
        d.dup_count,
        d.ids
    FROM duplicates d
    ORDER BY d.dup_count DESC, d.user_id, d.account_id, d.date;
END;
$$ LANGUAGE plpgsql;

-- Step 2: Create a function to clean duplicate transactions (keeps the oldest)
CREATE OR REPLACE FUNCTION clean_duplicate_transactions()
RETURNS TABLE(
    deleted_count BIGINT,
    kept_transaction_ids TEXT
) AS $$
DECLARE
    total_deleted BIGINT := 0;
    kept_ids TEXT := '';
BEGIN
    -- Delete duplicates, keeping only the oldest transaction for each duplicate group
    WITH duplicates_to_delete AS (
        SELECT t.id
        FROM hb_transactions t
        WHERE t.id NOT IN (
            SELECT DISTINCT ON (user_id, account_id, date, amount, name, import_method, csv_filename) 
            id 
            FROM hb_transactions 
            ORDER BY user_id, account_id, date, amount, name, import_method, csv_filename, created_at ASC
        )
    )
    DELETE FROM hb_transactions 
    WHERE id IN (SELECT id FROM duplicates_to_delete)
    RETURNING id INTO kept_ids;
    
    GET DIAGNOSTICS total_deleted = ROW_COUNT;
    
    RETURN QUERY SELECT total_deleted, kept_ids;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Create a function to show duplicate summary
CREATE OR REPLACE FUNCTION duplicate_summary()
RETURNS TABLE(
    import_method TEXT,
    duplicate_groups BIGINT,
    total_duplicate_transactions BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.import_method,
        COUNT(*) as duplicate_groups,
        SUM(dup_count - 1) as total_duplicates
    FROM (
        SELECT 
            t.import_method,
            COUNT(*) as dup_count
        FROM hb_transactions t
        GROUP BY t.user_id, t.account_id, t.date, t.amount, t.name, t.import_method, t.csv_filename
        HAVING COUNT(*) > 1
    ) t
    GROUP BY t.import_method
    ORDER BY total_duplicates DESC;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Add comments
COMMENT ON FUNCTION find_duplicate_transactions() IS 
'Finds all duplicate transactions grouped by key identifying fields';

COMMENT ON FUNCTION clean_duplicate_transactions() IS 
'Removes duplicate transactions, keeping only the oldest transaction in each duplicate group';

COMMENT ON FUNCTION duplicate_summary() IS 
'Provides a summary of duplicate transactions by import method';




