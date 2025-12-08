-- ============================================
-- SQL Updates for Kesti Pro
-- Run these in your Supabase SQL Editor
-- ============================================

-- 1. Add items column to transactions table (for storing cart items as JSON)
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS items JSONB DEFAULT NULL;

-- 2. Add cost_price column to products table (if not exists)
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS cost_price DECIMAL(10,3) DEFAULT 0;

-- 3. Update cost_price to match cost for existing products
UPDATE products SET cost_price = cost WHERE cost_price = 0 OR cost_price IS NULL;

-- 4. Make stock nullable in products table
ALTER TABLE products 
ALTER COLUMN stock DROP NOT NULL;

-- 5. Enable RLS policies for products if not already enabled
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- 6. Create RLS policy for products (if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'products' AND policyname = 'Users can view their own products'
    ) THEN
        CREATE POLICY "Users can view their own products" ON products
        FOR SELECT USING (business_id = auth.uid());
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'products' AND policyname = 'Users can insert their own products'
    ) THEN
        CREATE POLICY "Users can insert their own products" ON products
        FOR INSERT WITH CHECK (business_id = auth.uid());
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'products' AND policyname = 'Users can update their own products'
    ) THEN
        CREATE POLICY "Users can update their own products" ON products
        FOR UPDATE USING (business_id = auth.uid());
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'products' AND policyname = 'Users can delete their own products'
    ) THEN
        CREATE POLICY "Users can delete their own products" ON products
        FOR DELETE USING (business_id = auth.uid());
    END IF;
END $$;

-- 7. Create products table if not exists (for fresh installs)
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10,3) NOT NULL DEFAULT 0,
    cost DECIMAL(10,3) NOT NULL DEFAULT 0,
    cost_price DECIMAL(10,3) NOT NULL DEFAULT 0,
    stock INTEGER,
    reorder_level INTEGER DEFAULT 0,
    category VARCHAR(100) DEFAULT 'عام',
    category_id UUID,
    barcode VARCHAR(100),
    image_url TEXT,
    track_stock BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Create index on products for faster queries
CREATE INDEX IF NOT EXISTS idx_products_business_id ON products(business_id);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);

-- 9. Create trigger to update updated_at on products
CREATE OR REPLACE FUNCTION update_products_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS products_updated_at ON products;
CREATE TRIGGER products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION update_products_updated_at();

-- 10. Add index on transactions items for faster JSON queries
CREATE INDEX IF NOT EXISTS idx_transactions_items ON transactions USING GIN (items);

-- ============================================
-- Verification Queries (run these to check)
-- ============================================

-- Check products table structure
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'products';

-- Check transactions table structure
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'transactions';

-- Check RLS policies on products
-- SELECT * FROM pg_policies WHERE tablename = 'products';
