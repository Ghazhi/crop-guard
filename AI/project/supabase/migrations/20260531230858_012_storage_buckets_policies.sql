/*
  # Storage Buckets and Policies
*/

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('cropguard-evidence', 'cropguard-evidence', false, 52428800, ARRAY['image/jpeg','image/png','image/webp','application/pdf']),
  ('cropguard-exports', 'cropguard-exports', false, 104857600, ARRAY['application/pdf','text/csv','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']),
  ('cropguard-avatars', 'cropguard-avatars', true, 5242880, ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users can upload evidence"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'cropguard-evidence');

CREATE POLICY "Users can view their own evidence files"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'cropguard-evidence' AND ((storage.foldername(name))[1] = auth.uid()::text OR EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('admin','staff'))));

CREATE POLICY "Users can update their own evidence files"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'cropguard-evidence' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Staff and admin can upload exports"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'cropguard-exports' AND EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('admin','staff')));

CREATE POLICY "Staff and admin can view exports"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'cropguard-exports' AND EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('admin','staff')));

CREATE POLICY "Agents can view their own exports"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'cropguard-exports' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Anyone authenticated can upload their avatar"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'cropguard-avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Avatars are publicly readable"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'cropguard-avatars');

CREATE POLICY "Users can update their own avatar"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'cropguard-avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
