-- Public bucket for MVP assets (body photos fallback when Cloudinary upload is blocked)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'shootai-assets',
  'shootai-assets',
  true,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS shootai_assets_public_read ON storage.objects;
CREATE POLICY shootai_assets_public_read
  ON storage.objects FOR SELECT
  USING (bucket_id = 'shootai-assets');

DROP POLICY IF EXISTS shootai_assets_public_insert ON storage.objects;
CREATE POLICY shootai_assets_public_insert
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'shootai-assets');

DROP POLICY IF EXISTS shootai_assets_public_update ON storage.objects;
CREATE POLICY shootai_assets_public_update
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'shootai-assets')
  WITH CHECK (bucket_id = 'shootai-assets');
