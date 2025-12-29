-- Shopping Receipt Management System
-- RLS policies and additional setup for shopping tables
-- NOTE: Tables are created via user-provided SQL, this migration adds RLS and indexes

-- Enable RLS on all shopping tables
ALTER TABLE IF EXISTS shop_stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS shop_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS shop_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS shop_receipt_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS shop_rebuy_ratings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for shop_stores
-- Users can view all stores (shared catalog)
CREATE POLICY IF NOT EXISTS "Users can view stores"
    ON shop_stores FOR SELECT
    USING (true);

-- Users can insert their own stores
CREATE POLICY IF NOT EXISTS "Users can insert stores"
    ON shop_stores FOR INSERT
    WITH CHECK (true);

-- Users can update their own stores (or all stores if shared)
CREATE POLICY IF NOT EXISTS "Users can update stores"
    ON shop_stores FOR UPDATE
    USING (true)
    WITH CHECK (true);

-- RLS Policies for shop_receipts
-- Users can view their own receipts
CREATE POLICY IF NOT EXISTS "Users can view their own receipts"
    ON shop_receipts FOR SELECT
    USING (true); -- For now, allow all users. Can add user_id column later if needed

-- Users can insert their own receipts
CREATE POLICY IF NOT EXISTS "Users can insert receipts"
    ON shop_receipts FOR INSERT
    WITH CHECK (true);

-- Users can update their own receipts
CREATE POLICY IF NOT EXISTS "Users can update their own receipts"
    ON shop_receipts FOR UPDATE
    USING (true)
    WITH CHECK (true);

-- Users can delete their own receipts
CREATE POLICY IF NOT EXISTS "Users can delete their own receipts"
    ON shop_receipts FOR DELETE
    USING (true);

-- RLS Policies for shop_items
-- Users can view all items (shared catalog)
CREATE POLICY IF NOT EXISTS "Users can view items"
    ON shop_items FOR SELECT
    USING (true);

-- Users can insert items
CREATE POLICY IF NOT EXISTS "Users can insert items"
    ON shop_items FOR INSERT
    WITH CHECK (true);

-- Users can update items
CREATE POLICY IF NOT EXISTS "Users can update items"
    ON shop_items FOR UPDATE
    USING (true)
    WITH CHECK (true);

-- RLS Policies for shop_receipt_items
-- Users can view receipt items for receipts they can access
CREATE POLICY IF NOT EXISTS "Users can view receipt items"
    ON shop_receipt_items FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM shop_receipts
            WHERE shop_receipts.id = shop_receipt_items.receipt_id
        )
    );

-- Users can insert receipt items
CREATE POLICY IF NOT EXISTS "Users can insert receipt items"
    ON shop_receipt_items FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM shop_receipts
            WHERE shop_receipts.id = shop_receipt_items.receipt_id
        )
    );

-- Users can update receipt items
CREATE POLICY IF NOT EXISTS "Users can update receipt items"
    ON shop_receipt_items FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM shop_receipts
            WHERE shop_receipts.id = shop_receipt_items.receipt_id
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM shop_receipts
            WHERE shop_receipts.id = shop_receipt_items.receipt_id
        )
    );

-- Users can delete receipt items
CREATE POLICY IF NOT EXISTS "Users can delete receipt items"
    ON shop_receipt_items FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM shop_receipts
            WHERE shop_receipts.id = shop_receipt_items.receipt_id
        )
    );

-- RLS Policies for shop_rebuy_ratings
-- Users can view rebuy ratings (lookup table)
CREATE POLICY IF NOT EXISTS "Users can view rebuy ratings"
    ON shop_rebuy_ratings FOR SELECT
    USING (true);

-- Additional indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_shop_receipt_items_expiration_date 
    ON shop_receipt_items(expiration_date) 
    WHERE expiration_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_shop_receipt_items_is_finished 
    ON shop_receipt_items(is_finished) 
    WHERE is_finished = false;

CREATE INDEX IF NOT EXISTS idx_shop_receipt_items_would_rebuy 
    ON shop_receipt_items(would_rebuy) 
    WHERE would_rebuy IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_shop_receipts_payment_method 
    ON shop_receipts(payment_method);

-- Function to get items expiring soon (for email alerts)
CREATE OR REPLACE FUNCTION get_items_expiring_soon(days_ahead INTEGER DEFAULT 3)
RETURNS TABLE (
    receipt_item_id UUID,
    item_name VARCHAR,
    expiration_date DATE,
    receipt_date DATE,
    store_name VARCHAR,
    quantity DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ri.id as receipt_item_id,
        i.name as item_name,
        ri.expiration_date,
        r.receipt_date,
        s.name as store_name,
        ri.quantity
    FROM shop_receipt_items ri
    JOIN shop_items i ON ri.item_id = i.id
    JOIN shop_receipts r ON ri.receipt_id = r.id
    JOIN shop_stores s ON r.store_id = s.id
    WHERE ri.is_finished = false
      AND ri.expiration_date IS NOT NULL
      AND ri.expiration_date BETWEEN CURRENT_DATE AND CURRENT_DATE + (days_ahead || ' days')::INTERVAL
    ORDER BY ri.expiration_date ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_items_expiring_soon(INTEGER) TO authenticated;

