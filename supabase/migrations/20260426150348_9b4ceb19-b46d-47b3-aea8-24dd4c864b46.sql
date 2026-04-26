-- practice_runs: append-only feed of runs
CREATE TABLE public.practice_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  skill TEXT NOT NULL,
  scenario TEXT NOT NULL,
  pass BOOLEAN NOT NULL,
  duration_ms INTEGER NOT NULL DEFAULT 0,
  ts TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_practice_runs_ts ON public.practice_runs (ts DESC);
CREATE INDEX idx_practice_runs_skill_ts ON public.practice_runs (skill, ts DESC);

ALTER TABLE public.practice_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone can read practice runs"
  ON public.practice_runs FOR SELECT
  USING (true);

CREATE POLICY "service role can insert practice runs"
  ON public.practice_runs FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- practice_state: single-row loop status
CREATE TABLE public.practice_state (
  id INTEGER PRIMARY KEY DEFAULT 1,
  running BOOLEAN NOT NULL DEFAULT false,
  current_skill TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT practice_state_singleton CHECK (id = 1)
);

INSERT INTO public.practice_state (id, running, current_skill) VALUES (1, false, '');

ALTER TABLE public.practice_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone can read practice state"
  ON public.practice_state FOR SELECT
  USING (true);

CREATE POLICY "service role can manage practice state"
  ON public.practice_state FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Enable realtime
ALTER TABLE public.practice_runs REPLICA IDENTITY FULL;
ALTER TABLE public.practice_state REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.practice_runs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.practice_state;