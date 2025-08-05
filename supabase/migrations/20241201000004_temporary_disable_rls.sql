-- Temporary migration to disable RLS for testing
-- WARNING: This should only be used for development/testing
-- Remove this migration before going to production

-- Disable RLS temporarily for testing
ALTER TABLE hb_transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE hb_csv_imports DISABLE ROW LEVEL SECURITY;
ALTER TABLE hb_bank_accounts DISABLE ROW LEVEL SECURITY;
ALTER TABLE hb_categorization_rules DISABLE ROW LEVEL SECURITY;

-- Create a temporary policy that allows all operations (FOR TESTING ONLY)
CREATE POLICY "temporary_allow_all_transactions" ON hb_transactions FOR ALL USING (true);
CREATE POLICY "temporary_allow_all_csv_imports" ON hb_csv_imports FOR ALL USING (true);
CREATE POLICY "temporary_allow_all_bank_accounts" ON hb_bank_accounts FOR ALL USING (true);
CREATE POLICY "temporary_allow_all_categorization_rules" ON hb_categorization_rules FOR ALL USING (true);

-- Note: This is for testing only. Remember to re-enable RLS before production! 