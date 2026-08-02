import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  generateQuiz,
  submitQuiz,
  generateStudyNotes,
  explainConcept,
  generateFlashcards,
  EXAM_TRACKS,
} from "@/lib/study.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StudyMarkdown } from "@/components/study-markdown";
import { FlashcardDeck, type Flashcard } from "@/components/flashcard-deck";

import {
  Loader2, Trophy, ListChecks, Layers, CheckCircle2, XCircle, RotateCcw,
  FileQuestion, AlertCircle, Search, ArrowLeft, Sparkles, BookOpen, Target,
  ClipboardList, HelpCircle, Brain, LineChart, NotebookPen, Landmark,
  Briefcase, Building2, TrainFront, Shield, Swords, Atom, Stethoscope,
  GraduationCap, School, MapPin, Plane, BookMarked, Cog, Scale, Calculator,
  MoreHorizontal,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/exams")({
  component: ExamsPage,
});

type Question = { q: string; choices: string[]; answer: number; explanation: string };

const GRADES = [9, 10, 11, 12] as const;
const SUBJECT_LIST = ["Mathematics", "Physics", "Chemistry", "Biology", "English", "General Studies", "Reasoning", "Current Affairs"] as const;

type ExamMeta = {
  name: (typeof EXAM_TRACKS)[number];
  tagline: string;
  Icon: React.ComponentType<{ className?: string }>;
  tone: string;
};

const EXAM_META: ExamMeta[] = [
  { name: "UPSC", tagline: "Civil Services Prelims & Mains", Icon: Landmark, tone: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
  { name: "SSC", tagline: "CGL, CHSL, MTS & more", Icon: Briefcase, tone: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
  { name: "Banking", tagline: "IBPS, SBI PO & Clerk", Icon: Building2, tone: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
  { name: "Railway (RRB)", tagline: "NTPC, Group D, ALP", Icon: TrainFront, tone: "bg-orange-500/10 text-orange-600 dark:text-orange-400" },
  { name: "Police Exams", tagline: "Constable & SI recruitment", Icon: Shield, tone: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400" },
  { name: "Army / Agniveer", tagline: "Agniveer, GD, Technical", Icon: Swords, tone: "bg-red-500/10 text-red-600 dark:text-red-400" },
  { name: "JEE", tagline: "Mains & Advanced for engineering", Icon: Atom, tone: "bg-violet-500/10 text-violet-600 dark:text-violet-400" },
  { name: "NEET", tagline: "Medical UG entrance", Icon: Stethoscope, tone: "bg-pink-500/10 text-pink-600 dark:text-pink-400" },
  { name: "CUET", tagline: "Central Universities entrance", Icon: GraduationCap, tone: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400" },
  { name: "CTET", tagline: "Teacher eligibility test", Icon: School, tone: "bg-teal-500/10 text-teal-600 dark:text-teal-400" },
  { name: "JKSSB", tagline: "J&K Services Selection Board", Icon: MapPin, tone: "bg-lime-500/10 text-lime-600 dark:text-lime-400" },
  { name: "JKPSC", tagline: "J&K Public Service Commission", Icon: Landmark, tone: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400" },
  { name: "NDA", tagline: "National Defence Academy", Icon: Plane, tone: "bg-sky-500/10 text-sky-600 dark:text-sky-400" },
  { name: "CDS", tagline: "Combined Defence Services", Icon: Shield, tone: "bg-slate-500/10 text-slate-600 dark:text-slate-400" },
  { name: "UGC NET", tagline: "Lectureship & JRF", Icon: BookMarked, tone: "bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400" },
  { name: "GATE", tagline: "Engineering & science PG", Icon: Cog, tone: "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400" },
  { name: "CLAT", tagline: "Law entrance (UG & PG)", Icon: Scale, tone: "bg-rose-500/10 text-rose-600 dark:text-rose-400" },
  { name: "CA Foundation", tagline: "Chartered Accountancy entry", Icon: Calculator, tone: "bg-green-500/10 text-green-600 dark:text-green-400" },
  { name: "State PSC", tagline: "State Public Service Commissions", Icon: Landmark, tone: "bg-purple-500/10 text-purple-600 dark:text-purple-400" },
];

const FEATURES = [
  { Icon: BookOpen, label: "Chapter-wise study notes" },
  { Icon: Brain, label: "Concept explanations" },
  { Icon: Target, label: "Syllabus-based prep" },
  { Icon: ClipboardList, label: "Previous year questions" },
  { Icon: ListChecks, label: "Topic-wise MCQ practice" },
  { Icon: Layers, label: "Full-length mock tests" },
  { Icon: HelpCircle, label: "Homework & doubt solving" },
  { Icon: NotebookPen, label: "Revision & summaries" },
  { Icon: Sparkles, label: "Personalized AI guidance" },
  { Icon: LineChart, label: "Progress analytics" },
];

function ExamsPage() {
  const genQ = useServerFn(generateQuiz);
  const subQ = useServerFn(submitQuiz);
  const notesFn = useServerFn(generateStudyNotes);
  const explainFn = useServerFn(explainConcept);
  const cardsFn = useServerFn(generateFlashcards);



  const [track, setTrack] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [grade, setGrade] = useState<number>(11);
  const [subject, setSubject] = useState<string>("General Studies");
  const [chapter, setChapter] = useState("");
  const [mode, setMode] = useState<"exam" | "series">("exam");
  const [concept, setConcept] = useState("");
  const [study, setStudy] = useState<{ title: string; md: string } | null>(null);
  const [deck, setDeck] = useState<{ title: string; cards: Flashcard[] } | null>(null);


  const [attempt, setAttempt] = useState<{ id: string; questions: Question[] } | null>(null);
  const [answers, setAnswers] = useState<number[]>([]);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [results, setResults] = useState<{ score: number; total: number; xp: number } | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return EXAM_META;
    return EXAM_META.filter(
      (e) => e.name.toLowerCase().includes(q) || e.tagline.toLowerCase().includes(q),
    );
  }, [query]);

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
          examTrack: track ?? undefined,
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

  const notesMut = useMutation({
    mutationFn: async () =>
      notesFn({
        data: {
          grade,
          subject,
          chapter: chapter.trim() || undefined,
          examTrack: track ?? undefined,
        },
      }),
    onSuccess: (d) =>
      setStudy({
        title: `Study Notes · ${chapter.trim() || subject}`,
        md: d.notes,
      }),
    onError: (e: Error) => toast.error(e.message),
  });

  const explainMut = useMutation({
    mutationFn: async () => {
      const c = concept.trim();
      if (!c) throw new Error("Type a concept to explain.");
      return explainFn({
        data: {
          grade,
          subject,
          chapter: chapter.trim() || undefined,
          concept: c,
          examTrack: track ?? undefined,
        },
      });
    },
    onSuccess: (d) => setStudy({ title: `Concept · ${concept.trim()}`, md: d.explanation }),
    onError: (e: Error) => toast.error(e.message),
  });

  const cardsMut = useMutation({
    mutationFn: async () => {
      if (!study) throw new Error("Generate notes or an explanation first.");
      return cardsFn({ data: { source: study.md, title: study.title } });
    },
    onSuccess: (d) => setDeck({ title: d.title, cards: d.cards as Flashcard[] }),
    onError: (e: Error) => toast.error(e.message),
  });



  function resetAttempt() {
    setAttempt(null);
    setAnswers([]);
    setResults(null);
    setStartTime(null);
  }

  function backToPicker() {
    resetAttempt();
    setTrack(null);
    setChapter("");
    setConcept("");
    setStudy(null);
    setDeck(null);

  }


  // ============ EXAM PICKER ============
  if (!track) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-5 pb-24 space-y-6">
        <div className="flex items-start gap-3">
          <div className="size-11 rounded-2xl bg-flame/15 text-flame grid place-items-center shrink-0">
            <Trophy className="size-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold leading-tight">Competitive Exams</h1>
            <p className="text-sm text-muted-foreground">
              AI-powered prep for India's top exams — notes, MCQs, mocks & doubt solving.
            </p>
          </div>
        </div>

        <div className="relative">
          <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search exams (e.g. UPSC, NEET, Banking)…"
            className="h-11 pl-9 rounded-full"
          />
        </div>

        <Card className="p-4 rounded-2xl border border-border/80">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
            What you get with every exam
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {FEATURES.map(({ Icon, label }) => (
              <div key={label} className="flex items-center gap-2 text-xs text-foreground/85">
                <span className="size-6 rounded-md bg-primary/10 text-primary grid place-items-center shrink-0">
                  <Icon className="size-3.5" />
                </span>
                {label}
              </div>
            ))}
          </div>
        </Card>

        <section className="space-y-3">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Choose your exam ({filtered.length})
          </h2>
          {filtered.length === 0 ? (
            <Card className="p-6 text-center text-sm text-muted-foreground border-dashed">
              No exams match "{query}". Try another keyword.
            </Card>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {filtered.map(({ name, tagline, Icon, tone }) => (
                <button
                  key={name}
                  onClick={() => setTrack(name)}
                  className="group text-left p-4 rounded-2xl bg-card border-2 border-border hover:border-primary/50 hover:shadow-md transition space-y-2"
                >
                  <span className={`inline-grid place-items-center size-10 rounded-xl ${tone}`}>
                    <Icon className="size-5" />
                  </span>
                  <div>
                    <p className="font-bold text-sm leading-tight">{name}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                      {tagline}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-2">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Coming soon
          </h2>
          <Card className="p-5 rounded-2xl border-dashed border-2 flex items-center gap-3">
            <span className="size-10 rounded-xl bg-muted grid place-items-center shrink-0">
              <MoreHorizontal className="size-5 text-muted-foreground" />
            </span>
            <div className="flex-1">
              <p className="font-semibold text-sm">More exams coming soon</p>
              <p className="text-xs text-muted-foreground">
                RBI Grade B, IBPS SO, AFCAT, NIFT, NID, ICAR & more. Suggest one from your profile.
              </p>
            </div>
          </Card>
        </section>
      </div>
    );
  }

  const meta = EXAM_META.find((e) => e.name === track);

  // ============ EXAM CONFIGURATOR + ATTEMPT ============
  return (
    <div className="max-w-3xl mx-auto px-4 py-5 pb-24 space-y-5">
      <button
        onClick={backToPicker}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> All exams
      </button>

      <div className="flex items-start gap-3">
        <div className={`size-11 rounded-2xl grid place-items-center shrink-0 ${meta?.tone ?? "bg-flame/15 text-flame"}`}>
          {meta ? <meta.Icon className="size-5" /> : <Trophy className="size-5" />}
        </div>
        <div>
          <h1 className="text-2xl font-bold leading-tight">{track}</h1>
          <p className="text-sm text-muted-foreground">{meta?.tagline ?? "Competitive exam prep"}</p>
        </div>
      </div>

      {!attempt && !results && (
        <>
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
              placeholder="e.g. Polity — Fundamental Rights, Quantitative Aptitude…"
              className="h-11"
            />
          </section>

          <Card className="p-4 rounded-2xl space-y-3">
            <div className="flex items-start gap-2">
              <span className="size-9 rounded-xl bg-primary/10 text-primary grid place-items-center shrink-0">
                <BookOpen className="size-4" />
              </span>
              <div>
                <p className="font-semibold text-sm leading-tight">Learn before you test</p>
                <p className="text-xs text-muted-foreground">
                  NCERT-first notes and concept explanations for {track} · Class {grade} ·{" "}
                  {subject}
                  {chapter.trim() && ` · ${chapter.trim()}`}.
                </p>
              </div>
            </div>

            <Button
              variant="secondary"
              onClick={() => notesMut.mutate()}
              disabled={notesMut.isPending}
              className="w-full h-11 rounded-full"
            >
              {notesMut.isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin mr-2" /> Writing NCERT-based notes…
                </>
              ) : (
                <>
                  <NotebookPen className="size-4 mr-2" /> Generate Study Notes
                </>
              )}
            </Button>

            <div className="flex gap-2">
              <Input
                value={concept}
                onChange={(e) => setConcept(e.target.value)}
                placeholder="Explain a concept (e.g. Ohm's Law)…"
                className="h-11"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && concept.trim()) explainMut.mutate();
                }}
              />
              <Button
                variant="outline"
                onClick={() => explainMut.mutate()}
                disabled={explainMut.isPending || !concept.trim()}
                className="h-11 rounded-full shrink-0"
              >
                {explainMut.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Brain className="size-4" />
                )}
                <span className="ml-1.5 hidden sm:inline">Explain</span>
              </Button>
            </div>

            {study && (
              <div className="rounded-xl border border-border bg-background p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-muted-foreground truncate">
                    {study.title}
                  </p>
                  <button
                    onClick={() => setStudy(null)}
                    className="text-xs text-muted-foreground hover:text-foreground shrink-0"
                  >
                    Close
                  </button>
                </div>
                <StudyMarkdown collapseAt={100000}>{study.md}</StudyMarkdown>
                <Button
                  variant="outline"
                  className="w-full h-11 rounded-xl"
                  onClick={() => cardsMut.mutate()}
                  disabled={cardsMut.isPending}
                >
                  {cardsMut.isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Layers className="size-4" />
                  )}
                  <span className="ml-1.5">Make Flashcards</span>
                </Button>
              </div>
            )}

            {deck && (
              <FlashcardDeck title={deck.title} cards={deck.cards} onClose={() => setDeck(null)} />
            )}

          </Card>


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
                <Layers className="size-4 text-primary" /> Full mock
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
              Pick a chapter and tap{" "}
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
            <Button variant="outline" onClick={resetAttempt} className="rounded-full">
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
          <div className="flex gap-2 justify-center">
            <Button variant="outline" onClick={resetAttempt} className="rounded-full">
              <RotateCcw className="size-4 mr-1.5" /> New test
            </Button>
            <Button variant="ghost" onClick={backToPicker} className="rounded-full">
              Change exam
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
