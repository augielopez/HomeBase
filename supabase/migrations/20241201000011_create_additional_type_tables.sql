-- Migration to create additional type tables for settings management

-- Create bill status types table
CREATE TABLE IF NOT EXISTS hb_bill_status_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'America/Los_Angeles'),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'America/Los_Angeles'),
    created_by VARCHAR(50) NOT NULL DEFAULT 'SYSTEM',
    updated_by VARCHAR(50) NOT NULL DEFAULT 'SYSTEM',
    CONSTRAINT uk_bill_status_type_name UNIQUE (name)
);

-- Create card types table
CREATE TABLE IF NOT EXISTS hb_card_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'America/Los_Angeles'),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'America/Los_Angeles'),
    created_by VARCHAR(50) NOT NULL DEFAULT 'SYSTEM',
    updated_by VARCHAR(50) NOT NULL DEFAULT 'SYSTEM'
);

-- Create owner types table
CREATE TABLE IF NOT EXISTS hb_owner_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'America/Los_Angeles'),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'America/Los_Angeles'),
    created_by VARCHAR(50) NOT NULL DEFAULT 'SYSTEM',
    updated_by VARCHAR(50) NOT NULL DEFAULT 'SYSTEM'
);

-- Enable RLS on all tables
ALTER TABLE hb_bill_status_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE hb_card_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE hb_owner_types ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for hb_bill_status_types
CREATE POLICY "Users can view all bill status types" ON hb_bill_status_types
    FOR SELECT USING (true);

CREATE POLICY "Users can insert bill status types" ON hb_bill_status_types
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update bill status types" ON hb_bill_status_types
    FOR UPDATE USING (true);

CREATE POLICY "Users can delete bill status types" ON hb_bill_status_types
    FOR DELETE USING (true);

-- Create RLS policies for hb_card_types
CREATE POLICY "Users can view all card types" ON hb_card_types
    FOR SELECT USING (true);

CREATE POLICY "Users can insert card types" ON hb_card_types
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update card types" ON hb_card_types
    FOR UPDATE USING (true);

CREATE POLICY "Users can delete card types" ON hb_card_types
    FOR DELETE USING (true);

-- Create RLS policies for hb_owner_types
CREATE POLICY "Users can view all owner types" ON hb_owner_types
    FOR SELECT USING (true);

CREATE POLICY "Users can insert owner types" ON hb_owner_types
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update owner types" ON hb_owner_types
    FOR UPDATE USING (true);

CREATE POLICY "Users can delete owner types" ON hb_owner_types
    FOR DELETE USING (true);

-- Insert default data for bill status types
INSERT INTO hb_bill_status_types (name, description) VALUES
    ('Active', 'Bill is currently active and needs to be paid'),
    ('Inactive', 'Bill is no longer active'),
    ('Paid', 'Bill has been paid'),
    ('Cancelled', 'Bill has been cancelled')
ON CONFLICT (name) DO NOTHING;

-- Insert default data for card types
INSERT INTO hb_card_types (name, description) VALUES
    ('Visa', 'Visa credit or debit card'),
    ('Mastercard', 'Mastercard credit or debit card'),
    ('American Express', 'American Express credit card'),
    ('Discover', 'Discover credit card'),
    ('Debit', 'Bank debit card'),
    ('Prepaid', 'Prepaid card')
ON CONFLICT DO NOTHING;

-- Insert default data for owner types
INSERT INTO hb_owner_types (name, description) VALUES
    ('Personal', 'Personal account or bill'),
    ('Business', 'Business account or bill'),
    ('Joint', 'Joint account shared between multiple people'),
    ('Family', 'Family account or bill')
ON CONFLICT DO NOTHING;
