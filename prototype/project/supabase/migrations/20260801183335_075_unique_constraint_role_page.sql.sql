-- Add unique constraint so we can upsert by (role_id, page_key)
ALTER TABLE custom_role_permissions
  DROP CONSTRAINT IF EXISTS custom_role_permissions_role_id_page_key_key;

ALTER TABLE custom_role_permissions
  ADD CONSTRAINT custom_role_permissions_role_id_page_key_key
  UNIQUE (role_id, page_key);
