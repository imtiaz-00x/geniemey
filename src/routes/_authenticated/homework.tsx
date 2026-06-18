import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { solveHomework, listHomework, getHomework, deleteHomework } from "@/lib/homework.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Camera, Upload, Loader2, Trash2, FileText } from "lucide-react";
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
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  const listQ = useQuery({ queryKey: ["homework"], queryFn: () => list() });
  const activeQ = useQuery({
    queryKey: ["homework", activeId],
    queryFn: () => get({ data: { id: activeId! } }),
    enabled: !!activeId,
  });

  const solveMut = useMutation({
    mutationFn: async (file: File) => {
      const dataUrl = await fileToDownscaledDataUrl(file);
      return solve({ data: { imageDataUrl: dataUrl, title: file.name } });
    },
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["homework"] });
      setActiveId(r.id);
      toast.success("Solution ready!");
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
    if (f) solveMut.mutate(f);
    e.target.value = "";
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-5 pb-24 space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Homework helper</h1>
        <p className="text-sm text-muted-foreground">
          Snap a photo of your homework — AI reads the questions and explains each step.
        </p>
      </div>

      <Card className="p-4 space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <Button onClick={() => cameraRef.current?.click()} disabled={solveMut.isPending} className="h-12">
            <Camera className="size-4 mr-1.5" /> Take photo
          </Button>
          <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={solveMut.isPending} className="h-12">
            <Upload className="size-4 mr-1.5" /> Upload image
          </Button>
        </div>
        <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onPick} />
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPick} />
        {solveMut.isPending && (
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <Loader2 className="size-4 animate-spin" /> Reading your homework and writing solutions…
          </p>
        )}
      </Card>

      {activeId && activeQ.data && (
        <Card className="p-4 space-y-3">
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
          {activeQ.data.image_data_url && (
            <img
              src={activeQ.data.image_data_url}
              alt="Homework"
              className="rounded-xl max-h-64 w-auto mx-auto border border-border"
            />
          )}
          <article className="prose-study text-[0.95rem] leading-relaxed break-words">
            <StudyMarkdown>{activeQ.data.solution_md ?? ""}</StudyMarkdown>
          </article>
        </Card>
      )}

      <section className="space-y-2">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">History</h2>
        {listQ.isLoading ? (
          <Loader2 className="size-4 animate-spin text-muted-foreground" />
        ) : (listQ.data?.length ?? 0) === 0 ? (
          <p className="text-sm text-muted-foreground">No homework yet — upload your first photo above.</p>
        ) : (
          <div className="space-y-2">
            {listQ.data?.map((h) => (
              <button
                key={h.id}
                onClick={() => setActiveId(h.id)}
                className={`w-full text-left p-3 rounded-xl border-2 transition flex items-center gap-3 ${
                  activeId === h.id ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/40"
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
