import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  solveHomework,
  listHomework,
  getHomework,
  deleteHomework,
  askHomeworkQuestion,
  followUpHomework,
} from "@/lib/homework.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Camera,
  Upload,
  Loader2,
  Trash2,
  FileText,
  MessageCircleQuestion,
  Send,
  HelpCircle,
  Sparkles,
} from "lucide-react";
import { StudyMarkdown } from "@/components/study-markdown";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/homework")({
  component: HomeworkPage,
});

async function fileToDownscaledDataUrl(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const max = 1024;
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");
  ctx.drawImage(bitmap, 0, 0, w, h);
  return canvas.toDataURL("image/jpeg", 0.82);
}

function HomeworkPage() {
  const qc = useQueryClient();
  const list = useServerFn(listHomework);
  const get = useServerFn(getHomework);
  const solve = useServerFn(solveHomework);
  const del = useServerFn(deleteHomework);
  const ask = useServerFn(askHomeworkQuestion);
  const followUp = useServerFn(followUpHomework);

  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState("camera");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [question, setQuestion] = useState("");
  const [followText, setFollowText] = useState("");
  const [imgQuestion, setImgQuestion] = useState("");

  const listQ = useQuery({ queryKey: ["homework"], queryFn: () => list() });
  const activeQ = useQuery({
    queryKey: ["homework", activeId],
    queryFn: () => get({ data: { id: activeId! } }),
    enabled: !!activeId,
  });

  const solveMut = useMutation({
    mutationFn: async ({ file, extra }: { file: File; extra?: string }) => {
      const dataUrl = await fileToDownscaledDataUrl(file);
      const title = extra?.trim() ? extra.trim().slice(0, 80) : file.name;
      return solve({ data: { imageDataUrl: dataUrl, title } });
    },
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["homework"] });
      setActiveId(r.id);
      setImgQuestion("");
      toast.success("Solution ready!");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const askMut = useMutation({
    mutationFn: (q: string) => ask({ data: { question: q } }),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["homework"] });
      setActiveId(r.id);
      setQuestion("");
      toast.success("Answer ready!");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const followMut = useMutation({
    mutationFn: (vars: { question: string; simpler?: boolean }) =>
      followUp({ data: { id: activeId!, ...vars } }),
    onSuccess: () => {
      setFollowText("");
      qc.invalidateQueries({ queryKey: ["homework", activeId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["homework"] });
      setActiveId(null);
    },
  });

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) solveMut.mutate({ file: f, extra: imgQuestion });
    e.target.value = "";
  }

  const busy = solveMut.isPending || askMut.isPending;
  const isTextOnly = activeQ.data?.image_data_url?.startsWith("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB");

  return (
    <div className="max-w-3xl mx-auto px-4 py-5 pb-24 space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Homework helper</h1>
        <p className="text-sm text-muted-foreground">
          Snap a photo, upload an image, or just type your question — AI explains step by step.
        </p>
      </div>

      <Card className="p-3 rounded-2xl">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="w-full grid grid-cols-3 h-10 rounded-full">
            <TabsTrigger value="camera" className="rounded-full text-xs sm:text-sm">
              <Camera className="size-3.5 sm:mr-1.5" />
              <span className="hidden sm:inline">Camera</span>
            </TabsTrigger>
            <TabsTrigger value="upload" className="rounded-full text-xs sm:text-sm">
              <Upload className="size-3.5 sm:mr-1.5" />
              <span className="hidden sm:inline">Upload</span>
            </TabsTrigger>
            <TabsTrigger value="ask" className="rounded-full text-xs sm:text-sm">
              <MessageCircleQuestion className="size-3.5 sm:mr-1.5" />
              <span className="hidden sm:inline">Ask</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="camera" className="space-y-3 pt-3">
            <Button
              onClick={() => cameraRef.current?.click()}
              disabled={busy}
              className="w-full h-12 rounded-full"
            >
              <Camera className="size-4 mr-1.5" /> Take photo
            </Button>
            <Textarea
              value={imgQuestion}
              onChange={(e) => setImgQuestion(e.target.value)}
              placeholder="(Optional) Add a note or question about the photo…"
              className="min-h-[70px] rounded-2xl"
            />
            <input
              ref={cameraRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={onPick}
            />
          </TabsContent>

          <TabsContent value="upload" className="space-y-3 pt-3">
            <Button
              variant="outline"
              onClick={() => fileRef.current?.click()}
              disabled={busy}
              className="w-full h-12 rounded-full"
            >
              <Upload className="size-4 mr-1.5" /> Upload image
            </Button>
            <Textarea
              value={imgQuestion}
              onChange={(e) => setImgQuestion(e.target.value)}
              placeholder="(Optional) Add a note or question about the image…"
              className="min-h-[70px] rounded-2xl"
            />
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPick} />
          </TabsContent>

          <TabsContent value="ask" className="space-y-3 pt-3">
            <Textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Type your question — e.g. Explain Newton's second law with an example"
              className="min-h-[110px] rounded-2xl"
            />
            <Button
              onClick={() => question.trim() && askMut.mutate(question.trim())}
              disabled={busy || !question.trim()}
              className="w-full h-12 rounded-full"
            >
              {askMut.isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin mr-2" /> Thinking…
                </>
              ) : (
                <>
                  <Sparkles className="size-4 mr-1.5" /> Ask GenieMey
                </>
              )}
            </Button>
          </TabsContent>
        </Tabs>

        {busy && (
          <p className="text-sm text-muted-foreground flex items-center gap-2 mt-3">
            <Loader2 className="size-4 animate-spin" /> Working on your answer…
          </p>
        )}
      </Card>

      {activeId && activeQ.data && (
        <Card className="p-4 space-y-3 rounded-2xl">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-semibold truncate">{activeQ.data.title}</p>
              <p className="text-xs text-muted-foreground">
                {new Date(activeQ.data.created_at).toLocaleString()}
              </p>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                if (confirm("Delete this homework?")) delMut.mutate(activeId);
              }}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
          {activeQ.data.image_data_url && !isTextOnly && (
            <img
              src={activeQ.data.image_data_url}
              alt="Homework"
              className="rounded-xl max-h-64 w-auto mx-auto border border-border"
            />
          )}
          <article className="prose-study text-[0.95rem] leading-relaxed break-words">
            <StudyMarkdown>{activeQ.data.solution_md ?? ""}</StudyMarkdown>
          </article>

          {/* Follow-up chat */}
          <div className="pt-3 border-t border-border space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Follow up
            </p>
            <div className="flex gap-2">
              <Textarea
                value={followText}
                onChange={(e) => setFollowText(e.target.value)}
                placeholder="Ask a follow-up question…"
                className="min-h-[60px] rounded-2xl"
              />
              <Button
                onClick={() => followText.trim() && followMut.mutate({ question: followText.trim() })}
                disabled={followMut.isPending || !followText.trim()}
                className="h-auto rounded-full px-4"
              >
                {followMut.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Send className="size-4" />
                )}
              </Button>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                followMut.mutate({
                  question: "I still don't understand. Please explain even more simply.",
                  simpler: true,
                })
              }
              disabled={followMut.isPending}
              className="rounded-full"
            >
              <HelpCircle className="size-4 mr-1.5" />
              I still don't understand
            </Button>
          </div>
        </Card>
      )}

      <section className="space-y-2">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          History
        </h2>
        {listQ.isLoading ? (
          <Loader2 className="size-4 animate-spin text-muted-foreground" />
        ) : (listQ.data?.length ?? 0) === 0 ? (
          <p className="text-sm text-muted-foreground">
            No homework yet — upload a photo or ask a question above.
          </p>
        ) : (
          <div className="space-y-2">
            {listQ.data?.map((h) => (
              <button
                key={h.id}
                onClick={() => setActiveId(h.id)}
                className={`w-full text-left p-3 rounded-xl border-2 transition flex items-center gap-3 ${
                  activeId === h.id
                    ? "border-primary bg-primary/5"
                    : "border-border bg-card hover:border-primary/40"
                }`}
              >
                <div className="size-9 rounded-lg bg-primary/10 text-primary grid place-items-center shrink-0">
                  <FileText className="size-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{h.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(h.created_at).toLocaleDateString()}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
