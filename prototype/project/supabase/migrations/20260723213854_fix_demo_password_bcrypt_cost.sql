-- Re-hash all CropGuard demo account passwords at bcrypt cost 10
-- to match Supabase GoTrue's expected bcrypt cost factor.

UPDATE auth.users SET encrypted_password = crypt('Agent1234!', gen_salt('bf', 10))
WHERE email = 'agent@asinyo.org';

UPDATE auth.users SET encrypted_password = crypt('Agent1234!', gen_salt('bf', 10))
WHERE email = 'razak@asinyo.org';

UPDATE auth.users SET encrypted_password = crypt('654321', gen_salt('bf', 10))
WHERE email = '+233241234567@cropguard.ag';

UPDATE auth.users SET encrypted_password = crypt('654321', gen_salt('bf', 10))
WHERE email = '+233551234568@cropguard.ag';

UPDATE auth.users SET encrypted_password = crypt('Staff1234!', gen_salt('bf', 10))
WHERE email = 'staff@asinyo.org';

UPDATE auth.users SET encrypted_password = crypt('Partner1234!', gen_salt('bf', 10))
WHERE email = 'partner@asinyo.org';

UPDATE auth.users SET encrypted_password = crypt('Admin1234!', gen_salt('bf', 10))
WHERE email = 'admin@asinyo.org';
