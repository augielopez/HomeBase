-- Create a special "marker" bill to represent excluded transactions
-- This UUID is used to mark transactions as "not a bill" 
INSERT INTO hb_bills (
    id,
    bill_name,
    amount_due,
    due_date,
    status,
    description,
    created_by,
    updated_by
) VALUES (
    '00000000-0000-0000-0000-000000000001',
    'EXCLUDED - Not a Bill',
    0,
    '01',
    'Active',
    'System marker for transactions that are not bills',
    'SYSTEM',
    'SYSTEM'
)
ON CONFLICT (id) DO NOTHING;

