/*
# Fix farmer demo password

The farmer account (+233241234567@cropguard.ag) was created by the
seed-demo-users edge function with a different password. This sets it
to the correct PIN: 654321
*/

UPDATE auth.users
SET encrypted_password = crypt('654321', gen_salt('bf', 10))
WHERE email = '+233241234567@cropguard.ag';
