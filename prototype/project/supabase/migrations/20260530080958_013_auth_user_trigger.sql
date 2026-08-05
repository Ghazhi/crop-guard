/*
  # Auth User Trigger — Auto-create profile in public.users

  When a new user is created in auth.users (via Supabase dashboard, invite, or sign-up),
  this trigger automatically inserts a corresponding row in public.users.

  The role, full_name, organisation_id, and preferred_language can be seeded from
  the user's raw_user_meta_data at sign-up time by passing them in the metadata object.

  This solves the chicken-and-egg problem where newly authenticated users cannot
  INSERT their own profile due to RLS requiring an existing role.
*/

CREATE OR REPLACE FUNCTION handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_auth_user();
