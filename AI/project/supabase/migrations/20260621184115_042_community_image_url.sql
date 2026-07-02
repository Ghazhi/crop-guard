
ALTER TABLE communities ADD COLUMN IF NOT EXISTS image_url text;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'community-images',
  'community-images',
  true,
  5242880,
  ARRAY['image/jpeg','image/jpg','image/png','image/webp']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "community_images_select" ON storage.objects
  FOR SELECT USING (bucket_id = 'community-images');

CREATE POLICY "community_images_insert" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'community-images');

CREATE POLICY "community_images_delete" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'community-images');
