ALTER TABLE public.quiz_attempts ADD COLUMN IF NOT EXISTS exam_track text;
ALTER TABLE public.study_sessions ADD COLUMN IF NOT EXISTS section text NOT NULL DEFAULT 'school';
ALTER TABLE public.study_sessions ADD COLUMN IF NOT EXISTS sub_subject text;

CREATE TABLE IF NOT EXISTS public.homework_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  title text,
  image_data_url text not null,
  questions jsonb,
  solution_md text,
  notes_md text,
  created_at timestamptz not null default now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.homework_items TO authenticated;
GRANT ALL ON public.homework_items TO service_role;

ALTER TABLE public.homework_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own homework" ON public.homework_items
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS homework_items_user_idx ON public.homework_items(user_id, created_at DESC);