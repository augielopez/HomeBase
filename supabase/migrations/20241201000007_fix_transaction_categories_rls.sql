-- Fix RLS policies for transaction categories table
-- Add missing INSERT policy to allow users to create new categories

-- Add INSERT policy for transaction categories
-- Users can create new categories (needed for AI categorization)
CREATE POLICY "Users can insert transaction categories" ON hb_transaction_categories
    FOR INSERT WITH CHECK (true); -- Allow all authenticated users to create categories

-- Add UPDATE policy for transaction categories (in case we need to modify existing ones)
CREATE POLICY "Users can update transaction categories" ON hb_transaction_categories
    FOR UPDATE USING (true); -- Allow all authenticated users to update categories
