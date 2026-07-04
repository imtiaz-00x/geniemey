import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getSession, generateQuiz, submitQuiz, startSession, suggestTopics } from "@/lib/study.functions";
import { createThread } from "@/lib/tutor.functions";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Calculator, FlaskConical, MessageCircle, Sparkles, CheckCircle2, XCircle, Loader2, Trophy, Clock, RotateCcw, BookOpenCheck, Search, History } from "lucide-react";
import { StudyMarkdown } from "@/components/study-markdown";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/learn/$sessionId")({
  component: SessionPage,
});

type Question = { q: string; choices: string[]; answer: number; explanation: string };

function SessionPage() {
  const { sessionId } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const getS = useServerFn(getSession);
  const genQ = useServerFn(generateQuiz);
  const subQ = useServerFn(submitQuiz);
  const newThread = useServerFn(createThread);

  const sessionQ = useQuery({
    queryKey: ["session", sessionId],
    queryFn: () => getS({ data: { sessionId } }),
  });
  const session = sessionQ.data;
  const SubjectIcon = /math/i.test(session?.subject ?? "") ? Calculator : FlaskConical;

  const [tab, setTab] = useState("lesson");
  const [quizMode, setQuizMode] = useState<"practice" | "timed" | "weekly">("practice");
  const [attempt, setAttempt] = useState<{ id: string; questions: Question[] } | null>(null);
  const [answers, setAnswers] = useState<number[]>([]);
  const [showResults, setShowResults] = useState<{ score: number; total: number; xp: number } | null>(null);
  const [startTime, setStartTime] = useState<number | null>(null);

  const generateMut = useMutation({
    mutationFn: async (mode: "practice" | "timed" | "weekly") => {
      if (!session) throw new Error("No session");
      return genQ({
        data: {
          sessionId,
          grade: session.grade,
          subject: session.subject,
          topic: session.topic,
          count: mode === "weekly" ? 10 : 5,
          mode,
        },
      });
    },
    onSuccess: (data) => {
      setAttempt({ id: data.attemptId, questions: data.questions as Question[] });
      setAnswers(new Array(data.questions.length).fill(-1));
      setShowResults(null);
      setStartTime(Date.now());
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
    onSuccess: (r) => {
      setShowResults({ score: r.score, total: r.total, xp: r.xpEarned });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["dashboard-header"] });
    },
  });

  const askTutorMut = useMutation({
    mutationFn: async () => {
      if (!session) throw new Error();
      return newThread({
        data: {
          title: `Doubts: ${session.topic}`,
          grade: session.grade,
          subject: session.subject,
          topic: session.topic,
        },
      });
    },
    onSuccess: ({ id }) => navigate({ to: "/tutor/$threadId", params: { threadId: id } }),
  });

  // ----- Learn New Topic (stay in same class + subject) -----
  const [newTopicOpen, setNewTopicOpen] = useState(false);
  const [newTopicInput, setNewTopicInput] = useState("");
  const [recent, setRecent] = useState<string[]>([]);
  const recentKey = session ? `gm.recent.topics.${session.grade}.${session.subject}` : "";

  useEffect(() => {
    if (!recentKey) return;
    try {
      const raw = localStorage.getItem(recentKey);
      setRecent(raw ? (JSON.parse(raw) as string[]) : []);
    } catch {
      setRecent([]);
    }
  }, [recentKey]);

  const suggestFn = useServerFn(suggestTopics);
  const startFn = useServerFn(startSession);

  const suggestQ = useQuery({
    queryKey: ["learn-more-topics", session?.grade, session?.subject],
    queryFn: () => suggestFn({ data: { grade: session!.grade, subject: session!.subject } }),
    enabled: newTopicOpen && !!session,
    staleTime: 1000 * 60 * 10,
  });

  const startNewMut = useMutation({
    mutationFn: async (topic: string) => {
      if (!session) throw new Error("No session");
      return startFn({ data: { grade: session.grade, subject: session.subject, topic } });
    },
    onSuccess: ({ sessionId: newId }, topic) => {
      try {
        const next = [topic, ...recent.filter((t) => t !== topic)].slice(0, 6);
        localStorage.setItem(recentKey, JSON.stringify(next));
      } catch { /* ignore */ }
      setNewTopicOpen(false);
      setNewTopicInput("");
      navigate({ to: "/learn/$sessionId", params: { sessionId: newId } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (sessionQ.isLoading || !session) {
    return (
      <div className="min-h-[60vh] grid place-items-center">
        <div className="text-center">
          <Loader2 className="size-8 animate-spin text-primary mx-auto" />
          <p className="text-sm text-muted-foreground mt-3">Loading your lesson…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-5 pb-24 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div
            className="size-10 rounded-xl grid place-items-center text-white shrink-0"
            style={{
              backgroundColor:
                /math/i.test(session.subject) ? "var(--color-math)" : "var(--color-science)",
            }}
          >
            <SubjectIcon className="size-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">
              Grade {session.grade} · {session.subject}
            </p>
            <h1 className="text-xl font-bold leading-tight">{session.topic}</h1>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => askTutorMut.mutate()} disabled={askTutorMut.isPending}>
          <MessageCircle className="size-4 mr-1.5" /> Ask tutor
        </Button>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="lesson">Lesson</TabsTrigger>
          <TabsTrigger value="quiz">Quiz</TabsTrigger>
          <TabsTrigger value="practice">Practice</TabsTrigger>
        </TabsList>

        <TabsContent value="lesson" className="mt-4">
          <Card className="p-5">
            <article className="prose-study">
              <StudyMarkdown>{session.lesson_md ?? ""}</StudyMarkdown>
            </article>
            <div className="mt-6 pt-4 border-t border-border flex flex-wrap gap-2">
              <Button onClick={() => setTab("quiz")} className="gap-1.5">
                <Sparkles className="size-4" /> Take the quiz
              </Button>
              <Button variant="outline" onClick={() => askTutorMut.mutate()} disabled={askTutorMut.isPending}>
                <MessageCircle className="size-4 mr-1.5" /> Got a doubt?
              </Button>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="quiz" className="mt-4 space-y-4">
          {!attempt && !showResults && (
            <Card className="p-5 space-y-4">
              <div>
                <h3 className="font-semibold">Pick a quiz mode</h3>
                <p className="text-sm text-muted-foreground">All quizzes give XP for each correct answer.</p>
              </div>
              <div className="grid gap-2">
                {[
                  { id: "practice", label: "Practice (5 Qs)", desc: "No timer · NCERT level", icon: Sparkles },
                  { id: "timed", label: "Timed round (5 Qs · 5 min)", desc: "JEE/NEET style", icon: Clock },
                  { id: "weekly", label: "Full chapter test (10 Qs)", desc: "Weekend challenge", icon: Trophy },
                ].map((m) => (
                  <button
                    key={m.id}
                    onClick={() => {
                      setQuizMode(m.id as "practice" | "timed" | "weekly");
                      generateMut.mutate(m.id as "practice" | "timed" | "weekly");
                    }}
                    disabled={generateMut.isPending}
                    className="flex items-center gap-3 p-3 rounded-xl border-2 border-border hover:border-primary text-left transition disabled:opacity-50"
                  >
                    <div className="size-10 rounded-lg bg-primary/10 text-primary grid place-items-center">
                      <m.icon className="size-5" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold">{m.label}</p>
                      <p className="text-xs text-muted-foreground">{m.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
              {generateMut.isPending && (
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <Loader2 className="size-4 animate-spin" /> Generating your quiz…
                </p>
              )}
            </Card>
          )}

          {attempt && !showResults && (
            <QuizRunner
              questions={attempt.questions}
              answers={answers}
              setAnswers={setAnswers}
              onSubmit={() => submitMut.mutate()}
              submitting={submitMut.isPending}
              mode={quizMode}
              startTime={startTime}
            />
          )}

          {showResults && attempt && (
            <Card className="p-6 text-center space-y-4">
              <div className="inline-flex size-20 rounded-full bg-primary/10 text-primary items-center justify-center mx-auto">
                <Trophy className="size-10" />
              </div>
              <div>
                <p className="text-3xl font-bold">
                  {showResults.score} / {showResults.total}
                </p>
                <p className="text-muted-foreground">+{showResults.xp} XP earned</p>
              </div>
              <Review questions={attempt.questions} answers={answers} />
              <div className="flex gap-2 justify-center pt-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setAttempt(null);
                    setShowResults(null);
                    setAnswers([]);
                  }}
                >
                  <RotateCcw className="size-4 mr-1.5" /> New quiz
                </Button>
                <Button onClick={() => navigate({ to: "/" })}>Back to home</Button>
              </div>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="practice" className="mt-4">
          <Card className="p-5 space-y-3">
            <h3 className="font-semibold">Practice problem bank</h3>
            <p className="text-sm text-muted-foreground">
              Generate fresh practice rounds anytime. Each round = 5 NCERT-aligned questions.
            </p>
            <Button
              onClick={() => {
                setQuizMode("practice");
                setTab("quiz");
                generateMut.mutate("practice");
              }}
              disabled={generateMut.isPending}
            >
              {generateMut.isPending ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4 mr-1.5" />}
              Start a new round
            </Button>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function QuizRunner({
  questions,
  answers,
  setAnswers,
  onSubmit,
  submitting,
  mode,
  startTime,
}: {
  questions: Question[];
  answers: number[];
  setAnswers: (a: number[]) => void;
  onSubmit: () => void;
  submitting: boolean;
  mode: "practice" | "timed" | "weekly";
  startTime: number | null;
}) {
  const limitMin = mode === "timed" ? 5 : mode === "weekly" ? 15 : null;
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!limitMin) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [limitMin]);
  const elapsed = startTime ? Math.floor((now - startTime) / 1000) : 0;
  const remaining = limitMin ? limitMin * 60 - elapsed : null;
  useEffect(() => {
    if (remaining !== null && remaining <= 0 && !submitting) onSubmit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining, submitting]);

  return (
    <div className="space-y-3">
      {remaining !== null && (
        <div className="sticky top-14 z-10 -mx-1 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold flex items-center justify-between">
          <span className="flex items-center gap-1.5"><Clock className="size-4" /> Time left</span>
          <span>{Math.max(0, Math.floor(remaining / 60))}:{String(Math.max(0, remaining % 60)).padStart(2, "0")}</span>
        </div>
      )}
      {questions.map((q, i) => (
        <Card key={i} className="p-4 space-y-3">
          <p className="font-semibold">
            <span className="text-primary mr-1">Q{i + 1}.</span>
            {q.q}
          </p>
          <div className="grid gap-2">
            {q.choices.map((c, ci) => {
              const selected = answers[i] === ci;
              return (
                <button
                  key={ci}
                  onClick={() => {
                    const next = [...answers];
                    next[i] = ci;
                    setAnswers(next);
                  }}
                  className={`text-left px-3 py-2.5 rounded-lg border-2 text-sm transition ${
                    selected
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/40"
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
        </Card>
      ))}
      <Button onClick={onSubmit} disabled={submitting} className="w-full h-12 text-base">
        {submitting ? <Loader2 className="size-4 animate-spin" /> : "Submit answers"}
      </Button>
    </div>
  );
}

function Review({ questions, answers }: { questions: Question[]; answers: number[] }) {
  return (
    <div className="text-left space-y-2 max-h-72 overflow-y-auto">
      {questions.map((q, i) => {
        const correct = answers[i] === q.answer;
        return (
          <div key={i} className="rounded-lg border border-border p-3 text-sm">
            <div className="flex items-start gap-2">
              {correct ? (
                <CheckCircle2 className="size-4 text-success shrink-0 mt-0.5" />
              ) : (
                <XCircle className="size-4 text-destructive shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <p className="font-medium">{q.q}</p>
                <p className="text-xs mt-1 text-muted-foreground">
                  Correct: <span className="text-foreground font-medium">{q.choices[q.answer]}</span>
                </p>
                <p className="text-xs mt-1">{q.explanation}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
