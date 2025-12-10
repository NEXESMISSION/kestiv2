-- ============================================
-- FIX SUPERADMIN ROLE - COMPLETE SOLUTION
-- Run this in Supabase SQL Editor
-- ============================================

-- ============================================
-- STEP 1: Diagnostic - Check current state
-- ============================================
SELECT 
  au.id as auth_id, 
  au.email as auth_email,
  p.id as profile_id, 
  p.email as profile_email, 
  p.role,
  CASE 
    WHEN p.id IS NULL THEN '❌ NO PROFILE - MUST CREATE'
    WHEN p.role != 'super_admin' THEN '❌ WRONG ROLE - MUST UPDATE'
    ELSE '✅ OK'
  END as status
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
WHERE au.email = 'support@kestipro.com';

-- ============================================
-- STEP 2: CREATE THE PROFILE (Your main issue!)
-- Your auth user has NO profile, so we create one
-- ============================================
INSERT INTO profiles (
  id, 
  email, 
  full_name, 
  phone_number,
  business_mode, 
  role, 
  is_active, 
  is_paused,
  subscription_status,
  subscription_days,
  created_at, 
  updated_at
)
SELECT 
  id,                           -- Use auth.users.id
  email,                        -- Use auth.users.email
  'KESTI Pro Support',          -- Display name
  NULL,                         -- Phone (optional)
  'subscription',               -- Business mode
  'super_admin',                -- THE CRITICAL PART!
  true,                         -- Account active
  false,                        -- Not paused
  'active',                     -- Subscription status
  999999,                       -- Unlimited days
  NOW(),
  NOW()
FROM auth.users 
WHERE email = 'support@kestipro.com'
ON CONFLICT (id) DO UPDATE SET 
  role = 'super_admin',
  is_active = true,
  is_paused = false;

-- ============================================
-- STEP 3: Verify the fix worked
-- ============================================
SELECT 
  au.id as auth_id, 
  p.id as profile_id, 
  p.email,
  p.full_name,
  p.role,
  p.is_active,
  CASE 
    WHEN au.id = p.id AND p.role = 'super_admin' THEN '✅ FIXED!'
    ELSE '❌ Still broken - check errors above'
  END as status
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
WHERE au.email = 'support@kestipro.com';
