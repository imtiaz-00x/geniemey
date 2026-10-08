import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { startSession, suggestTopics, getDashboard, SUBJECTS, SOCIAL_BRANCHES } from "@/lib/study.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Calculator, FlaskConical, Atom, Leaf, BookOpen, Globe2, Landmark,
  Sparkles, ArrowRight, Loader2, Library, FolderOpen,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/")({
  component: HomePage,
});

const GRADES = [9, 10, 11, 12] as const;

const SUBJECT_META: Record<string, { icon: React.ComponentType<{ className?: string }>; color: string; blurb: string }> = {
  Mathematics: { icon: Calculator, color: "oklch(0.6 0.16 250)", blurb: "Algebra, calculus, trig" },
  Physics: { icon: Atom, color: "oklch(0.62 0.17 220)", blurb: "Motion, optics, electricity" },
  Chemistry: { icon: FlaskConical, color: "oklch(0.62 0.15 155)", blurb: "Atoms, reactions, organic" },
  Biology: { icon: Leaf, color: "oklch(0.62 0.15 145)", blurb: "Life, cells, ecology" },
  English: { icon: BookOpen, color: "oklch(0.6 0.13 305)", blurb: "Grammar, prose, writing" },
  EVS: { icon: Globe2, color: "oklch(0.62 0.14 175)", blurb: "Environment & studies" },
  "Social Studies": { icon: Landmark, color: "oklch(0.6 0.16 50)", blurb: "History, civics, geo…" },
};

function greetingFor(name?: string | null) {
  const hour = new Date().getHours();
  const who = (name && name.trim()) || "there";
  if (hour < 12) return { title: `Good Morning, ${who} ☀️`, emoji: "☀️" };
  if (hour < 17) return { title: `Good Afternoon, ${who}`, emoji: "" };
  return { title: `Good Evening, ${who} 🌙`, emoji: "🌙" };
}

function HomePage() {
  const navigate = useNavigate();
  const [grade, setGrade] = useState<number>(10);
  const [subject, setSubject] = useState<string>("Mathematics");
  const [subBranch, setSubBranch] = useState<string | null>(null);
  const [customTopic, setCustomTopic] = useState("");

  const suggest = useServerFn(suggestTopics);
  const start = useServerFn(startSession);
  const dash = useServerFn(getDashboard);

  const isSocial = subject === "Social Studies";
  const effectiveSub = isSocial ? subBranch ?? undefined : undefined;
  const topicReady = !isSocial || !!subBranch;

  const topicsQ = useQuery({
    queryKey: ["topics", grade, subject, effectiveSub],
    queryFn: () => suggest({ data: { grade, subject, subSubject: effectiveSub } }),
    enabled: topicReady,
    staleTime: 1000 * 60 * 10,
  });

  const dashboardQ = useQuery({ queryKey: ["dashboard"], queryFn: () => dash() });
  const lastSession = dashboardQ.data?.sessions?.[0];
  const profile = dashboardQ.data?.profile;
  const firstName = (profile?.display_name ?? "").split(" ")[0] || null;
  const greeting = greetingFor(firstName);

  const startMut = useMutation({
    mutationFn: async (topic: string) =>
      start({ data: { grade, subject, subSubject: effectiveSub, topic } }),
    onSuccess: ({ sessionId }) => navigate({ to: "/learn/$sessionId", params: { sessionId } }),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="max-w-5xl mx-auto px-4 py-5 space-y-6 pb-24">
      <section>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {greeting.title}
        </p>

        <h1 className="text-2xl sm:text-3xl font-bold mt-1">
          Hi {firstName ?? "there"} <span aria-hidden>👋</span>
        </h1>

        <p className="text-muted-foreground text-sm mt-1">
          What are we studying today?
        </p>

        <div className="mt-2 flex items-center gap-3 text-sm text-muted-foreground">
          <span className="font-semibold text-primary">
            {profile?.total_xp ?? 0} XP
          </span>

          <span aria-hidden>•</span>

          <span>
            {profile?.current_streak ?? 0} Day Streak{" "}
            <span aria-hidden>🔥</span>
          </span>
        </div>
      </section>

      {lastSession && !lastSession.completed && (
        <Card
          className="p-4 flex items-center justify-between gap-3 bg-primary/5 border-primary/30 cursor-pointer hover:bg-primary/10 transition"
          onClick={() =>
            navigate({
              to: "/learn/$sessionId",
              params: { sessionId: lastSession.id },
            })
          }
        >
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wide text-primary font-semibold">
              Continue learning
            </p>

            <p className="font-semibold mt-0.5 truncate">
              {lastSession.topic}
            </p>

            <p className="text-xs text-muted-foreground">
              {lastSession.subject}
            </p>
          </div>

          <ArrowRight className="size-5 text-primary shrink-0" />
        </Card>
      )}

      {/* Quick access */}
      <div className="grid sm:grid-cols-3 gap-3">
        <Link to="/ncert" className="block">
          <Card className="p-4 h-full hover:border-primary/50 transition flex items-center gap-3">
            <div className="size-11 rounded-xl bg-primary/10 text-primary grid place-items-center shrink-0">
              <Library className="size-5" />
            </div>

            <div className="min-w-0">
              <p className="font-semibold">NCERT Library</p>

              <p className="text-xs text-muted-foreground">
                Browse chapters with easy AI explanations
              </p>
            </div>
          </Card>
        </Link>

        <Link to="/exams" className="block">
          <Card className="p-4 h-full hover:border-primary/50 transition flex items-center gap-3">
            <div className="size-11 rounded-xl bg-flame/15 text-flame grid place-items-center shrink-0">
              <Sparkles className="size-5" />
            </div>

            <div className="min-w-0">
              <p className="font-semibold">Competitive Exams</p>

              <p className="text-xs text-muted-foreground">
                JEE · NEET · CUET · Olympiad — tests & series
              </p>
            </div>
          </Card>
        </Link>

        <Link to="/materials" className="block">
          <Card className="p-4 h-full hover:border-primary/50 transition flex items-center gap-3">
            <div className="size-11 rounded-xl bg-primary/10 text-primary grid place-items-center shrink-0">
              <FolderOpen className="size-5" />
            </div>

            <div className="min-w-0">
              <p className="font-semibold">My Materials</p>

              <p className="text-xs text-muted-foreground">
                PDFs, notes, question papers & study files
              </p>
            </div>
          </Card>
        </Link>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Class
        </h2>

        <div className="grid grid-cols-4 gap-2">
          {GRADES.map((g) => (
            <button
              key={g}
              onClick={() => setGrade(g)}
              className={`h-14 rounded-2xl font-bold transition border-2 ${
                grade === g
                  ? "bg-primary text-primary-foreground border-primary shadow-md"
                  : "bg-card border-border text-foreground hover:border-primary/50"
              }`}
            >
              <span className="block text-[10px] uppercase tracking-wider opacity-70">
                Class
              </span>

              <span className="block text-lg leading-none">
                {g}
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Subject
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {SUBJECTS.map((s) => {
            const meta = SUBJECT_META[s];
            const Icon = meta.icon;
            const active = subject === s;

            return (
              <button
                key={s}
                onClick={() => {
                  setSubject(s);
                  setSubBranch(null);
                }}
                className={`p-3 rounded-2xl border-2 text-left transition flex items-center gap-2.5 ${
                  active
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-border bg-card hover:border-primary/40"
                }`}
              >
                <div
                  className="size-10 rounded-xl grid place-items-center text-white shrink-0"
                  style={{ backgroundColor: meta.color }}
                >
                  <Icon className="size-5" />
                </div>

                <div className="min-w-0">
                  <p className="font-semibold text-sm truncate">
                    {s}
                  </p>

                  <p className="text-[11px] text-muted-foreground truncate">
                    {meta.blurb}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {isSocial && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Pick a Social Studies branch
          </h2>

          <div className="flex flex-wrap gap-2">
            {SOCIAL_BRANCHES.map((b) => (
              <button
                key={b}
                onClick={() => setSubBranch(b)}
                className={`px-3.5 py-2 rounded-full border-2 text-sm font-medium transition ${
                  subBranch === b
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card border-border hover:border-primary/40"
                }`}
              >
                {b}
              </button>
            ))}
          </div>
        </section>
      )}

      {topicReady && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Suggested topics
          </h2>

          {topicsQ.isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />

              Picking topics for Class {grade}{" "}
              {effectiveSub ?? subject}…
            </div>
          ) : topicsQ.isError ? (
            <p className="text-sm text-destructive">
              Could not load topics. Try again.
            </p>
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
      )}

      {topicReady && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Or type any topic
          </h2>

          <form
            onSubmit={(e) => {
              e.preventDefault();

              if (customTopic.trim()) {
                startMut.mutate(customTopic.trim());
              }
            }}
            className="flex gap-2"
          >
            <Input
              placeholder="e.g. Photosynthesis, Quadratic equations"
              value={customTopic}
              onChange={(e) => setCustomTopic(e.target.value)}
              className="h-11"
            />

            <Button
              type="submit"
              disabled={startMut.isPending || !customTopic.trim()}
              className="h-11"
            >
              {startMut.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Sparkles className="size-4" />
              )}

              <span className="ml-1.5">Start</span>
            </Button>
          </form>
        </section>
      )}
    </div>
  );
}