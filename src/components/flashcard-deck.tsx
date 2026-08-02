import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { StudyMarkdown } from "@/components/study-markdown";
import { RotateCcw, X } from "lucide-react";

export type Flashcard = { front: string; back: string; tag: string };

/** Leitner intervals in days, indexed by box (0 = new). */
const INTERVALS = [0, 1, 3, 7, 16, 35];

type Sched = { box: number; due: number };

function storageKey(title: string) {
  return `geniemey.flashcards.${title}`;
}

function loadSched(title: string): Record<string, Sched> {
  try {
    return JSON.parse(localStorage.getItem(storageKey(title)) ?? "{}");
  } catch {
    return {};
  }
}

function dueLabel(due: number) {
  const days = Math.round((due - Date.now()) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "tomorrow";
  return `in ${days} days`;
}

export function FlashcardDeck({
  title,
  cards,
  onClose,
}: {
  title: string;
  cards: Flashcard[];
  onClose: () => void;
}) {
  const [sched, setSched] = useState<Record<string, Sched>>({});
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  useEffect(() => {
    setSched(loadSched(title));
    setIndex(0);
    setFlipped(false);
  }, [title]);

  const queue = useMemo(() => {
    const now = Date.now();
    return cards
      .map((c, i) => ({ c, i }))
      .filter(({ c }) => (sched[c.front]?.due ?? 0) <= now);
  }, [cards, sched]);

  const current = queue[index]?.c;

  function persist(next: Record<string, Sched>) {
    setSched(next);
    try {
      localStorage.setItem(storageKey(title), JSON.stringify(next));
    } catch {
      /* storage unavailable */
    }
  }

  function rate(kind: "again" | "good" | "easy") {
    if (!current) return;
    const prev = sched[current.front]?.box ?? 0;
    const box =
      kind === "again" ? 0 : kind === "easy" ? Math.min(prev + 2, INTERVALS.length - 1) : Math.min(prev + 1, INTERVALS.length - 1);
    const due = Date.now() + INTERVALS[box]! * 86_400_000 + (box === 0 ? 60_000 : 0);
    persist({ ...sched, [current.front]: { box, due } });
    setFlipped(false);
    setIndex((v) => v + 1);
  }

  function resetDeck() {
    persist({});
    setIndex(0);
    setFlipped(false);
  }

  return (
    <div className="rounded-xl border border-border bg-background p-3 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-muted-foreground truncate">
          Flashcards · {title}
        </p>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={resetDeck}
            aria-label="Reset review schedule"
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
          >
            <RotateCcw className="size-3.5" />
          </button>
          <button
            onClick={onClose}
            aria-label="Close flashcards"
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
          >
            <X className="size-3.5" />
          </button>
        </div>
      </div>

      {!current ? (
        <div className="py-6 text-center space-y-2">
          <p className="text-sm font-medium">All caught up 🎉</p>
          <p className="text-xs text-muted-foreground">
            {cards.length} cards scheduled. Next review{" "}
            {dueLabel(Math.min(...cards.map((c) => sched[c.front]?.due ?? Date.now())))}.
          </p>
        </div>
      ) : (
        <>
          <p className="text-[11px] text-muted-foreground">
            Card {index + 1} of {queue.length} due · box {sched[current.front]?.box ?? 0}
          </p>
          <button
            type="button"
            onClick={() => setFlipped((v) => !v)}
            className="w-full min-h-32 rounded-2xl border-2 border-border bg-card p-4 text-left active:scale-[0.99] transition"
          >
            <span className="text-[10px] uppercase tracking-wide text-primary font-semibold">
              {flipped ? "Answer" : current.tag}
            </span>
            <div className="mt-1.5 text-sm">
              <StudyMarkdown collapseAt={100000}>
                {flipped ? current.back : current.front}
              </StudyMarkdown>
            </div>
            {!flipped && (
              <span className="mt-2 block text-[11px] text-muted-foreground">Tap to flip</span>
            )}
          </button>

          {flipped && (
            <div className="grid grid-cols-3 gap-2">
              <Button variant="outline" className="h-10" onClick={() => rate("again")}>
                Again
              </Button>
              <Button variant="outline" className="h-10" onClick={() => rate("good")}>
                Good
              </Button>
              <Button className="h-10" onClick={() => rate("easy")}>
                Easy
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
