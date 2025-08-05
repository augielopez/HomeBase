-- Migration to re-enable RLS after testing
-- Run this when you're ready to go back to secure mode

-- Drop temporary policies
DROP POLICY IF EXISTS "temporary_allow_all_transactions" ON hb_transactions;
DROP POLICY IF EXISTS "temporary_allow_all_csv_imports" ON hb_csv_imports;
DROP POLICY IF EXISTS "temporary_allow_all_bank_accounts" ON hb_bank_accounts;
DROP POLICY IF EXISTS "temporary_allow_all_categorization_rules" ON hb_categorization_rules;

-- Re-enable RLS
ALTER TABLE hb_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE hb_csv_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE hb_bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE hb_categorization_rules ENABLE ROW LEVEL SECURITY;

-- Re-create the original RLS policies
CREATE POLICY "Users can view their own transactions" ON hb_transactions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own transactions" ON hb_transactions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own transactions" ON hb_transactions
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own csv imports" ON hb_csv_imports
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own csv imports" ON hb_csv_imports
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own bank accounts" ON hb_bank_accounts
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own bank accounts" ON hb_bank_accounts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own bank accounts" ON hb_bank_accounts
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own categorization rules" ON hb_categorization_rules
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own categorization rules" ON hb_categorization_rules
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own categorization rules" ON hb_categorization_rules
    FOR UPDATE USING (auth.uid() = user_id); 