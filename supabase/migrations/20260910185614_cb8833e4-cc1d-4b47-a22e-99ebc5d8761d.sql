CREATE TABLE public.topic_quizzes (
  id text NOT NULL PRIMARY KEY,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id text NOT NULL,
  topic_id text NOT NULL,
  file_name text NOT NULL,
  storage_path text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, topic_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.topic_quizzes TO authenticated;
GRANT ALL ON public.topic_quizzes TO service_role;

ALTER TABLE public.topic_quizzes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own topic quizzes" ON public.topic_quizzes FOR ALL TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_topic_quizzes_updated_at BEFORE UPDATE ON public.topic_quizzes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();