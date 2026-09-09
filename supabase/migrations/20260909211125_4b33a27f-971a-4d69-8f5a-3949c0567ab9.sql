CREATE TABLE public.topic_aliases (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id text NOT NULL,
  source_key text NOT NULL,
  display_label text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, subject_id, source_key)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.topic_aliases TO authenticated;
GRANT ALL ON public.topic_aliases TO service_role;

ALTER TABLE public.topic_aliases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own topic aliases" ON public.topic_aliases
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_topic_aliases_updated_at
  BEFORE UPDATE ON public.topic_aliases
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();