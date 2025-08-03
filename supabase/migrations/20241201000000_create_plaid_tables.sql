-- Create Plaid Items table
CREATE TABLE IF NOT EXISTS hb_plaid_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    item_id TEXT NOT NULL,
    access_token TEXT NOT NULL,
    institution_id TEXT NOT NULL,
    institution_name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, item_id)
);

-- Create Plaid Accounts table
CREATE TABLE IF NOT EXISTS hb_plaid_accounts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    item_id TEXT NOT NULL,
    account_id TEXT NOT NULL,
    name TEXT NOT NULL,
    mask TEXT,
    type TEXT NOT NULL,
    subtype TEXT,
    current_balance DECIMAL(15,2),
    available_balance DECIMAL(15,2),
    iso_currency_code TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, account_id)
);

-- Create Plaid Transactions table
CREATE TABLE IF NOT EXISTS hb_plaid_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    item_id TEXT NOT NULL,
    account_id TEXT NOT NULL,
    transaction_id TEXT NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    date DATE NOT NULL,
    name TEXT NOT NULL,
    merchant_name TEXT,
    category JSONB,
    category_id TEXT,
    pending BOOLEAN DEFAULT FALSE,
    payment_channel TEXT,
    personal_finance_category JSONB,
    location JSONB,
    iso_currency_code TEXT,
    unofficial_currency_code TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, transaction_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_plaid_items_user_id ON hb_plaid_items(user_id);
CREATE INDEX IF NOT EXISTS idx_plaid_accounts_user_id ON hb_plaid_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_plaid_accounts_item_id ON hb_plaid_accounts(item_id);
CREATE INDEX IF NOT EXISTS idx_plaid_transactions_user_id ON hb_plaid_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_plaid_transactions_account_id ON hb_plaid_transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_plaid_transactions_date ON hb_plaid_transactions(date);
CREATE INDEX IF NOT EXISTS idx_plaid_transactions_transaction_id ON hb_plaid_transactions(transaction_id);

-- Enable Row Level Security
ALTER TABLE hb_plaid_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE hb_plaid_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE hb_plaid_transactions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own plaid items" ON hb_plaid_items
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own plaid items" ON hb_plaid_items
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own plaid accounts" ON hb_plaid_accounts
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own plaid accounts" ON hb_plaid_accounts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own plaid transactions" ON hb_plaid_transactions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own plaid transactions" ON hb_plaid_transactions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_plaid_items_updated_at BEFORE UPDATE ON hb_plaid_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_plaid_accounts_updated_at BEFORE UPDATE ON hb_plaid_accounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 