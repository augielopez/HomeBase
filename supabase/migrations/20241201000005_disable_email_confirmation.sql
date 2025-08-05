-- Disable email confirmation for development
-- This should only be used in development environments

-- Update the auth.users table to mark the existing user as confirmed
UPDATE auth.users 
SET email_confirmed_at = NOW(),
    confirmed_at = NOW()
WHERE email = 'web.augielopez@icloud.com';

-- Note: For production, you should enable email confirmation in Supabase Dashboard:
-- 1. Go to Authentication > Settings
-- 2. Disable "Enable email confirmations"
-- 3. Or keep it enabled and ensure users confirm their emails 