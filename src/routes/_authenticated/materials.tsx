import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  listMaterials,
  createMaterial,
  deleteMaterial,
  getMaterialDownloadUrl,
} from "@/lib/materials.functions";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MaterialAiPanel } from "@/components/material-ai-panel";
import {
  FileText,
  Upload,
  Loader2,
  Trash2,
  Sparkles,
  Image as ImageIcon,
  Presentation,
  FileQuestion,
  StickyNote,
  BookOpen,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/materials")({
  component: MaterialsPage,
});

function getMaterialIcon(type: string) {
  switch (type) {
    case "image":
      return ImageIcon;
    case "ppt":
      return Presentation;
    case "question_paper":
      return FileQuestion;
    case "note":
      return StickyNote;
    case "study_pack":
      return BookOpen;
    default:
      return FileText;
  }
}

function MaterialsPage() {
  const qc = useQueryClient();

  const list = useServerFn(listMaterials);
  const create = useServerFn(createMaterial);
  const del = useServerFn(deleteMaterial);
  const getDownloadUrl = useServerFn(getMaterialDownloadUrl);

  const fileRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [aiMaterial, setAiMaterial] = useState<{
    id: string;
    title: string;
  } | null>(null);

  const materialsQ = useQuery({
    queryKey: ["materials"],
    queryFn: () => list(),
  });

  const createMut = useMutation({
    mutationFn: async () => {
      if (!selectedFile) {
        throw new Error("Please select a file.");
      }

      const finalTitle =
        title.trim() || selectedFile.name.replace(/\.[^/.]+$/, "");

      let materialType:
        | "document"
        | "pdf"
        | "image"
        | "note"
        | "ppt"
        | "question_paper"
        | "study_pack" = "document";

      const type = selectedFile.type.toLowerCase();

      if (type === "application/pdf") {
        materialType = "pdf";
      } else if (type.startsWith("image/")) {
        materialType = "image";
      } else if (
        type.includes("presentation") ||
        type.includes("powerpoint")
      ) {
        materialType = "ppt";
      }

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error("Please sign in again.");
      }

      const safeFileName = selectedFile.name.replace(
        /[^a-zA-Z0-9._-]/g,
        "_",
      );

      const filePath = `${user.id}/${crypto.randomUUID()}-${safeFileName}`;

      const { error: uploadError } = await supabase.storage
        .from("materials")
        .upload(filePath, selectedFile, {
          contentType: selectedFile.type || "application/octet-stream",
          upsert: false,
        });

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      try {
        return await create({
          data: {
            title: finalTitle,
            materialType,
            fileName: selectedFile.name,
            filePath,
            fileSize: selectedFile.size,
            mimeType: selectedFile.type || undefined,
            description: description.trim() || undefined,
            sourceType: "upload",
          },
        });
      } catch (error) {
        await supabase.storage.from("materials").remove([filePath]);
        throw error;
      }
    },

    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["materials"] });

      setTitle("");
      setDescription("");
      setSelectedFile(null);

      if (fileRef.current) {
        fileRef.current.value = "";
      }

      toast.success("Material uploaded successfully!");
    },

    onError: (e: Error) => {
      toast.error(e.message);
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),

    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["materials"] });
      toast.success("Material deleted.");
    },

    onError: (e: Error) => {
      toast.error(e.message);
    },
  });

  const openMut = useMutation({
    mutationFn: async (id: string) => {
      const result = await getDownloadUrl({ data: { id } });

      window.open(result.url, "_blank", "noopener,noreferrer");
    },

    onError: (e: Error) => {
      toast.error(e.message);
    },
  });

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];

    if (!file) return;

    setSelectedFile(file);

    if (!title.trim()) {
      setTitle(file.name.replace(/\.[^/.]+$/, ""));
    }
  }

  const materials = materialsQ.data?.materials ?? [];

  return (
    <div className="max-w-3xl mx-auto px-4 py-5 pb-24 space-y-5">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="size-10 rounded-xl bg-primary/10 text-primary grid place-items-center shrink-0">
          <BookOpen className="size-5" />
        </div>

        <div>
          <h1 className="text-2xl font-bold leading-tight">
            My Materials
          </h1>

          <p className="text-sm text-muted-foreground">
            Keep your PDFs, notes, question papers and study resources
            together with GenieMey.
          </p>
        </div>
      </div>

      {/* Upload */}
      <Card className="p-4 rounded-2xl space-y-4">
        <div>
          <h2 className="font-semibold">Add study material</h2>

          <p className="text-xs text-muted-foreground mt-1">
            Upload a PDF, image, PPT or other study file.
          </p>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.ppt,.pptx,.doc,.docx,.txt,image/*"
          className="hidden"
          onChange={handleFileChange}
        />

        <Button
          variant="outline"
          className="w-full h-12 rounded-full"
          onClick={() => fileRef.current?.click()}
          disabled={createMut.isPending}
        >
          <Upload className="size-4 mr-2" />
          {selectedFile ? "Change file" : "Choose file"}
        </Button>

        {selectedFile && (
          <div className="rounded-xl bg-secondary p-3">
            <p className="text-sm font-medium truncate">
              {selectedFile.name}
            </p>

            <p className="text-xs text-muted-foreground mt-1">
              {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
            </p>
          </div>
        )}

        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Material title"
          className="h-11 rounded-xl"
        />

        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional description — e.g. Physics Chapter 3 notes"
          className="min-h-[80px] rounded-xl"
        />

        <Button
          className="w-full h-11 rounded-full"
          disabled={!selectedFile || createMut.isPending}
          onClick={() => createMut.mutate()}
        >
          {createMut.isPending ? (
            <>
              <Loader2 className="size-4 mr-2 animate-spin" />
              Uploading…
            </>
          ) : (
            <>
              <Sparkles className="size-4 mr-2" />
              Add to My Materials
            </>
          )}
        </Button>
      </Card>

      {/* Categories */}
      <section className="space-y-2">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Your library
        </h2>

        <div className="grid grid-cols-3 gap-2">
          <Card className="p-3 text-center">
            <FileText className="size-5 mx-auto text-primary mb-1" />
            <p className="text-xs font-semibold">My Uploads</p>
            <p className="text-[11px] text-muted-foreground">
              {materials.length} files
            </p>
          </Card>

          <Card className="p-3 text-center">
            <Sparkles className="size-5 mx-auto text-primary mb-1" />
            <p className="text-xs font-semibold">Created</p>
            <p className="text-[11px] text-muted-foreground">
              AI materials
            </p>
          </Card>

          <Card className="p-3 text-center">
            <BookOpen className="size-5 mx-auto text-primary mb-1" />
            <p className="text-xs font-semibold">My Learning</p>
            <p className="text-[11px] text-muted-foreground">
              Lessons
            </p>
          </Card>
        </div>
      </section>

      {/* Materials list */}
      <section className="space-y-2">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          My uploads
        </h2>

        {materialsQ.isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Loading your materials…
          </div>
        ) : materials.length === 0 ? (
          <Card className="p-8 text-center rounded-2xl">
            <FileText className="size-9 mx-auto text-muted-foreground mb-3" />

            <p className="font-medium">No materials yet</p>

            <p className="text-sm text-muted-foreground mt-1">
              Upload your first study resource above.
            </p>
          </Card>
        ) : (
          <div className="space-y-2">
            {materials.map((material) => {
              const Icon = getMaterialIcon(material.material_type);

              return (
                <Card
                  key={material.id}
                  className="p-3.5 rounded-xl border-2 border-border hover:border-primary/40 transition"
                >
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-xl bg-primary/10 text-primary grid place-items-center shrink-0">
                      <Icon className="size-5" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {material.title}
                      </p>

                      <p className="text-xs text-muted-foreground truncate">
                        {material.file_name || material.material_type}
                      </p>

                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {new Date(
                          material.created_at,
                        ).toLocaleDateString()}
                      </p>
                    </div>

                    {material.file_path && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="shrink-0 rounded-full"
                        onClick={() =>
                          setAiMaterial({
                            id: material.id,
                            title: material.title,
                          })
                        }
                        title="Analyze, notes, flashcards, quiz"
                      >
                        <Sparkles className="size-4 mr-1" />
                        AI
                      </Button>
                    )}

                    {material.file_path && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="shrink-0"
                        disabled={openMut.isPending}
                        onClick={() => openMut.mutate(material.id)}
                        title="Open material"
                      >
                        {openMut.isPending ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <ExternalLink className="size-4" />
                        )}
                      </Button>
                    )}

                    <Button
                      size="sm"
                      variant="ghost"
                      className="shrink-0"
                      disabled={deleteMut.isPending}
                      onClick={() => {
                        if (confirm("Delete this material?")) {
                          deleteMut.mutate(material.id);
                        }
                      }}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>

                  {material.description && (
                    <p className="text-xs text-muted-foreground mt-3 pt-3 border-t border-border">
                      {material.description}
                    </p>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {aiMaterial && (
        <MaterialAiPanel
          key={aiMaterial.id}
          materialId={aiMaterial.id}
          title={aiMaterial.title}
          onClose={() => setAiMaterial(null)}
        />
      )}
    </div>
  );
}