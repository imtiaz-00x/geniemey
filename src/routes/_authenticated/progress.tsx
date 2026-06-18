import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getDashboard } from "@/lib/study.functions";
import { Card } from "@/components/ui/card";
import { Flame, Trophy, BookOpen, Target, Loader2, Camera } from "lucide-react";

export const Route = createFileRoute("/_authenticated/progress")({
  component: ProgressPage,
});

function ProgressPage() {
  const dash = useServerFn(getDashboard);
  const q = useQuery({ queryKey: ["dashboard"], queryFn: () => dash() });

  if (q.isLoading) {
    return (
      <div className="min-h-[60vh] grid place-items-center">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  const profile = q.data?.profile;
  const sessions = q.data?.sessions ?? [];
  const attempts = q.data?.attempts ?? [];
  const homework = q.data?.homework ?? [];

  const totalScore = attempts.reduce((s, a) => s + a.score, 0);
  const totalQuestions = attempts.reduce((s, a) => s + a.total, 0);
  const accuracy = totalQuestions ? Math.round((totalScore / totalQuestions) * 100) : 0;
  const completed = sessions.filter((s) => s.completed).length;

  // Group attempts by subject
  const bySubject = new Map<string, { score: number; total: number; count: number }>();
  attempts.forEach((a) => {
    const cur = bySubject.get(a.subject) ?? { score: 0, total: 0, count: 0 };
    cur.score += a.score;
    cur.total += a.total;
    cur.count += 1;
    bySubject.set(a.subject, cur);
  });

  // Exam track breakdown
  const examAttempts = attempts.filter((a) => a.exam_track);
  const byTrack = new Map<string, { score: number; total: number; count: number }>();
  examAttempts.forEach((a) => {
    const k = a.exam_track ?? "Other";
    const cur = byTrack.get(k) ?? { score: 0, total: 0, count: 0 };
    cur.score += a.score;
    cur.total += a.total;
    cur.count += 1;
    byTrack.set(k, cur);
  });

  return (
    <div className="max-w-3xl mx-auto px-4 py-5 pb-24 space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Your progress</h1>
        <p className="text-sm text-muted-foreground">Keep that streak alive!</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat icon={Flame} label="Streak" value={`${profile?.current_streak ?? 0}d`} tint="flame" />
        <Stat icon={Trophy} label="Total XP" value={`${profile?.total_xp ?? 0}`} tint="primary" />
        <Stat icon={BookOpen} label="Topics done" value={`${completed}`} tint="math" />
        <Stat icon={Target} label="Accuracy" value={`${accuracy}%`} tint="success" />
      </div>

      <Card className="p-5 space-y-4">
        <h3 className="font-semibold">Subject mastery</h3>
        {bySubject.size === 0 ? (
          <p className="text-sm text-muted-foreground">No quizzes yet. Take one from a lesson to start tracking.</p>
        ) : (
          [...bySubject.entries()].map(([subject, s]) => (
            <MasteryBar
              key={subject}
              label={subject}
              mastery={s.total ? Math.round((s.score / s.total) * 100) : 0}
              count={s.count}
            />
          ))
        )}
      </Card>

      {byTrack.size > 0 && (
        <Card className="p-5 space-y-3">
          <h3 className="font-semibold">Competitive exam progress</h3>
          {[...byTrack.entries()].map(([track, s]) => (
            <MasteryBar
              key={track}
              label={track}
              mastery={s.total ? Math.round((s.score / s.total) * 100) : 0}
              count={s.count}
              color="var(--color-flame)"
            />
          ))}
        </Card>
      )}

      <Card className="p-5">
        <h3 className="font-semibold mb-3">Recent sessions</h3>
        {sessions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No sessions yet — start one from Learn.</p>
        ) : (
          <div className="space-y-2">
            {sessions.slice(0, 8).map((s) => (
              <div key={s.id} className="flex items-center justify-between text-sm py-1.5 border-b border-border/50 last:border-b-0 gap-2">
                <div className="min-w-0">
                  <p className="font-medium truncate">{s.topic}</p>
                  <p className="text-xs text-muted-foreground truncate">{s.subject}{s.section && s.section !== "school" ? ` · ${s.section}` : ""}</p>
                </div>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-semibold shrink-0 ${
                    s.completed ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {s.completed ? "Done" : "In progress"}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-5">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <Camera className="size-4 text-primary" /> Recent homework
        </h3>
        {homework.length === 0 ? (
          <p className="text-sm text-muted-foreground">No homework photos uploaded yet.</p>
        ) : (
          <div className="space-y-1.5">
            {homework.map((h) => (
              <div key={h.id} className="flex items-center justify-between text-sm gap-2">
                <span className="truncate">{h.title}</span>
                <span className="text-xs text-muted-foreground shrink-0">
                  {new Date(h.created_at).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function Stat({ icon: Icon, label, value, tint }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; tint: string }) {
  const colorMap: Record<string, string> = {
    flame: "var(--color-flame)",
    primary: "var(--color-primary)",
    math: "var(--color-math)",
    success: "var(--color-success)",
  };
  return (
    <Card className="p-3">
      <div className="flex items-center gap-2">
        <div className="size-8 rounded-lg grid place-items-center text-white" style={{ backgroundColor: colorMap[tint] }}>
          <Icon className="size-4" />
        </div>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
      <p className="text-2xl font-bold mt-1.5">{value}</p>
    </Card>
  );
}

function MasteryBar({ label, mastery, count, color = "var(--color-primary)" }: { label: string; mastery: number; count: number; color?: string }) {
  return (
    <div>
      <div className="flex items-center justify-between text-sm mb-1.5 gap-2">
        <span className="font-medium truncate">{label}</span>
        <span className="text-muted-foreground text-xs shrink-0">
          {count} quizzes · <span className="font-semibold text-foreground">{mastery}%</span>
        </span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${mastery}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}
