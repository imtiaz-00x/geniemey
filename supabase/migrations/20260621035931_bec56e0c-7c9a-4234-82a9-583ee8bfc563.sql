CREATE TABLE public.exercise_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  grade INTEGER NOT NULL,
  subject TEXT NOT NULL,
  chapter TEXT NOT NULL,
  exercise TEXT NOT NULL,
  question_index INTEGER NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, grade, subject, chapter, exercise, question_index)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.exercise_progress TO authenticated;
GRANT ALL ON public.exercise_progress TO service_role;
ALTER TABLE public.exercise_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own exercise progress" ON public.exercise_progress FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX exercise_progress_lookup_idx ON public.exercise_progress (user_id, grade, subject, chapter);