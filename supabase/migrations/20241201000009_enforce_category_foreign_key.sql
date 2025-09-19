-- Migration to enforce foreign key constraint on transaction categories
-- This ensures all category_id values in hb_transactions reference valid categories

-- Add foreign key constraint with cascade behavior
ALTER TABLE hb_transactions
ADD CONSTRAINT fk_transaction_category
FOREIGN KEY (category_id)
REFERENCES hb_transaction_categories (id)
ON UPDATE CASCADE
ON DELETE SET NULL;

-- Add index for better performance on category lookups
CREATE INDEX IF NOT EXISTS idx_transactions_category_id_fk 
ON hb_transactions(category_id) 
WHERE category_id IS NOT NULL;

-- Add check constraint to ensure category_id is valid UUID when not null
ALTER TABLE hb_transactions
ADD CONSTRAINT chk_category_id_format
CHECK (category_id IS NULL OR category_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$');

-- Update any existing invalid category_id references to NULL
UPDATE hb_transactions 
SET category_id = NULL 
WHERE category_id IS NOT NULL 
AND NOT EXISTS (
    SELECT 1 FROM hb_transaction_categories 
    WHERE id = hb_transactions.category_id
);

-- Add comment explaining the constraint
COMMENT ON CONSTRAINT fk_transaction_category ON hb_transactions IS 
'Ensures every transaction category_id references a valid category. If a category is deleted, related transactions will fall back to NULL. Prevents accidental creation of orphan categories.';
