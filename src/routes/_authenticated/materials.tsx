import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  listMaterials, createMaterial, deleteMaterial, getMaterialDownloadUrl,
} from "@/lib/materials.functions";
import { supabase } from "@/integrations/supabase/client";
import { MaterialAiPanel } from "@/components/material-ai-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  BookOpen, Upload, Search, FileText, Image, Presentation,
  Sparkles, Trash2, ExternalLink, Loader2, X,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/materials")({
  component: MaterialsPage,
});

function MaterialsPage() {
  const qc = useQueryClient();
  const list = useServerFn(listMaterials);
  const create = useServerFn(createMaterial);
  const del = useServerFn(deleteMaterial);
  const download = useServerFn(getMaterialDownloadUrl);
  const fileRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [ai, setAi] = useState<{ id: string; title: string } | null>(null);

  const query = useQuery({
    queryKey: ["materials"],
    queryFn: () => list(),
  });

  const materials = query.data?.materials ?? [];
  const visible = useMemo(() => materials.filter((m) => {
    const name = `${m.title} ${m.file_name ?? ""}`.toLowerCase();
    const ext = (m.file_name ?? "").toLowerCase();
    const kind = m.material_type === "pdf" || ext.endsWith(".pdf")
      ? "pdf"
      : m.material_type === "image" || (m.mime_type ?? "").startsWith("image/")
        ? "image" : "document";
    return name.includes(search.toLowerCase()) &&
      (filter === "all" || filter === kind);
  }), [materials, search, filter]);

  const upload = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("Choose a file first.");
      if (file.size > 50 * 1024 * 1024)
        throw new Error("File must be smaller than 50 MB.");

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Please sign in again.");

      const path = `${user.id}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const { error } = await supabase.storage.from("materials").upload(path, file, {
        contentType: file.type || "application/octet-stream",
      });
      if (error) throw new Error(error.message);

      try {
        return await create({ data: {
          title: title.trim() || file.name.replace(/\.[^.]+$/, ""),
          materialType: file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")
            ? "pdf"
            : file.type.startsWith("image/") ? "image"
            : file.name.match(/\.pptx?$/i) ? "ppt" : "document",
          fileName: file.name,
          filePath: path,
          fileSize: file.size,
          mimeType: file.type || undefined,
          sourceType: "upload",
        } });
      } catch (e) {
        await supabase.storage.from("materials").remove([path]);
        throw e;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["materials"] });
      setFile(null); setTitle(""); setUploadOpen(false);
      if (fileRef.current) fileRef.current.value = "";
      toast.success("Material uploaded!");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["materials"] });
      toast.success("Material deleted.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const open = useMutation({
    mutationFn: async (id: string) => {
      const result = await download({ data: { id } });
      window.open(result.url, "_blank", "noopener,noreferrer");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <main className="min-h-screen bg-[#FFF8F1] text-[#30231F]">
      <div className="mx-auto max-w-3xl space-y-5 px-4 py-6 pb-28">
        <header className="flex items-center gap-3">
          <div className="grid size-12 place-items-center rounded-2xl bg-[#FCE6DC] text-[#DE6047]">
            <BookOpen className="size-6" />
          </div>
          <div>
            <p className="text-xs font-semibold tracking-widest text-[#C66B55]">GENIEMEY STUDY SPACE</p>
            <h1 className="text-2xl font-bold">My Materials</h1>
            <p className="text-sm text-[#84736A]">Your study files, all in one place.</p>
          </div>
        </header>

        <section className="rounded-3xl bg-gradient-to-br from-[#F9DFD0] to-[#F6CDBD] p-5">
          <div className="mb-3 flex size-10 items-center justify-center rounded-xl bg-white/60 text-[#D95E46]">
            <Sparkles className="size-5" />
          </div>
          <h2 className="text-xl font-bold">Study smarter with AI</h2>
          <p className="mt-1 text-sm text-[#76594F]">
            Turn your material into notes, flashcards and quizzes.
          </p>
          <Button className="mt-4 rounded-full bg-[#E76148] text-white hover:bg-[#CF5039]"
            onClick={() => setUploadOpen(!uploadOpen)}>
            <Upload className="mr-2 size-4" /> Upload material
          </Button>
        </section>

        {uploadOpen && (
          <Card className="space-y-3 rounded-2xl border-[#EFE0D6] bg-white p-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold">Add a study file</h2>
              <Button variant="ghost" size="sm" onClick={() => setUploadOpen(false)}>
                <X className="size-4" />
              </Button>
            </div>
            <input ref={fileRef} type="file"
              accept=".pdf,.ppt,.pptx,.doc,.docx,.txt,image/*"
              className="block w-full text-sm"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                setFile(f);
                if (f && !title) setTitle(f.name.replace(/\.[^.]+$/, ""));
              }} />
            {file && <p className="break-all text-xs text-[#89776E]">{file.name}</p>}
            <Input value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder="Material title" />
            <Button className="w-full rounded-full bg-[#E76148] text-white hover:bg-[#CF5039]"
              disabled={!file || upload.isPending} onClick={() => upload.mutate()}>
              {upload.isPending
                ? <><Loader2 className="mr-2 size-4 animate-spin" />Uploading…</>
                : "Add to library"}
            </Button>
          </Card>
        )}

        <section className="grid grid-cols-2 gap-3">
          <Card className="rounded-2xl border-[#EFE0D6] bg-white p-4">
            <FileText className="mb-2 size-5 text-[#D95E46]" />
            <p className="text-2xl font-bold">{materials.length}</p>
            <p className="text-xs text-[#89776E]">Saved files</p>
          </Card>
          <Card className="rounded-2xl border-[#EFE0D6] bg-white p-4">
            <Sparkles className="mb-2 size-5 text-[#D95E46]" />
            <p className="text-lg font-bold">AI Study</p>
            <p className="text-xs text-[#89776E]">Notes · Quiz · Cards</p>
          </Card>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold">Your library</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#A38E83]" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search materials…" className="rounded-2xl border-[#EFE0D6] bg-white pl-9" />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1">
            {[["all", "All files"], ["pdf", "PDFs"], ["image", "Images"], ["document", "Documents"]].map(([key, label]) => (
              <button key={key} onClick={() => setFilter(key)}
                className={`shrink-0 rounded-full border px-4 py-2 text-xs font-semibold ${
                  filter === key ? "border-[#E76148] bg-[#E76148] text-white" : "border-[#EBDDD3] bg-white text-[#78665D]"
                }`}>
                {label}
              </button>
            ))}
          </div>

          {query.isLoading ? (
            <p className="py-8 text-center text-sm text-[#89776E]">Loading materials…</p>
          ) : visible.length === 0 ? (
            <Card className="rounded-2xl border-[#EFE0D6] bg-white p-8 text-center">
              <BookOpen className="mx-auto mb-3 size-8 text-[#D95E46]" />
              <p className="font-semibold">{materials.length ? "No matching files" : "Your library is empty"}</p>
              <p className="mt-1 text-sm text-[#89776E]">Upload a file to get started.</p>
            </Card>
          ) : visible.map((m) => {
            const isImage = m.material_type === "image";
            const isPpt = m.material_type === "ppt";
            const Icon = isImage ? Image : isPpt ? Presentation : FileText;
            return (
              <Card key={m.id} className="rounded-2xl border-[#EFE0D6] bg-white p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#FCEAE1] text-[#D95E46]">
                    <Icon className="size-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="break-words text-sm font-bold">{m.title}</h3>
                    <p className="mt-1 break-all text-xs text-[#89776E]">
                      {m.file_name || m.material_type}
                    </p>
                    <p className="mt-2 text-[11px] text-[#A18B80]">
                      {new Date(m.created_at).toLocaleDateString()}
                      {m.file_size ? ` · ${(m.file_size / 1048576).toFixed(1)} MB` : ""}
                    </p>
                  </div>
                  <button aria-label="Delete material" disabled={remove.isPending}
                    onClick={() => {
                      if (confirm(`Delete "${m.title}"?`)) remove.mutate(m.id);
                    }} className="rounded-full p-2 text-[#A18B80] hover:bg-red-50 hover:text-red-600">
                    <Trash2 className="size-4" />
                  </button>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <Button className="rounded-xl bg-[#E76148] text-white hover:bg-[#CF5039]"
                    onClick={() => setAi({ id: m.id, title: m.title })}>
                    <Sparkles className="mr-1.5 size-4" /> Study with AI
                  </Button>
                  <Button variant="outline" className="rounded-xl border-[#EBDDD3]"
                    disabled={!m.file_path || open.isPending}
                    onClick={() => open.mutate(m.id)}>
                    {open.isPending && open.variables === m.id
                      ? <Loader2 className="mr-1.5 size-4 animate-spin" />
                      : <ExternalLink className="mr-1.5 size-4" />}
                    Open file
                  </Button>
                </div>
              </Card>
            );
          })}
        </section>
      </div>

      {ai && <MaterialAiPanel key={ai.id} materialId={ai.id}
        title={ai.title} onClose={() => setAi(null)} />}
    </main>
  );
}