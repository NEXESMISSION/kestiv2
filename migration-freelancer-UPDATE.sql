-- =====================================================
-- KESTI Pro - UPDATE Freelancer Tables
-- Run this ONLY if you already ran the old migration
-- This adds the missing features
-- =====================================================

-- =====================================================
-- 1. FIX: Make client_id NULLABLE in payments (for general income)
-- =====================================================
ALTER TABLE public.freelancer_payments 
  ALTER COLUMN client_id DROP NOT NULL;

-- Update payment_type constraint to include 'general'
ALTER TABLE public.freelancer_payments 
  DROP CONSTRAINT IF EXISTS freelancer_payments_payment_type_check;
ALTER TABLE public.freelancer_payments 
  ADD CONSTRAINT freelancer_payments_payment_type_check 
  CHECK (payment_type IN ('full', 'partial', 'deposit', 'general'));

-- =====================================================
-- 2. ADD: client_id to reminders table (for calendar events)
-- =====================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'freelancer_reminders'
        AND column_name = 'client_id'
    ) THEN
        ALTER TABLE public.freelancer_reminders 
        ADD COLUMN client_id UUID REFERENCES public.freelancer_clients(id) ON DELETE SET NULL;
        RAISE NOTICE 'Added client_id column to freelancer_reminders';
    ELSE
        RAISE NOTICE 'client_id already exists in freelancer_reminders';
    END IF;
END $$;

-- =====================================================
-- 3. FIX: Update trigger to handle NULL client_id
-- =====================================================
CREATE OR REPLACE FUNCTION update_client_on_payment()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only update client if client_id is NOT NULL
  IF NEW.client_id IS NOT NULL THEN
    UPDATE public.freelancer_clients
    SET 
      total_spent = total_spent + NEW.amount,
      updated_at = NOW()
    WHERE id = NEW.client_id;
  END IF;
  
  -- Update project paid_amount if linked to a project
  IF NEW.project_id IS NOT NULL THEN
    UPDATE public.freelancer_projects
    SET 
      paid_amount = paid_amount + NEW.amount,
      updated_at = NOW()
    WHERE id = NEW.project_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 4. ADD: Indexes for better performance
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_freelancer_clients_business ON public.freelancer_clients(business_id);
CREATE INDEX IF NOT EXISTS idx_freelancer_services_business ON public.freelancer_services(business_id);
CREATE INDEX IF NOT EXISTS idx_freelancer_projects_business ON public.freelancer_projects(business_id);
CREATE INDEX IF NOT EXISTS idx_freelancer_projects_client ON public.freelancer_projects(client_id);
CREATE INDEX IF NOT EXISTS idx_freelancer_projects_status ON public.freelancer_projects(status);
CREATE INDEX IF NOT EXISTS idx_freelancer_payments_business ON public.freelancer_payments(business_id);
CREATE INDEX IF NOT EXISTS idx_freelancer_payments_created ON public.freelancer_payments(created_at);
CREATE INDEX IF NOT EXISTS idx_freelancer_expenses_business ON public.freelancer_expenses(business_id);
CREATE INDEX IF NOT EXISTS idx_freelancer_expenses_date ON public.freelancer_expenses(date);
CREATE INDEX IF NOT EXISTS idx_freelancer_reminders_business ON public.freelancer_reminders(business_id);
CREATE INDEX IF NOT EXISTS idx_freelancer_reminders_date ON public.freelancer_reminders(date);

-- =====================================================
-- 5. ADD: Trigger for project updates
-- =====================================================
CREATE OR REPLACE FUNCTION update_client_on_project_update()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.paid_amount != NEW.paid_amount THEN
    UPDATE public.freelancer_clients
    SET 
      total_credit = total_credit - (NEW.paid_amount - OLD.paid_amount),
      updated_at = NOW()
    WHERE id = NEW.client_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_project_update ON public.freelancer_projects;
CREATE TRIGGER on_project_update
  AFTER UPDATE ON public.freelancer_projects
  FOR EACH ROW
  EXECUTE FUNCTION update_client_on_project_update();

-- =====================================================
-- DONE!
-- =====================================================
SELECT '✅ UPDATE COMPLETE!' AS status;
