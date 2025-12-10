-- =====================================================
-- UPDATE EXPENSES CATEGORIES SQL
-- Run this in Supabase SQL Editor to fix old expenses
-- =====================================================

-- Step 1: Check which expenses don't have categories
SELECT 
  id,
  business_id,
  amount,
  category,
  category_id,
  description,
  date,
  CASE 
    WHEN category_id IS NULL THEN '❌ No Category ID'
    ELSE '✅ Has Category'
  END as status
FROM freelancer_expenses
WHERE category_id IS NULL OR category IS NULL OR category = ''
ORDER BY date DESC
LIMIT 50;

-- Step 2: View available expense categories for a user
-- Replace 'YOUR_USER_ID' with actual user UUID
-- SELECT id, name, color FROM freelancer_categories 
-- WHERE business_id = 'YOUR_USER_ID' AND type = 'expense' AND is_active = true;

-- =====================================================
-- OPTION A: Auto-assign based on description keywords
-- This will try to match descriptions to category names
-- =====================================================

-- First, let's see what categories exist
SELECT DISTINCT 
  fc.name as category_name,
  fc.id as category_id,
  COUNT(fe.id) as potential_matches
FROM freelancer_categories fc
JOIN freelancer_expenses fe ON fe.business_id = fc.business_id
WHERE fc.type = 'expense' 
  AND fc.is_active = true
  AND fe.category_id IS NULL
  AND (
    LOWER(fe.description) LIKE '%' || LOWER(fc.name) || '%'
    OR LOWER(fe.category) LIKE '%' || LOWER(fc.name) || '%'
  )
GROUP BY fc.name, fc.id;

-- =====================================================
-- OPTION B: Bulk update - Set a default category for uncategorized expenses
-- Uncomment and modify as needed
-- =====================================================

-- Update expenses that have category TEXT but no category_id
-- This matches the category name to find the ID
/*
UPDATE freelancer_expenses fe
SET category_id = fc.id
FROM freelancer_categories fc
WHERE fe.business_id = fc.business_id
  AND fe.category_id IS NULL
  AND LOWER(fe.category) = LOWER(fc.name)
  AND fc.type = 'expense'
  AND fc.is_active = true;
*/

-- =====================================================
-- OPTION C: Set a specific default category for all uncategorized
-- Replace 'أخرى' with your default category name
-- =====================================================

/*
UPDATE freelancer_expenses fe
SET 
  category_id = fc.id,
  category = fc.name
FROM freelancer_categories fc
WHERE fe.business_id = fc.business_id
  AND fe.category_id IS NULL
  AND fc.name = 'أخرى'
  AND fc.type = 'expense'
  AND fc.is_active = true;
*/

-- =====================================================
-- Verify results after running updates
-- =====================================================

-- SELECT 
--   COUNT(*) as total_expenses,
--   COUNT(category_id) as with_category,
--   COUNT(*) - COUNT(category_id) as without_category
-- FROM freelancer_expenses;

