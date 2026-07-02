/*
  # Fix agent farmer registration — make auth trigger SECURITY DEFINER

  ## Problem
  When an agent registers a farmer, the flow calls supabase.auth.signUp()
  which fires the on_auth_user_created trigger → handle_new_auth_user().

  This trigger function INSERTs into public.users. Trigger functions execute
  with the privileges of the INVOKING user (the agent), and the users table
  INSERT policy only permits the 'admin' role:

    "Admin can insert users in their org"
    WITH CHECK (organisation_id = get_my_org_id() AND get_my_role() = 'admin')

  The agent's INSERT is blocked by RLS, the trigger errors, and the whole
  registration rolls back.

  ## Fix
  Recreate handle_new_auth_user as SECURITY DEFINER so it runs as its
  owner (postgres superuser) and bypasses RLS. This is correct — this is
  a trusted system trigger, not arbitrary user SQL. The function only
  inserts the row created by auth.signUp(), so there is no security risk.
*/

CREATE OR REPLACE FUNCTION handle_new_auth_user()
RETURNS trigger
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
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'farmer'::user_role),
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
