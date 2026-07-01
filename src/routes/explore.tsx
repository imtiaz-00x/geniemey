import { createFileRoute, Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Flame, GraduationCap, Calculator, FlaskConical, Atom, Leaf, BookOpen, Sparkles, LogIn } from "lucide-react";

export const Route = createFileRoute("/explore")({
  head: () => ({
    meta: [
      { title: "Explore StudyGenie — Free AI-powered learning" },
      { name: "description", content: "Browse Math, Science, and NCERT topics as a guest. Sign in to save your XP, streak, and progress." },
    ],
  }),
  component: ExplorePage,
});

const DEMO_SUBJECTS = [
  { name: "Mathematics", icon: Calculator, blurb: "Algebra, geometry, calculus" },
  { name: "Physics", icon: Atom, blurb: "Motion, optics, energy" },
  { name: "Chemistry", icon: FlaskConical, blurb: "Atoms, bonds, reactions" },
  { name: "Biology", icon: Leaf, blurb: "Cells, ecology, human body" },
  { name: "English", icon: BookOpen, blurb: "Grammar & writing" },
];

function ExplorePage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-30 backdrop-blur bg-background/85 border-b border-border">
        <div className="max-w-5xl mx-auto px-3 sm:px-4 h-14 flex items-center justify-between gap-2">
          <Link to="/" className="flex items-center gap-2 min-w-0">
            <div className="size-8 shrink-0 rounded-lg bg-primary text-primary-foreground grid place-items-center">
              <Flame className="size-4" />
            </div>
            <span className="font-bold tracking-tight">StudyGenie</span>
          </Link>
          <Link to="/auth">
            <Button size="sm" className="h-9">
              <LogIn className="size-4" /> Sign in
            </Button>
          </Link>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-6 space-y-6 pb-24">
        <section className="text-center py-4">
          <div className="inline-flex items-center gap-2 text-xs bg-accent/60 text-accent-foreground px-3 py-1 rounded-full">
            <GraduationCap className="size-3.5" /> Guest preview
          </div>
          <h1 className="mt-3 text-2xl sm:text-3xl font-bold tracking-tight">Explore StudyGenie</h1>
          <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
            Browse subjects and see what StudyGenie teaches.{" "}
            <span className="font-medium text-foreground">Login to save progress and XP.</span>
          </p>
        </section>

        <Card className="p-4 sm:p-5 border-primary/30 bg-primary/5 flex items-center justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <p className="font-semibold text-sm sm:text-base">Ready to start earning XP?</p>
            <p className="text-xs sm:text-sm text-muted-foreground">Create a free account in 15 seconds.</p>
          </div>
          <Link to="/auth">
            <Button className="h-10"><Sparkles className="size-4" /> Get started</Button>
          </Link>
        </Card>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Subjects</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {DEMO_SUBJECTS.map((s) => (
              <Card key={s.name} className="p-4 flex items-center gap-3">
                <div className="size-11 rounded-xl bg-primary/10 text-primary grid place-items-center shrink-0">
                  <s.icon className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{s.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{s.blurb}</p>
                </div>
                <Link to="/auth">
                  <Button size="sm" variant="ghost">Start</Button>
                </Link>
              </Card>
            ))}
          </div>
        </section>

        <section className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          {[
            { t: "AI Tutor", d: "Ask any doubt in natural language." },
            { t: "NCERT Library", d: "Chapter-wise lessons & exercises." },
            { t: "Progress + XP", d: "Streaks, badges, and daily wins." },
          ].map((f) => (
            <Card key={f.t} className="p-4">
              <p className="font-semibold text-sm">{f.t}</p>
              <p className="text-xs text-muted-foreground mt-1">{f.d}</p>
            </Card>
          ))}
        </section>
      </main>
    </div>
  );
}
