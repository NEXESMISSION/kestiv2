-- Database Reset Script for hameddhieb@kestipro.com
-- This script will delete all freelancer-related data for the specified user
-- Run this in Supabase SQL Editor

-- First, get the user ID
DO $$
DECLARE
  target_user_id uuid;
BEGIN
  -- Get user ID from email
  SELECT id INTO target_user_id
  FROM auth.users
  WHERE email = 'hameddhieb@kestipro.com';
  
  IF target_user_id IS NULL THEN
    RAISE NOTICE 'User not found with email: hameddhieb@kestipro.com';
  ELSE
    RAISE NOTICE 'Resetting data for user ID: %', target_user_id;
    
    -- Delete freelancer event types
    DELETE FROM freelancer_event_types WHERE business_id = target_user_id;
    RAISE NOTICE 'Deleted event types';
    
    -- Delete freelancer reminders
    DELETE FROM freelancer_reminders WHERE business_id = target_user_id;
    RAISE NOTICE 'Deleted reminders';
    
    -- Delete freelancer expenses
    DELETE FROM freelancer_expenses WHERE business_id = target_user_id;
    RAISE NOTICE 'Deleted expenses';
    
    -- Delete freelancer payments
    DELETE FROM freelancer_payments WHERE business_id = target_user_id;
    RAISE NOTICE 'Deleted payments';
    
    -- Delete freelancer projects
    DELETE FROM freelancer_projects WHERE business_id = target_user_id;
    RAISE NOTICE 'Deleted projects';
    
    -- Delete freelancer services
    DELETE FROM freelancer_services WHERE business_id = target_user_id;
    RAISE NOTICE 'Deleted services';
    
    -- Delete freelancer clients
    DELETE FROM freelancer_clients WHERE business_id = target_user_id;
    RAISE NOTICE 'Deleted clients';
    
    -- Reset profile data (optional - keeps user but resets business info)
    -- UPDATE profiles 
    -- SET 
    --   business_name = NULL,
    --   business_type = NULL,
    --   updated_at = NOW()
    -- WHERE id = target_user_id;
    -- RAISE NOTICE 'Reset profile data';
    
    RAISE NOTICE 'Database reset completed successfully for hameddhieb@kestipro.com';
  END IF;
END $$;
