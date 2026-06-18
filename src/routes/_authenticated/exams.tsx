import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { suggestTopics, startSession, generateQuiz, EXAM_TRACKS } from "@/lib/study.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Trophy, Sparkles, ListChecks, Layers } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/exams")({
  component: ExamsPage,
});

const GRADES = [9, 10, 11, 12] as const;

const TRACK_SUBJECT: Record<string, string> = {
  JEE: "Physics",
  NEET: "Biology",
  CUET: "Mathematics",
  Olympiad: "Mathematics",
  NTSE: "Mathematics",
  Foundation: "Mathematics",
};

function ExamsPage() {
  const navigate = useNavigate();
  const [track, setTrack] = useState<string>("JEE");
  const [grade, setGrade] = useState<number>(11);
  const [customTopic, setCustomTopic] = useState("");

  const suggest = useServerFn(suggestTopics);
  const start = useServerFn(startSession);
  const genQ = useServerFn(generateQuiz);

  const subject = TRACK_SUBJECT[track] ?? "Mathematics";

  const topicsQ = useQuery({
    queryKey: ["exam-topics", track, grade, subject],
    queryFn: () => suggest({ data: { grade, subject, subSubject: `${track} preparation` } }),
    staleTime: 1000 * 60 * 10,
  });

  const startMut = useMutation({
    mutationFn: (topic: string) =>
      start({ data: { grade, subject, topic, section: "exam", examTrack: track } }),
    onSuccess: ({ sessionId }) => navigate({ to: "/learn/$sessionId", params: { sessionId } }),
    onError: (e: Error) => toast.error(e.message),
  });

  const testMut = useMutation({
    mutationFn: async (mode: "exam" | "series") => {
      const topic = customTopic.trim() || (topicsQ.data?.topics[0] ?? "Mixed");
      const session = await start({
        data: { grade, subject, topic, section: "exam", examTrack: track },
      });
      await genQ({
        data: {
          sessionId: session.sessionId,
          grade,
          subject,
          topic: mode === "series" ? `${track} mixed test series` : topic,
          count: mode === "series" ? 15 : 10,
          mode,
          examTrack: track,
        },
      });
      return session.sessionId;
    },
    onSuccess: (sessionId) => navigate({ to: "/learn/$sessionId", params: { sessionId } }),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="max-w-3xl mx-auto px-4 py-5 pb-24 space-y-5">
      <div className="flex items-start gap-3">
        <div className="size-10 rounded-xl bg-flame/15 text-flame grid place-items-center shrink-0">
          <Trophy className="size-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold leading-tight">Competitive Exams</h1>
          <p className="text-sm text-muted-foreground">
            Separate space for JEE, NEET, CUET and more — topics, easy explanations, solved examples, practice, chapter tests, and test series.
          </p>
        </div>
      </div>

      <section className="space-y-2">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Exam track</h2>
        <div className="flex flex-wrap gap-2">
          {EXAM_TRACKS.map((t) => (
            <button
              key={t}
              onClick={() => setTrack(t)}
              className={`px-3.5 py-2 rounded-full border-2 text-sm font-semibold transition ${
                track === t ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border hover:border-primary/40"
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
                grade === g ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border hover:border-primary/40"
              }`}
            >
              Class {g}
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Hot topics · {track}
        </h2>
        {topicsQ.isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Loading topics…
          </div>
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
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Or type any topic</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (customTopic.trim()) startMut.mutate(customTopic.trim());
          }}
          className="flex gap-2"
        >
          <Input
            placeholder="e.g. Rotational motion, Genetics, Permutations…"
            value={customTopic}
            onChange={(e) => setCustomTopic(e.target.value)}
            className="h-11"
          />
          <Button type="submit" disabled={startMut.isPending || !customTopic.trim()} className="h-11">
            {startMut.isPending ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            <span className="ml-1.5">Learn</span>
          </Button>
        </form>
      </section>

      <section className="grid sm:grid-cols-2 gap-3">
        <Card className="p-4 space-y-2">
          <div className="flex items-center gap-2 font-semibold">
            <ListChecks className="size-4 text-primary" /> Chapter test
          </div>
          <p className="text-xs text-muted-foreground">10 exam-style MCQs from the topic above.</p>
          <Button size="sm" onClick={() => testMut.mutate("exam")} disabled={testMut.isPending} className="w-full">
            {testMut.isPending ? <Loader2 className="size-4 animate-spin" /> : "Start chapter test"}
          </Button>
        </Card>
        <Card className="p-4 space-y-2">
          <div className="flex items-center gap-2 font-semibold">
            <Layers className="size-4 text-primary" /> Test series
          </div>
          <p className="text-xs text-muted-foreground">15 mixed questions across the {track} syllabus.</p>
          <Button size="sm" variant="outline" onClick={() => testMut.mutate("series")} disabled={testMut.isPending} className="w-full">
            {testMut.isPending ? <Loader2 className="size-4 animate-spin" /> : "Start test series"}
          </Button>
        </Card>
      </section>
    </div>
  );
}
