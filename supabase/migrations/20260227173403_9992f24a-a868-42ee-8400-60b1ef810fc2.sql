INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('audio-messages', 'audio-messages', true, 26214400, ARRAY['audio/ogg', 'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/m4a', 'audio/webm', 'audio/mp4'])
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public audio read access" ON storage.objects
  FOR SELECT USING (bucket_id = 'audio-messages');

CREATE POLICY "Service role audio upload" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'audio-messages');

CREATE POLICY "Service role audio update" ON storage.objects
  FOR UPDATE USING (bucket_id = 'audio-messages');