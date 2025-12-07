-- =====================================================
-- RETAIL MODE TABLES - Run in Supabase SQL Editor
-- =====================================================

-- 1. CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#6366f1',
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. UPDATE PRODUCTS TABLE (add missing columns)
ALTER TABLE products ADD COLUMN IF NOT EXISTS category TEXT DEFAULT '';
ALTER TABLE products ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES categories(id);
ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS track_stock BOOLEAN DEFAULT true;
ALTER TABLE products ADD COLUMN IF NOT EXISTS barcode TEXT;

-- 3. SET DEFAULT VALUES
UPDATE products SET track_stock = true WHERE track_stock IS NULL;

-- 4. RLS POLICIES FOR CATEGORIES
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "categories_select" ON categories;
DROP POLICY IF EXISTS "categories_insert" ON categories;
DROP POLICY IF EXISTS "categories_update" ON categories;
DROP POLICY IF EXISTS "categories_delete" ON categories;

CREATE POLICY "categories_select" ON categories
  FOR SELECT TO authenticated
  USING (business_id = auth.uid());

CREATE POLICY "categories_insert" ON categories
  FOR INSERT TO authenticated
  WITH CHECK (business_id = auth.uid());

CREATE POLICY "categories_update" ON categories
  FOR UPDATE TO authenticated
  USING (business_id = auth.uid());

CREATE POLICY "categories_delete" ON categories
  FOR DELETE TO authenticated
  USING (business_id = auth.uid());

-- 5. TRANSACTION_ITEMS TABLE (for retail sales itemization)
CREATE TABLE IF NOT EXISTS public.transaction_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_id UUID REFERENCES public.transactions(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  quantity INTEGER DEFAULT 1,
  unit_price DECIMAL(10,3) NOT NULL DEFAULT 0,
  total_price DECIMAL(10,3) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS for transaction_items
ALTER TABLE transaction_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "transaction_items_select" ON transaction_items;
DROP POLICY IF EXISTS "transaction_items_insert" ON transaction_items;

CREATE POLICY "transaction_items_select" ON transaction_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM transactions t 
      WHERE t.id = transaction_items.transaction_id 
      AND t.business_id = auth.uid()
    )
  );

CREATE POLICY "transaction_items_insert" ON transaction_items
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM transactions t 
      WHERE t.id = transaction_items.transaction_id 
      AND t.business_id = auth.uid()
    )
  );

-- 6. ADD business_type TO PROFILES (subscription vs retail)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS business_type TEXT DEFAULT 'subscription';

-- Valid values: 'subscription', 'retail'
-- subscription = إدارة الأعضاء والاشتراكات
-- retail = بيع المنتجات بالتجزئة

-- 7. GRANT PERMISSIONS
GRANT ALL ON categories TO authenticated;
GRANT ALL ON transaction_items TO authenticated;

SELECT '✅ Retail tables created!' as result;
