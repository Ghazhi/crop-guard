/*
# Cooperative governance: funds, documents, compliance enhancements

## Changes
1. cooperative_funds: add member_id (FK farmers), mode_of_payment, reference, received_by
2. cooperative_compliance: add document_url (text)
3. Create storage bucket "coop-documents" for file uploads
4. Add RLS policies on storage bucket for authenticated users

## New columns
- cooperative_funds.member_id (uuid, FK farmers, nullable)
- cooperative_funds.mode_of_payment (text, nullable) — MoMo, Bank, Cash
- cooperative_funds.reference (text, nullable) — receipt number
- cooperative_funds.received_by (text, nullable)
- cooperative_compliance.document_url (text, nullable)

## Storage
- Bucket "coop-documents" public read, authenticated upload
*/

ALTER TABLE cooperative_funds
  ADD COLUMN IF NOT EXISTS member_id uuid REFERENCES farmers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS mode_of_payment text,
  ADD COLUMN IF NOT EXISTS reference text,
  ADD COLUMN IF NOT EXISTS received_by text;

ALTER TABLE cooperative_compliance
  ADD COLUMN IF NOT EXISTS document_url text;

INSERT INTO storage.buckets (id, name, public)
VALUES ('coop-documents', 'coop-documents', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "auth_read_coop_documents" ON storage.objects;
CREATE POLICY "auth_read_coop_documents"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'coop-documents');

DROP POLICY IF EXISTS "auth_insert_coop_documents" ON storage.objects;
CREATE POLICY "auth_insert_coop_documents"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'coop-documents');

DROP POLICY IF EXISTS "auth_update_coop_documents" ON storage.objects;
CREATE POLICY "auth_update_coop_documents"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'coop-documents')
  WITH CHECK (bucket_id = 'coop-documents');

DROP POLICY IF EXISTS "auth_delete_coop_documents" ON storage.objects;
CREATE POLICY "auth_delete_coop_documents"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'coop-documents');
