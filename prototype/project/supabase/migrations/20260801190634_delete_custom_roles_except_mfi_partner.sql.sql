-- Delete all custom roles except "MFI Partner"
-- No users are currently assigned to any custom_role_id (verified)
-- Only MFI Partner has permissions rows, which we keep

-- Clean up any orphaned permissions for roles being deleted (safety)
DELETE FROM custom_role_permissions
WHERE role_id NOT IN (
  SELECT id FROM custom_roles WHERE name = 'MFI Partner'
)
AND role_id IN (SELECT id FROM custom_roles);

-- Delete the roles themselves
DELETE FROM custom_roles
WHERE name != 'MFI Partner';
