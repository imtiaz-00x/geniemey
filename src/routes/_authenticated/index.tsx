import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { startSession, suggestTopics, getDashboard } from "@/lib/study.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calculator, FlaskConical, Sparkles, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/")({
  component: HomePage,
});

const SUBJECTS = [
  { id: "Math", label: "Math", icon: Calculator, color: "math" },
  { id: "Science", label: "Science", icon: FlaskConical, color: "science" },
] as const;

function HomePage() {
  const navigate = useNavigate();
  const [grade, setGrade] = useState<number>(10);
  const [subject, setSubject] = useState<"Math" | "Science">("Math");
  const [customTopic, setCustomTopic] = useState("");

  const suggest = useServerFn(suggestTopics);
  const start = useServerFn(startSession);
  const dash = useServerFn(getDashboard);

  const topicsQ = useQuery({
    queryKey: ["topics", grade, subject],
    queryFn: () => suggest({ data: { grade, subject } }),
    staleTime: 1000 * 60 * 10,
  });

  const dashboardQ = useQuery({ queryKey: ["dashboard"], queryFn: () => dash() });
  const lastSession = dashboardQ.data?.sessions?.[0];

  const startMut = useMutation({
    mutationFn: async (topic: string) => start({ data: { grade, subject, topic } }),
    onSuccess: ({ sessionId }) => navigate({ to: "/learn/$sessionId", params: { sessionId } }),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6 pb-24">
      <section>
        <h1 className="text-2xl font-bold">Hi there! What are we studying today?</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Pick a grade, subject, and topic. StudyGenie will write the lesson and a quiz for you.
        </p>
      </section>

      {lastSession && !lastSession.completed && (
        <Card
          className="p-4 flex items-center justify-between gap-3 bg-primary/5 border-primary/30 cursor-pointer hover:bg-primary/10 transition"
          onClick={() => navigate({ to: "/learn/$sessionId", params: { sessionId: lastSession.id } })}
        >
          <div>
            <p className="text-xs uppercase tracking-wide text-primary font-semibold">Continue learning</p>
            <p className="font-semibold mt-0.5">{lastSession.topic}</p>
            <p className="text-xs text-muted-foreground">{lastSession.subject}</p>
          </div>
          <ArrowRight className="size-5 text-primary" />
        </Card>
      )}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Grade</h2>
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {Array.from({ length: 12 }, (_, i) => i + 1).map((g) => (
            <button
              key={g}
              onClick={() => setGrade(g)}
              className={`shrink-0 size-12 rounded-xl font-bold text-sm transition border-2 ${
                grade === g
                  ? "bg-primary text-primary-foreground border-primary shadow-md"
                  : "bg-card border-border text-foreground hover:border-primary/50"
              }`}
            >
              {g}
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Subject</h2>
        <div className="grid grid-cols-2 gap-3">
          {SUBJECTS.map((s) => {
            const active = subject === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setSubject(s.id)}
                className={`p-4 rounded-2xl border-2 text-left transition flex items-center gap-3 ${
                  active
                    ? "border-primary bg-primary/5 shadow-md"
                    : "border-border bg-card hover:border-primary/40"
                }`}
              >
                <div
                  className="size-11 rounded-xl grid place-items-center text-white"
                  style={{
                    backgroundColor:
                      s.color === "math" ? "var(--color-math)" : "var(--color-science)",
                  }}
                >
                  <s.icon className="size-5" />
                </div>
                <div>
                  <p className="font-semibold">{s.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {s.id === "Math" ? "Algebra, calculus, trigonometry…" : "Physics, chemistry, biology…"}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Suggested topics
        </h2>
        {topicsQ.isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Picking topics for grade {grade} {subject}…
          </div>
        ) : topicsQ.isError ? (
          <p className="text-sm text-destructive">Could not load topics. Try again.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {topicsQ.data?.topics.map((t) => (
              <button
                key={t}
                disabled={startMut.isPending}
                onClick={() => startMut.mutate(t)}
                className="px-3.5 py-2 rounded-full bg-secondary border border-border text-sm font-medium hover:bg-primary hover:text-primary-foreground hover:border-primary transition disabled:opacity-50"
              >
                {t}
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Or type any topic
        </h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (customTopic.trim()) startMut.mutate(customTopic.trim());
          }}
          className="flex gap-2"
        >
          <Input
            placeholder="e.g. Photosynthesis, Quadratic equations"
            value={customTopic}
            onChange={(e) => setCustomTopic(e.target.value)}
            className="h-11"
          />
          <Button type="submit" disabled={startMut.isPending || !customTopic.trim()} className="h-11">
            {startMut.isPending ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            <span className="ml-1.5">Start</span>
          </Button>
        </form>
      </section>
    </div>
  );
}
