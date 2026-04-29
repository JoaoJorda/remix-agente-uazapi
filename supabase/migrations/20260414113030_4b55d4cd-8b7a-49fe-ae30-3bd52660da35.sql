CREATE POLICY "Service role update for whatsapp-media"
ON storage.objects FOR UPDATE TO service_role
USING (bucket_id = 'whatsapp-media');