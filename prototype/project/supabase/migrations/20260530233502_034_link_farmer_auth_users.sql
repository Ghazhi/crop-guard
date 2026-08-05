/*
  # Link Auth Users to Farmer Records via Phone

  Farmer auth accounts created via direct migration (not the signUp flow) have
  their phone stored as raw_user_meta_data->>'phone', but the corresponding
  farmers.user_id was never populated.

  This migration matches auth users with role='farmer' to their farmers row
  by phone number and backfills farmers.user_id.

  Also updates the handle_new_auth_user trigger so future farmer auth accounts
  created via migration automatically link to the farmers row if one exists.

  Changes:
  1. Backfill farmers.user_id for all existing farmer auth accounts matched by phone.
  2. Update trigger to also link farmers.user_id when a new farmer auth user is created.
*/

-- 1. Backfill: match auth users with role=farmer to farmers rows by phone
DO $$
DECLARE
  r RECORD;
  farmer_id_found uuid;
BEGIN
  FOR r IN
    SELECT id, raw_user_meta_data->>'phone' AS phone
    FROM auth.users
    WHERE raw_user_meta_data->>'role' = 'farmer'
      AND raw_user_meta_data->>'phone' IS NOT NULL
  LOOP
    SELECT id INTO farmer_id_found
    FROM farmers
    WHERE phone = r.phone
    LIMIT 1;

    IF farmer_id_found IS NOT NULL THEN
      UPDATE farmers
      SET user_id = r.id
      WHERE id = farmer_id_found
        AND (user_id IS NULL OR user_id != r.id);
    END IF;
  END LOOP;
END $$;

-- 2. Update trigger: when a new farmer auth user is created, link to farmers row
CREATE OR REPLACE FUNCTION handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_phone text;
BEGIN
  INSERT INTO public.users (
    id,
    role,
    full_name,
    organisation_id,
    phone,
    preferred_language
  ) VALUES (
    NEW.id,
    COALESCE(
      (NEW.raw_user_meta_data->>'role')::user_role,
      'farmer'::user_role
    ),
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    CASE
      WHEN NEW.raw_user_meta_data->>'organisation_id' IS NOT NULL
      THEN (NEW.raw_user_meta_data->>'organisation_id')::uuid
      ELSE NULL
    END,
    COALESCE(NEW.raw_user_meta_data->>'phone', NULL),
    COALESCE(NEW.raw_user_meta_data->>'preferred_language', 'en')
  )
  ON CONFLICT (id) DO NOTHING;

  -- If this is a farmer, link to existing farmers row by phone
  IF (NEW.raw_user_meta_data->>'role') = 'farmer' THEN
    v_phone := NEW.raw_user_meta_data->>'phone';
    IF v_phone IS NOT NULL THEN
      UPDATE farmers
      SET user_id = NEW.id
      WHERE phone = v_phone
        AND user_id IS NULL;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
