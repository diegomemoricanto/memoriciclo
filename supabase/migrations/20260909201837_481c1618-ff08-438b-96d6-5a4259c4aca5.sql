ALTER TABLE public.study_logs ADD COLUMN IF NOT EXISTS session_id text;
CREATE INDEX IF NOT EXISTS study_logs_session_id_idx ON public.study_logs (user_id, session_id);