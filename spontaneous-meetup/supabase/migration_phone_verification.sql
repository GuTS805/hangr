-- ── Phone verification migration ─────────────────────────────────────
-- Run this in Supabase SQL Editor

-- 1. Add phone column to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone text;

-- 2. New users start as unverified (phone OTP sets is_verified = true)
ALTER TABLE public.profiles
  ALTER COLUMN is_verified SET DEFAULT false;

-- 3. Update the auto-create trigger to mark new users as unverified
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, avatar, is_verified, onboarded)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', SPLIT_PART(NEW.email, '@', 1), 'User'),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', ''),
    false,   -- must verify phone during onboarding
    false
  );
  RETURN NEW;
END;
$$;
