ALTER TABLE public.topic_quizzes ADD COLUMN IF NOT EXISTS title text NOT NULL DEFAULT '';
ALTER TABLE public.topic_quizzes ALTER COLUMN file_name SET DEFAULT '';
ALTER TABLE public.topic_quizzes ALTER COLUMN storage_path SET DEFAULT '';