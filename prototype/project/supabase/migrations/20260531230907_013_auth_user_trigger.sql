/*
  # Auth User Trigger — Auto-create profile in public.users and link farmer records
*/

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
    id, role, full_name, organisation_id, phone, preferred_language
  ) VALUES (
    NEW.id,
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'farmer'::user_role),
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    CASE WHEN NEW.raw_user_meta_data->>'organisation_id' IS NOT NULL THEN (NEW.raw_user_meta_data->>'organisation_id')::uuid ELSE NULL END,
    COALESCE(NEW.raw_user_meta_data->>'phone', NULL),
    COALESCE(NEW.raw_user_meta_data->>'preferred_language', 'en')
  )
  ON CONFLICT (id) DO NOTHING;

  -- If this is a farmer, link to existing farmers row by phone
  IF (NEW.raw_user_meta_data->>'role') = 'farmer' THEN
    v_phone := NEW.raw_user_meta_data->>'phone';
    IF v_phone IS NOT NULL THEN
      UPDATE farmers SET user_id = NEW.id WHERE phone = v_phone AND user_id IS NULL;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_auth_user();
