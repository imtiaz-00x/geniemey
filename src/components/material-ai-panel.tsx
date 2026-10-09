import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { generateFromMaterial } from "@/lib/ai-materials.functions";
import { Button } from "@/components/ui/button";
import { Loader2, X } from "lucide-react";
import { toast } from "sonner";

type Action = "analyze" | "notes" | "flashcards" | "quiz";
type Flashcard = { front: string; back: string };
type QuizQ = {
  question: string;
  options: string[];
  answerIndex: number;
  explanation?: string;
};

const LABELS: Record<Action, string> = {
  analyze: "Analyze",
  notes: "Notes",
  flashcards: "Flashcards",
  quiz: "Quiz",
};

export function MaterialAiPanel({
  materialId,
  title,
  onClose,
}: {
  materialId: string;
  title: string;
  onClose: () => void;
}) {
  const run = useServerFn(generateFromMaterial);

  const [action, setAction] = useState<Action | null>(null);
  const [text, setText] = useState("");
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [questions, setQuestions] = useState<QuizQ[]>([]);
  const [flipped, setFlipped] = useState<Record<number, boolean>>({});
  const [picked, setPicked] = useState<Record<number, number>>({});

  const mut = useMutation({
    mutationFn: (a: Action) => run({ data: { id: materialId, action: a } }),
    onSuccess: (res, a) => {
      if ("items" in res && Array.isArray(res.items)) {
        if (a === "flashcards") setCards(res.items as Flashcard[]);
        else setQuestions(res.items as QuizQ[]);
      } else if ("text" in res) {
        setText(res.text);
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function start(a: Action) {
    setAction(a);
    setText("");
    setCards([]);
    setQuestions([]);
    setFlipped({});
    setPicked({});
    mut.mutate(a);
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center">
      <div className="bg-background w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl p-4 space-y-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 className="font-semibold truncate">{title}</h2>
            <p className="text-xs text-muted-foreground">
              Choose what GenieMey should create
            </p>
          </div>
          <Button size="sm" variant="ghost" onClick={onClose}>
            <X className="size-4" />
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {(Object.keys(LABELS) as Action[]).map((a) => (
            <Button
              key={a}
              variant={action === a ? "default" : "outline"}
              className="rounded-full"
              disabled={mut.isPending}
              onClick={() => start(a)}
            >
              {LABELS[a]}
            </Button>
          ))}
        </div>

        {mut.isPending && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            GenieMey is working on it…
          </div>
        )}

        {text && (
          <div className="text-sm whitespace-pre-wrap leading-relaxed">
            {text}
          </div>
        )}

        {cards.length > 0 && (
          <div className="space-y-2">
            {cards.map((c, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setFlipped((f) => ({ ...f, [i]: !f[i] }))}
                className="w-full text-left rounded-xl border-2 border-border p-3 hover:border-primary/40 transition"
              >
                <p className="text-[11px] uppercase text-muted-foreground mb-1">
                  {flipped[i] ? "Answer" : "Question (tap to flip)"}
                </p>
                <p className="text-sm font-medium">
                  {flipped[i] ? c.back : c.front}
                </p>
              </button>
            ))}
          </div>
        )}

        {questions.length > 0 && (
          <div className="space-y-4">
            {questions.map((q, qi) => (
              <div key={qi} className="space-y-2">
                <p className="text-sm font-medium">
                  {qi + 1}. {q.question}
                </p>
                {q.options.map((opt, oi) => {
                  const chosen = picked[qi];
                  const answered = chosen !== undefined;
                  let style = "border-border";
                  if (answered && oi === q.answerIndex)
                    style = "border-green-500 bg-green-500/10";
                  else if (answered && oi === chosen)
                    style = "border-red-500 bg-red-500/10";
                  return (
                    <button
                      key={oi}
                      type="button"
                      disabled={answered}
                      onClick={() => setPicked((p) => ({ ...p, [qi]: oi }))}
                      className={`w-full text-left rounded-xl border-2 p-2.5 text-sm ${style}`}
                    >
                      {opt}
                    </button>
                  );
                })}
                {picked[qi] !== undefined && q.explanation && (
                  <p className="text-xs text-muted-foreground">
                    {q.explanation}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}