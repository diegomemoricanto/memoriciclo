CREATE TABLE public.topic_images (
  id text NOT NULL,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  topic_id text NOT NULL,
  storage_path text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, id)
);

GRANT SELECT, INSERT, DELETE ON public.topic_images TO authenticated;
GRANT ALL ON public.topic_images TO service_role;

ALTER TABLE public.topic_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own topic images select" ON public.topic_images FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own topic images insert" ON public.topic_images FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own topic images delete" ON public.topic_images FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX topic_images_topic_idx ON public.topic_images (user_id, topic_id, created_at);

CREATE POLICY "topic images storage select" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'topic-images' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "topic images storage insert" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'topic-images' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "topic images storage delete" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'topic-images' AND (storage.foldername(name))[1] = auth.uid()::text);