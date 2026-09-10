CREATE POLICY "topic quizzes storage select" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'topic-quizzes' AND (storage.foldername(name))[1] = (auth.uid())::text);

CREATE POLICY "topic quizzes storage insert" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'topic-quizzes' AND (storage.foldername(name))[1] = (auth.uid())::text);

CREATE POLICY "topic quizzes storage update" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'topic-quizzes' AND (storage.foldername(name))[1] = (auth.uid())::text)
WITH CHECK (bucket_id = 'topic-quizzes' AND (storage.foldername(name))[1] = (auth.uid())::text);

CREATE POLICY "topic quizzes storage delete" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'topic-quizzes' AND (storage.foldername(name))[1] = (auth.uid())::text);