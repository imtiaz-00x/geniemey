import { createFileRoute, Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  MessageCircle,
  Library,
  Camera,
  BarChart3,
  Trophy,
  Sparkles,
  ArrowLeft,
  Mail,
} from "lucide-react";
import founderAsset from "@/assets/founder.png.asset.json";

export const Route = createFileRoute("/_authenticated/about")({
  component: AboutPage,
});

const FEATURES = [
  {
    title: "AI Tutor",
    description: "Ask anything and get simple, step-by-step explanations in student-friendly language.",
    icon: MessageCircle,
    color: "var(--color-primary)",
    bg: "var(--color-primary)",
  },
  {
    title: "NCERT Library",
    description: "Browse chapters with easy AI explanations, notes, and solved examples.",
    icon: Library,
    color: "var(--color-math)",
    bg: "var(--color-math)",
  },
  {
    title: "Homework Helper",
    description: "Snap a photo of your homework and get step-by-step solutions + neat notes.",
    icon: Camera,
    color: "var(--color-success)",
    bg: "var(--color-success)",
  },
  {
    title: "Progress Tracking",
    description: "Track your streak, XP, quiz accuracy, and subject mastery over time.",
    icon: BarChart3,
    color: "var(--color-flame)",
    bg: "var(--color-flame)",
  },
  {
    title: "Competitive Exams",
    description: "Prepare for JEE, NEET, CUET, Olympiad, and more with focused tests.",
    icon: Trophy,
    color: "var(--color-science)",
    bg: "var(--color-science)",
  },
];

function AboutPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-5 pb-24 space-y-8">
      {/* Back link */}
      <div>
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition"
        >
          <ArrowLeft className="size-4" />
          Back to home
        </Link>
      </div>

      {/* 1. App Introduction */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="size-8 rounded-lg bg-primary/10 text-primary grid place-items-center">
            <Sparkles className="size-4" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">What is StudyGenie?</h1>
        </div>
        <Card className="p-5 rounded-2xl border border-border/80">
          <p className="text-[0.95rem] leading-relaxed text-foreground/90">
            StudyGenie is an AI-powered learning platform designed for students of Classes 9–12. 
            It helps students understand concepts in simple language through AI explanations, notes, 
            examples, quizzes, homework support, and progress tracking.
          </p>
        </Card>
      </section>

      {/* 2. Vision */}
      <section className="space-y-3">
        <h2 className="text-xl font-bold tracking-tight">Our Goal</h2>
        <Card className="p-5 rounded-2xl border border-border/80 bg-primary/5">
          <p className="text-[0.95rem] leading-relaxed font-medium text-foreground">
            Make learning easier, clearer, and more student-friendly.
          </p>
        </Card>
      </section>

      {/* 3. Founder & Builder */}
      <section className="space-y-3">
        <h2 className="text-xl font-bold tracking-tight">Founder & Builder</h2>
        <Card className="p-6 rounded-2xl border border-border/80 flex flex-col items-center text-center gap-4">
          <div className="relative">
            <img
              src={founderAsset.url}
              alt="Founder portrait"
              className="size-28 rounded-full object-cover border-4 border-primary/20 shadow-sm"
            />
          </div>
          <div className="space-y-1">
            <p className="text-lg font-semibold text-foreground">Your Name</p>
            <p className="text-sm font-medium text-primary">Founder & Builder</p>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto pt-1">
              Built with passion for students and simple learning.
            </p>
          </div>
        </Card>
      </section>

      {/* 4. Platform Features */}
      <section className="space-y-3">
        <h2 className="text-xl font-bold tracking-tight">Platform Features</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {FEATURES.map((f) => (
            <Card
              key={f.title}
              className="p-4 rounded-2xl border border-border/80 hover:border-primary/30 transition flex items-start gap-3"
            >
              <div
                className="size-10 rounded-xl grid place-items-center text-white shrink-0"
                style={{ backgroundColor: f.bg }}
              >
                <f.icon className="size-5" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-sm">{f.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                  {f.description}
                </p>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* 5. Version */}
      <section className="text-center pt-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Version 1.0 Beta
        </p>
      </section>

      {/* 6. Feedback Button */}
      <section className="flex justify-center pb-4">
        <a
          href="mailto:feedback@studygenie.app?subject=StudyGenie%20Feedback"
          className="inline-flex"
        >
          <Button className="rounded-full px-6 h-11 gap-2">
            <Mail className="size-4" />
            Send Feedback
          </Button>
        </a>
      </section>
    </div>
  );
}
