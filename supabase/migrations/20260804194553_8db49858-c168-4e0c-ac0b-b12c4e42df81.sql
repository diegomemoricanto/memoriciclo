ALTER TABLE public.study_logs
  ADD COLUMN questions_total integer,
  ADD COLUMN questions_correct integer,
  ADD COLUMN questions_wrong integer;