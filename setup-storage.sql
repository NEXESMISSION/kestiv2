-- =====================================================
-- SETUP STORAGE FOR PRODUCT IMAGES
-- Run this in Supabase SQL Editor
-- =====================================================

-- 1. CREATE THE STORAGE BUCKET
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'products',
  'products',
  true,  -- Public so images can be viewed
  5242880,  -- 5MB max file size
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

-- 2. DROP OLD POLICIES IF THEY EXIST
DROP POLICY IF EXISTS "Users can upload their own product images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own product images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own product images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view product images" ON storage.objects;
DROP POLICY IF EXISTS "products_insert_policy" ON storage.objects;
DROP POLICY IF EXISTS "products_update_policy" ON storage.objects;
DROP POLICY IF EXISTS "products_delete_policy" ON storage.objects;
DROP POLICY IF EXISTS "products_select_policy" ON storage.objects;

-- 3. CREATE STORAGE POLICIES
-- Structure: products/{user_id}/filename.jpg

-- Allow users to upload to their own folder
CREATE POLICY "products_insert_policy" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'products' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to update their own images
CREATE POLICY "products_update_policy" ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'products' 
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'products' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to delete their own images
CREATE POLICY "products_delete_policy" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'products' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow anyone to view product images (public)
CREATE POLICY "products_select_policy" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'products');

-- 4. CREATE FUNCTION TO DELETE USER'S IMAGES WHEN ACCOUNT IS DELETED
CREATE OR REPLACE FUNCTION public.delete_user_storage()
RETURNS TRIGGER AS $$
BEGIN
  -- Delete all files in the user's folder
  DELETE FROM storage.objects 
  WHERE bucket_id = 'products' 
  AND (storage.foldername(name))[1] = OLD.id::text;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. CREATE TRIGGER TO AUTO-DELETE IMAGES WHEN USER IS DELETED
DROP TRIGGER IF EXISTS on_user_deleted_storage ON auth.users;
CREATE TRIGGER on_user_deleted_storage
  BEFORE DELETE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.delete_user_storage();

-- 6. ALSO DELETE IMAGES WHEN PROFILE IS DELETED (backup)
DROP TRIGGER IF EXISTS on_profile_deleted_storage ON profiles;
CREATE TRIGGER on_profile_deleted_storage
  BEFORE DELETE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.delete_user_storage();

-- 7. VERIFY SETUP
SELECT 'Storage bucket:' as info;
SELECT id, name, public, file_size_limit FROM storage.buckets WHERE id = 'products';

SELECT 'Storage policies:' as info;
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage';

SELECT '✅ Storage setup complete!' as result;
SELECT 'Upload path format: products/{user_id}/filename.jpg' as usage;
