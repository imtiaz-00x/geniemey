import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listNcertChapters, startSession, SUBJECTS } from "@/lib/study.functions";
import { Card } from "@/components/ui/card";
import { Loader2, Library, ChevronRight } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/ncert")({
  component: NcertPage,
});

const GRADES = [9, 10, 11, 12] as const;
const NCERT_SUBJECTS = SUBJECTS.filter((s) => s !== "EVS");

function NcertPage() {
  const navigate = useNavigate();
  const [grade, setGrade] = useState<number>(10);
  const [subject, setSubject] = useState<string>("Mathematics");

  const listC = useServerFn(listNcertChapters);
  const start = useServerFn(startSession);

  const chaptersQ = useQuery({
    queryKey: ["ncert-chapters", grade, subject],
    queryFn: () => listC({ data: { grade, subject } }),
    staleTime: 1000 * 60 * 30,
  });

  const startMut = useMutation({
    mutationFn: (chapterTitle: string) =>
      start({ data: { grade, subject, topic: chapterTitle, section: "ncert" } }),
    onSuccess: ({ sessionId }) => navigate({ to: "/learn/$sessionId", params: { sessionId } }),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="max-w-3xl mx-auto px-4 py-5 pb-24 space-y-5">
      <div className="flex items-start gap-3">
        <div className="size-10 rounded-xl bg-primary/10 text-primary grid place-items-center shrink-0">
          <Library className="size-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold leading-tight">NCERT Library</h1>
          <p className="text-sm text-muted-foreground">Pick a class and subject. We'll show NCERT chapters with easy AI explanations, notes, examples, and important Q&amp;A.</p>
        </div>
      </div>

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
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Subject</h2>
        <div className="flex flex-wrap gap-2">
          {NCERT_SUBJECTS.map((s) => (
            <button
              key={s}
              onClick={() => setSubject(s)}
              className={`px-3.5 py-2 rounded-full border-2 text-sm font-medium transition ${
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
          Chapters · Class {grade} {subject}
        </h2>
        {chaptersQ.isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Loading chapters…
          </div>
        ) : chaptersQ.isError ? (
          <p className="text-sm text-destructive">Could not load chapters.</p>
        ) : (
          <div className="space-y-2">
            {chaptersQ.data?.chapters.map((c) => (
              <button
                key={`${c.number}-${c.title}`}
                disabled={startMut.isPending}
                onClick={() => startMut.mutate(`Chapter ${c.number}: ${c.title}`)}
                className="w-full text-left disabled:opacity-50"
              >
                <Card className="p-3.5 flex items-center gap-3 hover:border-primary/50 transition">
                  <div className="size-9 rounded-lg bg-secondary text-foreground/70 grid place-items-center text-sm font-bold shrink-0">
                    {c.number}
                  </div>
                  <p className="flex-1 font-medium text-sm">{c.title}</p>
                  {startMut.isPending ? (
                    <Loader2 className="size-4 animate-spin text-primary shrink-0" />
                  ) : (
                    <ChevronRight className="size-4 text-muted-foreground shrink-0" />
                  )}
                </Card>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
