import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  listChapterExercises,
  getExerciseQuestions,
  getExerciseSolution,
  markExerciseQuestion,
  getChapterExerciseProgress,
} from "@/lib/study.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  BookOpen,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Circle,
  Lightbulb,
  Sparkles,
  RotateCcw,
  ListChecks,
} from "lucide-react";
import { StudyMarkdown } from "@/components/study-markdown";
import { toast } from "sonner";

const searchSchema = z.object({
  grade: z.coerce.number().int().min(1).max(12),
  subject: z.string().min(1),
  chapter: z.string().min(1),
  exercise: z.string().optional(),
});

export const Route = createFileRoute("/_authenticated/exercises")({
  validateSearch: searchSchema,
  component: ExercisesPage,
  errorComponent: ({ error }) => (
    <div className="p-6 text-sm text-destructive">{error.message}</div>
  ),
  notFoundComponent: () => <div className="p-6">Not found.</div>,
});

function ExercisesPage() {
  const { grade, subject, chapter, exercise } = Route.useSearch();
  return exercise ? (
    <ExerciseDetail grade={grade} subject={subject} chapter={chapter} exercise={exercise} />
  ) : (
    <ExerciseList grade={grade} subject={subject} chapter={chapter} />
  );
}

function ExerciseList({
  grade,
  subject,
  chapter,
}: {
  grade: number;
  subject: string;
  chapter: string;
}) {
  const listFn = useServerFn(listChapterExercises);
  const progressFn = useServerFn(getChapterExerciseProgress);

  const listQ = useQuery({
    queryKey: ["chapter-exercises", grade, subject, chapter],
    queryFn: () => listFn({ data: { grade, subject, chapter } }),
    staleTime: 1000 * 60 * 30,
  });
  const progQ = useQuery({
    queryKey: ["chapter-exercise-progress", grade, subject, chapter],
    queryFn: () => progressFn({ data: { grade, subject, chapter } }),
  });

  return (
    <div className="max-w-3xl mx-auto px-4 py-5 pb-24 space-y-5">
      <Link
        to="/ncert"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" /> NCERT Library
      </Link>

      <div className="flex items-start gap-3">
        <div className="size-10 rounded-xl bg-primary/10 text-primary grid place-items-center shrink-0">
          <BookOpen className="size-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold leading-tight">Textbook Exercises</h1>
          <p className="text-sm text-muted-foreground">
            Class {grade} · {subject} · {chapter}
          </p>
        </div>
      </div>

      {listQ.isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Loading exercises…
        </div>
      ) : listQ.isError ? (
        <p className="text-sm text-destructive">Could not load exercises.</p>
      ) : !listQ.data?.exercises.length ? (
        <p className="text-sm text-muted-foreground">No exercises available.</p>
      ) : (
        <div className="space-y-2">
          {listQ.data.exercises.map((ex) => {
            const done = progQ.data?.byExercise?.[ex.name] ?? 0;
            const isMisc = /misc/i.test(ex.name);
            return (
              <Link
                key={ex.name}
                to="/exercises"
                search={{ grade, subject, chapter, exercise: ex.name }}
                className="block"
              >
                <Card
                  className={`p-4 flex items-center gap-3 hover:border-primary/50 transition ${
                    isMisc ? "border-primary/30 bg-primary/5" : ""
                  }`}
                >
                  <div
                    className={`size-10 rounded-lg grid place-items-center shrink-0 ${
                      isMisc
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-foreground/70"
                    }`}
                  >
                    {isMisc ? <Sparkles className="size-5" /> : <ListChecks className="size-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{ex.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {done}/{ex.questionCount} done
                    </p>
                  </div>
                  <ChevronRight className="size-4 text-muted-foreground shrink-0" />
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ExerciseDetail({
  grade,
  subject,
  chapter,
  exercise,
}: {
  grade: number;
  subject: string;
  chapter: string;
  exercise: string;
}) {
  const qc = useQueryClient();
  const qFn = useServerFn(getExerciseQuestions);
  const solveFn = useServerFn(getExerciseSolution);
  const markFn = useServerFn(markExerciseQuestion);

  const qsQ = useQuery({
    queryKey: ["exercise-questions", grade, subject, chapter, exercise],
    queryFn: () => qFn({ data: { grade, subject, chapter, exercise } }),
    staleTime: 1000 * 60 * 30,
  });

  const [openAction, setOpenAction] = useState<
    { idx: number; kind: "solution" | "explain" | "similar" } | null
  >(null);

  const solveMut = useMutation({
    mutationFn: ({ question, kind }: { question: string; kind: "solution" | "explain" | "similar" }) =>
      solveFn({ data: { grade, subject, chapter, question, kind } }),
    onError: (e: Error) => toast.error(e.message),
  });

  const markMut = useMutation({
    mutationFn: (vars: { questionIndex: number; completed: boolean }) =>
      markFn({ data: { grade, subject, chapter, exercise, ...vars } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["exercise-questions", grade, subject, chapter, exercise] });
      qc.invalidateQueries({ queryKey: ["chapter-exercise-progress", grade, subject, chapter] });
    },
  });

  const runAction = (idx: number, question: string, kind: "solution" | "explain" | "similar") => {
    setOpenAction({ idx, kind });
    solveMut.mutate({ question, kind });
  };

  const completedSet = new Set(qsQ.data?.completed ?? []);
  const totalDone = completedSet.size;
  const total = qsQ.data?.questions.length ?? 0;
  const isMisc = /misc/i.test(exercise);

  return (
    <div className="max-w-3xl mx-auto px-4 py-5 pb-24 space-y-5">
      <Link
        to="/exercises"
        search={{ grade, subject, chapter }}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" /> All exercises
      </Link>

      <div className="flex items-start gap-3">
        <div
          className={`size-10 rounded-xl grid place-items-center shrink-0 ${
            isMisc ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"
          }`}
        >
          {isMisc ? <Sparkles className="size-5" /> : <ListChecks className="size-5" />}
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-bold leading-tight">{exercise}</h1>
          <p className="text-sm text-muted-foreground truncate">{chapter}</p>
          {total > 0 && (
            <div className="mt-2 flex items-center gap-2">
              <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${(totalDone / total) * 100}%` }}
                />
              </div>
              <span className="text-xs font-medium text-muted-foreground">
                {totalDone}/{total}
              </span>
            </div>
          )}
        </div>
      </div>

      {qsQ.isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Loading questions…
        </div>
      ) : qsQ.isError ? (
        <p className="text-sm text-destructive">Could not load questions.</p>
      ) : (
        <div className="space-y-3">
          {qsQ.data?.questions.map((q, idx) => {
            const done = completedSet.has(idx);
            const showHint = openAction?.idx === idx;
            const active = openAction?.idx === idx;
            return (
              <Card key={idx} className="p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <button
                    onClick={() =>
                      markMut.mutate({ questionIndex: idx, completed: !done })
                    }
                    className="mt-0.5 shrink-0"
                    aria-label={done ? "Mark not done" : "Mark done"}
                  >
                    {done ? (
                      <CheckCircle2 className="size-5 text-primary" />
                    ) : (
                      <Circle className="size-5 text-muted-foreground" />
                    )}
                  </button>
                  <div className="flex-1 space-y-1">
                    <p className="text-xs font-semibold text-muted-foreground">
                      Question {idx + 1}
                    </p>
                    <p className="text-sm leading-relaxed">{q.question}</p>
                  </div>
                </div>

                <details className="rounded-lg bg-muted/40 px-3 py-2">
                  <summary className="text-xs font-medium text-muted-foreground cursor-pointer flex items-center gap-1.5">
                    <Lightbulb className="size-3.5" /> Hint
                  </summary>
                  <p className="mt-2 text-sm text-foreground/80">{q.hint}</p>
                </details>

                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="default"
                    className="rounded-full"
                    onClick={() => runAction(idx, q.question, "solution")}
                    disabled={solveMut.isPending && active}
                  >
                    {solveMut.isPending && active && openAction?.kind === "solution" ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : null}
                    View Answer
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="rounded-full"
                    onClick={() => runAction(idx, q.question, "explain")}
                  >
                    <Sparkles className="size-3.5" /> Explain with AI
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-full"
                    onClick={() => runAction(idx, q.question, "similar")}
                  >
                    <RotateCcw className="size-3.5" /> Similar Question
                  </Button>
                </div>

                {showHint && solveMut.isPending && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="size-3.5 animate-spin" /> Generating…
                  </div>
                )}
                {showHint && solveMut.data && !solveMut.isPending && (
                  <div className="rounded-lg border border-border bg-card p-3">
                    <StudyMarkdown>{solveMut.data.content}</StudyMarkdown>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
