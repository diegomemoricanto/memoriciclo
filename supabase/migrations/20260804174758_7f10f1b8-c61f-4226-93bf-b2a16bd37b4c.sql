CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  full_name text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile" ON public.profiles FOR ALL TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE TABLE public.saved_plans (
  id text NOT NULL,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_plans TO authenticated;
GRANT ALL ON public.saved_plans TO service_role;
ALTER TABLE public.saved_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own plans" ON public.saved_plans FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.plan_settings (
  plan_id text NOT NULL,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  weekly_hours numeric NOT NULL DEFAULT 0,
  study_days text[] NOT NULL DEFAULT '{}',
  min_session_minutes integer,
  max_session_minutes integer,
  PRIMARY KEY (user_id, plan_id),
  FOREIGN KEY (user_id, plan_id) REFERENCES public.saved_plans(user_id, id) ON DELETE CASCADE
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.plan_settings TO authenticated;
GRANT ALL ON public.plan_settings TO service_role;
ALTER TABLE public.plan_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own plan settings" ON public.plan_settings FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.subjects (
  id text NOT NULL,
  plan_id text NOT NULL,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text NOT NULL DEFAULT '#9EE6CF',
  importance integer NOT NULL DEFAULT 3,
  knowledge integer NOT NULL DEFAULT 3,
  min_session_minutes integer,
  max_session_minutes integer,
  position integer NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, plan_id, id),
  FOREIGN KEY (user_id, plan_id) REFERENCES public.saved_plans(user_id, id) ON DELETE CASCADE
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subjects TO authenticated;
GRANT ALL ON public.subjects TO service_role;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own subjects" ON public.subjects FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.sessions (
  id text NOT NULL,
  plan_id text NOT NULL,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id text NOT NULL,
  target_minutes integer NOT NULL DEFAULT 0,
  studied_seconds integer NOT NULL DEFAULT 0,
  completed boolean NOT NULL DEFAULT false,
  order_index integer NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, plan_id, id),
  FOREIGN KEY (user_id, plan_id) REFERENCES public.saved_plans(user_id, id) ON DELETE CASCADE
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sessions TO authenticated;
GRANT ALL ON public.sessions TO service_role;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own sessions" ON public.sessions FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.cycle_stats (
  plan_id text NOT NULL,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  completed_cycles integer NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, plan_id),
  FOREIGN KEY (user_id, plan_id) REFERENCES public.saved_plans(user_id, id) ON DELETE CASCADE
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cycle_stats TO authenticated;
GRANT ALL ON public.cycle_stats TO service_role;
ALTER TABLE public.cycle_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own cycle stats" ON public.cycle_stats FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.study_logs (
  id text NOT NULL,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id text,
  subject_id text NOT NULL,
  studied_at timestamptz NOT NULL DEFAULT now(),
  duration_seconds integer NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.study_logs TO authenticated;
GRANT ALL ON public.study_logs TO service_role;
ALTER TABLE public.study_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own study logs" ON public.study_logs FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.subject_topics (
  id text NOT NULL,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id text NOT NULL,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subject_topics TO authenticated;
GRANT ALL ON public.subject_topics TO service_role;
ALTER TABLE public.subject_topics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own topics" ON public.subject_topics FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.mind_maps (
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  scope text NOT NULL DEFAULT 'topic',
  ref_id text NOT NULL,
  data jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, scope, ref_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mind_maps TO authenticated;
GRANT ALL ON public.mind_maps TO service_role;
ALTER TABLE public.mind_maps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own mind maps" ON public.mind_maps FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);