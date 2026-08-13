CREATE TABLE public.contests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  board text,
  exam_date date,
  registered boolean NOT NULL DEFAULT false,
  plan_id text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT contests_user_plan_fkey FOREIGN KEY (user_id, plan_id) REFERENCES public.saved_plans(user_id, id) ON DELETE SET NULL
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.contests TO authenticated;
GRANT ALL ON public.contests TO service_role;

ALTER TABLE public.contests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own contests" ON public.contests FOR ALL TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_contests_updated_at BEFORE UPDATE ON public.contests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();