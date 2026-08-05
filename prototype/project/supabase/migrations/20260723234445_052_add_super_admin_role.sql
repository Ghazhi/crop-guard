/*
# Add super_admin role and seed super admin account

1. Changes
   - Add 'super_admin' to the user_role enum
   - Seed a super_admin auth user and users table row
2. Security
   - No new tables
   - Super admin gets access to all portals via app-level role checks
3. Notes
   - Super admin credentials: admin@asinyo.org / Admin1234!
   - Organisation: 00000000-0000-0000-0000-000000000001 (same demo org)
*/

-- Add super_admin to the user_role enum
DO $$ BEGIN
  ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'super_admin';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'super_admin may already exist: %', SQLERRM;
END $$;

-- Seed super admin auth user
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin@asinyo.org') THEN
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      raw_user_meta_data, raw_app_meta_data, role, aud, created_at, updated_at
    ) VALUES (
      '00000000-0000-0000-0000-000000000099',
      '00000000-0000-0000-0000-000000000000',
      'admin@asinyo.org',
      crypt('Admin1234!', gen_salt('bf')),
      now(),
      jsonb_build_object('role','super_admin','full_name','System Administrator','organisation_id','00000000-0000-0000-0000-000000000001','phone','0200000000'),
      jsonb_build_object('role','super_admin'),
      'authenticated',
      'authenticated',
      now(),
      now()
    );
  END IF;
END $$;

-- Insert into users table if not exists
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = '00000000-0000-0000-0000-000000000099') THEN
    INSERT INTO public.users (
      id, organisation_id, role, full_name, phone,
      preferred_language, is_active, must_change_password
    ) VALUES (
      '00000000-0000-0000-0000-000000000099',
      '00000000-0000-0000-0000-000000000001',
      'super_admin',
      'System Administrator',
      '0200000000',
      'en',
      true,
      false
    );
  END IF;
END $$;
