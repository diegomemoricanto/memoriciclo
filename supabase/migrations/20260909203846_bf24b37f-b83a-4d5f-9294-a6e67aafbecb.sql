CREATE TABLE IF NOT EXISTS public.study_session_locks (
  user_id uuid NOT NULL PRIMARY KEY DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  holder_id text NOT NULL,
  session_id text,
  plan_id text,
  started_at timestamptz NOT NULL DEFAULT now(),
  heartbeat_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.study_session_locks TO authenticated;
GRANT ALL ON public.study_session_locks TO service_role;

ALTER TABLE public.study_session_locks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own study session lock" ON public.study_session_locks
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_study_session_locks_updated_at
  BEFORE UPDATE ON public.study_session_locks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();