
INSERT INTO storage.buckets (id, name, public, allowed_mime_types)
VALUES ('whatsapp-media', 'whatsapp-media', true, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'audio/ogg', 'audio/mpeg', 'audio/mp4', 'video/mp4'])
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read access for whatsapp-media"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'whatsapp-media');

CREATE POLICY "Service role upload for whatsapp-media"
ON storage.objects FOR INSERT
TO service_role
WITH CHECK (bucket_id = 'whatsapp-media');
