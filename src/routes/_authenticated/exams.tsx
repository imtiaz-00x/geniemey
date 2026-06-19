import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { generateQuiz, submitQuiz, EXAM_TRACKS } from "@/lib/study.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Loader2,
  Trophy,
  ListChecks,
  Layers,
  CheckCircle2,
  XCircle,
  RotateCcw,
  FileQuestion,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/exams")({
  component: ExamsPage,
});

type Question = { q: string; choices: string[]; answer: number; explanation: string };

const GRADES = [9, 10, 11, 12] as const;
const SUBJECT_LIST = ["Mathematics", "Physics", "Chemistry", "Biology", "English"] as const;

function ExamsPage() {
  const genQ = useServerFn(generateQuiz);
  const subQ = useServerFn(submitQuiz);

  const [track, setTrack] = useState<string>("JEE");
  const [grade, setGrade] = useState<number>(11);
  const [subject, setSubject] = useState<string>("Physics");
  const [chapter, setChapter] = useState("");
  const [mode, setMode] = useState<"exam" | "series">("exam");

  const [attempt, setAttempt] = useState<{ id: string; questions: Question[] } | null>(null);
  const [answers, setAnswers] = useState<number[]>([]);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [results, setResults] = useState<{ score: number; total: number; xp: number } | null>(null);

  const generateMut = useMutation({
    mutationFn: async () => {
      const topic = chapter.trim() || `${track} ${subject} mixed`;
      return genQ({
        data: {
          grade,
          subject,
          topic,
          count: mode === "series" ? 15 : 10,
          mode,
          examTrack: track,
        },
      });
    },
    onSuccess: (d) => {
      setAttempt({ id: d.attemptId, questions: d.questions as Question[] });
      setAnswers(new Array(d.questions.length).fill(-1));
      setStartTime(Date.now());
      setResults(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const submitMut = useMutation({
    mutationFn: async () => {
      if (!attempt || !startTime) throw new Error("No attempt");
      return subQ({
        data: {
          attemptId: attempt.id,
          answers: answers.map((a) => (a === -1 ? 0 : a)),
          timeTakenSeconds: Math.round((Date.now() - startTime) / 1000),
        },
      });
    },
    onSuccess: (r) => setResults({ score: r.score, total: r.total, xp: r.xpEarned }),
    onError: (e: Error) => toast.error(e.message),
  });

  function reset() {
    setAttempt(null);
    setAnswers([]);
    setResults(null);
    setStartTime(null);
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-5 pb-24 space-y-5">
      <div className="flex items-start gap-3">
        <div className="size-10 rounded-xl bg-flame/15 text-flame grid place-items-center shrink-0">
          <Trophy className="size-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold leading-tight">Competitive Exams</h1>
          <p className="text-sm text-muted-foreground">
            Build chapter tests and full test series for JEE, NEET, CUET and more.
          </p>
        </div>
      </div>

      {!attempt && !results && (
        <>
          <section className="space-y-2">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Exam track
            </h2>
            <div className="flex flex-wrap gap-2">
              {EXAM_TRACKS.map((t) => (
                <button
                  key={t}
                  onClick={() => setTrack(t)}
                  className={`px-3.5 py-2 rounded-full border-2 text-sm font-semibold transition ${
                    track === t
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card border-border hover:border-primary/40"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-2">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Class</h2>
            <div className="grid grid-cols-4 gap-2">
              {GRADES.map((g) => (
                <button
                  key={g}
                  onClick={() => setGrade(g)}
                  className={`h-12 rounded-xl font-bold transition border-2 ${
                    grade === g
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card border-border hover:border-primary/40"
                  }`}
                >
                  Class {g}
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-2">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Subject
            </h2>
            <div className="flex flex-wrap gap-2">
              {SUBJECT_LIST.map((s) => (
                <button
                  key={s}
                  onClick={() => setSubject(s)}
                  className={`px-3.5 py-2 rounded-full border-2 text-sm font-semibold transition ${
                    subject === s
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card border-border hover:border-primary/40"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-2">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Chapter / Topic
            </h2>
            <Input
              value={chapter}
              onChange={(e) => setChapter(e.target.value)}
              placeholder="e.g. Rotational motion, Genetics, Permutations…"
              className="h-11"
            />
          </section>

          <section className="grid sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setMode("exam")}
              className={`p-4 rounded-2xl text-left border-2 transition bg-card ${
                mode === "exam" ? "border-primary" : "border-border hover:border-primary/40"
              }`}
            >
              <div className="flex items-center gap-2 font-semibold">
                <ListChecks className="size-4 text-primary" /> Chapter test
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                10 exam-style MCQs from your chapter.
              </p>
            </button>
            <button
              type="button"
              onClick={() => setMode("series")}
              className={`p-4 rounded-2xl text-left border-2 transition bg-card ${
                mode === "series" ? "border-primary" : "border-border hover:border-primary/40"
              }`}
            >
              <div className="flex items-center gap-2 font-semibold">
                <Layers className="size-4 text-primary" /> Test series
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                15 mixed questions across the {track} syllabus.
              </p>
            </button>
          </section>

          <Button
            onClick={() => generateMut.mutate()}
            disabled={generateMut.isPending}
            className="w-full h-12 text-base rounded-full"
          >
            {generateMut.isPending ? (
              <>
                <Loader2 className="size-4 animate-spin mr-2" /> Building your test…
              </>
            ) : (
              "Start Test"
            )}
          </Button>

          {generateMut.isError && (
            <Card className="p-4 border-destructive/40 text-sm flex items-start gap-2">
              <AlertCircle className="size-4 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-destructive">Couldn't build the test</p>
                <p className="text-muted-foreground">{(generateMut.error as Error).message}</p>
              </div>
            </Card>
          )}

          {!generateMut.isPending && !generateMut.isError && (
            <Card className="p-5 text-center text-sm text-muted-foreground border-dashed">
              <FileQuestion className="size-8 mx-auto text-muted-foreground/60 mb-2" />
              No tests available yet. Pick a chapter and tap{" "}
              <span className="font-semibold text-foreground">Start Test</span>.
            </Card>
          )}
        </>
      )}

      {attempt && !results && (
        <Card className="p-4 space-y-4">
          <p className="text-xs text-muted-foreground">
            {track} · Class {grade} · {subject}
            {chapter && ` · ${chapter}`}
          </p>
          {attempt.questions.map((q, i) => (
            <div key={i} className="space-y-2">
              <p className="font-semibold">
                <span className="text-primary mr-1">Q{i + 1}.</span>
                {q.q}
              </p>
              <div className="grid gap-2">
                {q.choices.map((c, ci) => {
                  const sel = answers[i] === ci;
                  return (
                    <button
                      key={ci}
                      onClick={() => {
                        const n = [...answers];
                        n[i] = ci;
                        setAnswers(n);
                      }}
                      className={`text-left px-3 py-2.5 rounded-lg border-2 text-sm transition ${
                        sel ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                      }`}
                    >
                      <span className="inline-flex size-6 rounded-full bg-muted text-foreground/80 text-xs items-center justify-center font-semibold mr-2">
                        {String.fromCharCode(65 + ci)}
                      </span>
                      {c}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          <div className="flex gap-2">
            <Button variant="outline" onClick={reset} className="rounded-full">
              Cancel
            </Button>
            <Button
              onClick={() => submitMut.mutate()}
              disabled={submitMut.isPending}
              className="flex-1 h-12 text-base rounded-full"
            >
              {submitMut.isPending ? <Loader2 className="size-4 animate-spin" /> : "Submit Test"}
            </Button>
          </div>
        </Card>
      )}

      {results && attempt && (
        <Card className="p-6 text-center space-y-4">
          <div className="inline-flex size-20 rounded-full bg-primary/10 text-primary items-center justify-center mx-auto">
            <Trophy className="size-10" />
          </div>
          <div>
            <p className="text-3xl font-bold">
              {results.score} / {results.total}
            </p>
            <p className="text-muted-foreground">+{results.xp} XP earned</p>
          </div>
          <div className="text-left space-y-2 max-h-80 overflow-y-auto pr-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Review answers
            </p>
            {attempt.questions.map((q, i) => {
              const ok = answers[i] === q.answer;
              return (
                <div key={i} className="rounded-lg border border-border p-3 text-sm">
                  <div className="flex items-start gap-2">
                    {ok ? (
                      <CheckCircle2 className="size-4 text-success shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="size-4 text-destructive shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <p className="font-medium">{q.q}</p>
                      <p className="text-xs mt-1 text-muted-foreground">
                        Correct:{" "}
                        <span className="text-foreground font-medium">{q.choices[q.answer]}</span>
                      </p>
                      <p className="text-xs mt-1">{q.explanation}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <Button variant="outline" onClick={reset} className="rounded-full">
            <RotateCcw className="size-4 mr-1.5" /> New test
          </Button>
        </Card>
      )}
    </div>
  );
}
