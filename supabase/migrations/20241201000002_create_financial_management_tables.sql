-- Enable pgvector extension for AI-powered categorization
CREATE EXTENSION IF NOT EXISTS vector;

-- Create transaction categories table
CREATE TABLE IF NOT EXISTS hb_transaction_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    color VARCHAR(7) DEFAULT '#3B82F6', -- Default blue color
    icon VARCHAR(50),
    parent_category_id UUID REFERENCES hb_transaction_categories(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'America/Los_Angeles'),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'America/Los_Angeles'),
    created_by VARCHAR(50) NOT NULL DEFAULT 'SYSTEM',
    updated_by VARCHAR(50) NOT NULL DEFAULT 'SYSTEM'
);

-- Create enhanced transactions table with vector support
CREATE TABLE IF NOT EXISTS hb_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    account_id TEXT NOT NULL, -- References hb_plaid_accounts.account_id
    transaction_id TEXT,
    amount DECIMAL(15,2) NOT NULL,
    date DATE NOT NULL,
    name TEXT NOT NULL,
    merchant_name TEXT,
    description TEXT,
    category_id UUID REFERENCES hb_transaction_categories(id),
    category_confidence DECIMAL(3,2) DEFAULT 0.0, -- Confidence score for AI categorization
    embedding vector(1536), -- OpenAI embedding vector
    bank_source VARCHAR(100), -- Source bank (e.g., 'chase', 'wells_fargo')
    import_method VARCHAR(50) DEFAULT 'plaid', -- 'plaid', 'csv', 'manual'
    csv_filename TEXT, -- Original CSV filename if imported via CSV
    bill_id UUID REFERENCES hb_bills(id),
    is_reconciled BOOLEAN DEFAULT false,
    pending BOOLEAN DEFAULT false,
    payment_channel TEXT,
    location JSONB,
    iso_currency_code TEXT DEFAULT 'USD',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'America/Los_Angeles'),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'America/Los_Angeles'),
    UNIQUE(user_id, transaction_id, account_id)
);

-- Create bank account mapping table for CSV imports
CREATE TABLE IF NOT EXISTS hb_bank_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    account_number_last_four VARCHAR(4),
    bank_name VARCHAR(100) NOT NULL,
    account_type VARCHAR(50) NOT NULL, -- 'checking', 'savings', 'credit'
    plaid_account_id TEXT, -- References hb_plaid_accounts.account_id if linked
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'America/Los_Angeles'),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'America/Los_Angeles'),
    created_by VARCHAR(50) NOT NULL DEFAULT 'SYSTEM',
    updated_by VARCHAR(50) NOT NULL DEFAULT 'SYSTEM'
);

-- Create CSV import logs table
CREATE TABLE IF NOT EXISTS hb_csv_imports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    bank_detected VARCHAR(100),
    total_rows INTEGER,
    imported_rows INTEGER,
    failed_rows INTEGER,
    status VARCHAR(50) DEFAULT 'processing', -- 'processing', 'completed', 'failed'
    error_message TEXT,
    processing_time_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'America/Los_Angeles')
);

-- Create categorization rules table
CREATE TABLE IF NOT EXISTS hb_categorization_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    rule_name VARCHAR(100) NOT NULL,
    rule_type VARCHAR(50) NOT NULL, -- 'keyword', 'merchant', 'amount_range'
    rule_conditions JSONB NOT NULL, -- Flexible conditions storage
    category_id UUID REFERENCES hb_transaction_categories(id) NOT NULL,
    priority INTEGER DEFAULT 0, -- Higher priority rules are applied first
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'America/Los_Angeles'),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'America/Los_Angeles'),
    created_by VARCHAR(50) NOT NULL DEFAULT 'SYSTEM',
    updated_by VARCHAR(50) NOT NULL DEFAULT 'SYSTEM'
);

-- Insert default transaction categories
INSERT INTO hb_transaction_categories (name, description, color, icon) VALUES
    ('Food & Dining', 'Restaurants, groceries, and dining expenses', '#EF4444', 'pi-shopping-cart'),
    ('Transportation', 'Gas, public transit, rideshare, parking', '#F59E0B', 'pi-car'),
    ('Housing', 'Rent, mortgage, utilities, maintenance', '#10B981', 'pi-home'),
    ('Healthcare', 'Medical expenses, prescriptions, insurance', '#3B82F6', 'pi-heart'),
    ('Entertainment', 'Movies, games, hobbies, subscriptions', '#8B5CF6', 'pi-play'),
    ('Shopping', 'Clothing, electronics, general retail', '#EC4899', 'pi-shopping-bag'),
    ('Travel', 'Hotels, flights, vacation expenses', '#06B6D4', 'pi-plane'),
    ('Education', 'Tuition, books, courses, student loans', '#84CC16', 'pi-book'),
    ('Financial', 'Bank fees, investments, transfers', '#F97316', 'pi-dollar'),
    ('Insurance', 'Auto, home, life insurance', '#6366F1', 'pi-shield'),
    ('Utilities', 'Electric, water, gas, internet, phone', '#14B8A6', 'pi-bolt'),
    ('Professional', 'Business expenses, work-related', '#64748B', 'pi-briefcase'),
    ('Personal Care', 'Haircuts, spa, personal items', '#F472B6', 'pi-user'),
    ('Gifts & Donations', 'Charitable giving, gifts', '#A78BFA', 'pi-gift'),
    ('Taxes', 'Income tax, property tax, other taxes', '#FBBF24', 'pi-file'),
    ('Other', 'Miscellaneous expenses', '#9CA3AF', 'pi-ellipsis-h')
ON CONFLICT (name) DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON hb_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON hb_transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON hb_transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_category_id ON hb_transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_transactions_bill_id ON hb_transactions(bill_id);
CREATE INDEX IF NOT EXISTS idx_transactions_embedding ON hb_transactions USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

CREATE INDEX IF NOT EXISTS idx_bank_accounts_user_id ON hb_bank_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_csv_imports_user_id ON hb_csv_imports(user_id);
CREATE INDEX IF NOT EXISTS idx_categorization_rules_user_id ON hb_categorization_rules(user_id);

-- Enable Row Level Security
ALTER TABLE hb_transaction_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE hb_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE hb_bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE hb_csv_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE hb_categorization_rules ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view transaction categories" ON hb_transaction_categories
    FOR SELECT USING (true); -- Categories are shared across users

CREATE POLICY "Users can view their own transactions" ON hb_transactions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own transactions" ON hb_transactions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own transactions" ON hb_transactions
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own bank accounts" ON hb_bank_accounts
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own bank accounts" ON hb_bank_accounts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own bank accounts" ON hb_bank_accounts
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own csv imports" ON hb_csv_imports
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own csv imports" ON hb_csv_imports
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own categorization rules" ON hb_categorization_rules
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own categorization rules" ON hb_categorization_rules
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own categorization rules" ON hb_categorization_rules
    FOR UPDATE USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_transaction_categories_updated_at BEFORE UPDATE ON hb_transaction_categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON hb_transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bank_accounts_updated_at BEFORE UPDATE ON hb_bank_accounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_categorization_rules_updated_at BEFORE UPDATE ON hb_categorization_rules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function for vector similarity search
CREATE OR REPLACE FUNCTION match_transactions(
    query_embedding vector(1536),
    match_threshold float DEFAULT 0.8,
    match_count int DEFAULT 5
)
RETURNS TABLE (
    id UUID,
    name TEXT,
    merchant_name TEXT,
    category_id UUID,
    similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.id,
        t.name,
        t.merchant_name,
        t.category_id,
        1 - (t.embedding <=> query_embedding) as similarity
    FROM hb_transactions t
    WHERE t.embedding IS NOT NULL
    AND t.category_id IS NOT NULL
    AND 1 - (t.embedding <=> query_embedding) > match_threshold
    ORDER BY t.embedding <=> query_embedding
    LIMIT match_count;
END;
$$; 