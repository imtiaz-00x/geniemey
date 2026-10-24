import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { createAppResponsesCall } from "./ai-responses.server";

// ---------------------------------------------------------------------------
// My Materials: file-first persistence + AI study tools
// ---------------------------------------------------------------------------

export const MATERIAL_CATEGORIES = ["notes", "pdf", "question_papers", "study_packs"] as const;

export const CATEGORY_LABELS: Record<(typeof MATERIAL_CATEGORIES)[number], string> = {
  notes: "Notes",
  pdf: "PDFs",
  question_papers: "Question Papers",
  study_packs: "Study Packs",
};

export const TOOL_KINDS = ["notes", "explanation", "qa", "quiz", "flashcards", "mindmap"] as const;

export const TOOL_LABELS: Record<(typeof TOOL_KINDS)[number], string> = {
  notes: "Chapter Notes",
  explanation: "Simple Explanation",
  qa: "Q&A Set",
  quiz: "Practice Quiz",
  flashcards: "Flashcards",
  mindmap: "Mind Map",
};

const TUTOR_INSTRUCTIONS = `You are a friendly Class 9-12 tutor for Indian students. Use very simple words, short sentences and small step-by-step points. Base EVERYTHING on the provided study material. Never invent facts that are not in it. If the material is unreadable, too short or off-topic, say so plainly instead of guessing.`;

const MATERIAL_SCHEMA = z
  .object({
    title: z.string().min(1).max(160),
    description: z.string().max(600).optional(),
    category: z.enum(MATERIAL_CATEGORIES),
    fileName: z.string().min(1).max(255),
    fileType: z.string().min(1).max(100),
    fileSize: z.number().int().min(1).max(20_971_520),
    storagePath: z.string().min(10).max(400),
    textPreview: z.string().max(40_000).optional(),
  })
  .strict();

export type MaterialRow = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  category: string;
  file_name: string | null;
  file_type: string | null;
  file_size: number | null;
  storage_path: string | null;
  created_at: string;
  updated_at: string;
};

/** Record a material AFTER its file bytes are already in storage. */
export const createMaterial = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => MATERIAL_SCHEMA.parse(d))
  .handler(async ({ data, context }) => {
    if (!data.storagePath.startsWith(`materials/${context.userId}/`)) {
      throw new Error("Invalid storage path for this account.");
    }

    // Duplicate prevention: same path must not create a second record.
    const { data: existing } = await context.supabase
      .from("materials")
      .select("id")
      .eq("user_id", context.userId)
      .eq("storage_path", data.storagePath)
      .maybeSingle();
    if (existing) return { id: (existing as { id: string }).id, duplicate: true };

    // The file bytes MUST exist before the material is confirmed saved.
    const { error: infoError } = await context.supabase.storage
      .from("materials")
      .info(data.storagePath.replace(/^materials\//, ""));
    if (infoError) {
      throw new Error("The uploaded file was not found in storage. Please upload again.");
    }

    const { data: row, error } = await context.supabase
      .from("materials")
      .insert({
        user_id: context.userId,
        title: data.title,
        description: data.description ?? null,
        category: data.category,
        file_name: data.fileName,
        file_type: data.fileType,
        file_size: data.fileSize,
        storage_path: data.storagePath,
        text_preview: data.textPreview ?? null,
      })
      .select("id, created_at")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id, duplicate: false };
  });

export const listMaterials = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("materials")
      .select(
        "id, user_id, title, description, category, file_name, file_type, file_size, storage_path, created_at, updated_at",
      )
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return (data ?? []) as MaterialRow[];
  });

export const getMaterial = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).strict().parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("materials")
      .select("*")
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const updateMaterial = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        title: z.string().min(1).max(160),
        description: z.string().max(600).nullable(),
        category: z.enum(MATERIAL_CATEGORIES),
      })
      .strict()
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("materials")
      .update({
        title: data.title,
        description: data.description ?? null,
        category: data.category,
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Deletes the storage object FIRST, then the row (cascade removes outputs). */
export const deleteMaterial = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).strict().parse(d))
  .handler(async ({ data, context }) => {
    const { data: row } = await context.supabase
      .from("materials")
      .select("storage_path")
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .single();
    const storagePath = (row as { storage_path?: string | null } | null)?.storage_path;
    if (storagePath) {
      await context.supabase.storage.from("materials").remove([storagePath.replace(/^materials\//, "")]);
    }
    const { error } = await context.supabase.from("materials").delete().eq("id", data.id).eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------------------------- AI study tools ----------------------------

const KIND_SCHEMA = z.enum(TOOL_KINDS);

type MindNode = { label: string; children?: MindNode[] };

export type MaterialOutputRow = {
  id: string;
  material_id: string;
  kind: string;
  title: string | null;
  content: unknown;
  created_at: string;
};

function safeJsonParse(raw: string): unknown | null {
  let s = (raw ?? "").trim().replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  const a = s.indexOf("{") >= 0 ? s.indexOf("{") : s.indexOf("[");
  const b = Math.max(s.lastIndexOf("}"), s.lastIndexOf("]"));
  if (a < 0 || b <= a) return null;
  s = s.slice(a, b + 1).replace(/,\s*([}\]])/g, "$1");
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

async function runAi(userParts: Array<Record<string, unknown>>, prompt: string, effort: "low" | "medium") {
  const result = createAppResponsesCall(
    [
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
          ...userParts,
        ] as never,
      },
    ],
    { instructions: TUTOR_INSTRUCTIONS, reasoningEffort: effort },
  );
  const text = await result.text;
  if (!text || !text.trim()) throw new Error("The AI returned an empty answer. Please try again.");
  return text;
}

function fileParts(
  material: { file_name: string | null; storage_path: string | null },
  fileBytes: { base64: string; mime: string } | null,
): Array<Record<string, unknown>> {
  if (!fileBytes) return [];
  if (fileBytes.mime === "application/pdf") {
    return [
      {
        type: "file",
        filename: material.file_name ?? "material.pdf",
        data: fileBytes.base64,
        mediaType: "application/pdf",
      },
    ];
  }
  return [{ type: "image", image: new URL(`data:${fileBytes.mime};base64,${fileBytes.base64}`) }];
}

/** Reads the uploaded file (PDF / image) from storage as inline AI input. */
async function loadFileBytes(
  ctx: { supabase: import("@/integrations/supabase/auth-middleware").unknown },
  material: { storage_path: string | null },
): Promise<{ base64: string; mime: string } | null> {
  type StoragePathRow = { file_type: string | null; storage_path: string | null };
  const row = material as StoragePathRow;
  if (!row.storage_path || !row.file_type) return null;
  if (row.file_type !== "application/pdf" && !row.file_type.startsWith("image/")) return null;
  const path = row.storage_path.replace(/^materials\//, "");
  const { data, error } = await ctx.supabase.storage.from("materials").download(path);
  if (error || !data) throw new Error("Could not read the uploaded file. Try re-uploading it.");
  const buf = new Uint8Array(await data.arrayBuffer());
  if (buf.byteLength > 15 * 1024 * 1024) {
    throw new Error("This file is too large for AI processing (15 MB limit). Use a smaller file.");
  }
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < buf.length; i += chunk) {
    binary += String.fromCharCode(...buf.subarray(i, i + chunk));
  }
  return { base64: btoa(binary), mime: row.file_type };
}

function quizFallback(text: string): Array<{ question: string; options: string[]; answerIndex: number; explanation: string }> {
  return [
    {
      question: "The AI could not build a quiz from this material. Which is most likely true?",
      options: [
        "The material has too little readable text",
        "The material is in an unsupported format",
        "Both of the above",
      ],
      answerIndex: 2,
      explanation: text.slice(0, 200),
    },
  ];
}

export const generateMaterialTool = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: unknown) =>
      z
        .object({ materialId: z.string().uuid(), kind: KIND_SCHEMA, refresh: z.boolean().optional() })
        .strict()
        .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: material, error } = await context.supabase
      .from("materials")
      .select("*")
      .eq("id", data.materialId)
      .eq("user_id", context.userId)
      .single();
    if (error || !material) throw new Error("Material not found.");

    type MaterialFull = {
      title: string;
      description: string | null;
      text_preview: string | null;
      file_name: string | null;
      file_type: string | null;
      storage_path: string | null;
    };
    const m = material as unknown as MaterialFull;

    // Reuse an existing output unless the user explicitly regenerates.
    if (!data.refresh) {
      const { data: existing } = await context.supabase
        .from("material_outputs")
        .select("id, material_id, kind, title, content, created_at")
        .eq("material_id", data.materialId)
        .eq("user_id", context.userId)
        .eq("kind", data.kind)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (existing) return { output: existing as MaterialOutputRow, cached: true };
    }

    const sourceText = (m.text_preview ?? "").trim();
    if (!sourceText) {
      const bytes = await loadFileBytes(context as never, m as never);
      if (!bytes) {
        throw new Error(
          "There is no readable text in this material to study from. Upload a PDF, image, DOCX, PPTX or text file with real content.",
        );
      }
      var fileInput = fileParts(m as never, bytes);
    } else {
      var fileInput = [] as Array<Record<string, unknown>>;
    }

    const sourceBlock = sourceText
      ? `STUDY MATERIAL (text extracted from the upload):\n"""\n${sourceText.slice(0, 30_000)}\n"""`
      : `(No extracted text — read the attached document directly.)`;

    const materialLine = `Material title: "${m.title}"${m.description ? ` — ${m.description}` : ""}`;

    if (data.kind === "notes" || data.kind === "explanation") {
      const prompt =
        data.kind === "notes"
          ? `Create clean, well-organised CHAPTER NOTES + SUMMARY from the study material below for a Class 9-12 student.\n\n${materialLine}\n\n${sourceBlock}\n\nUse Markdown with these sections:\n## Overview (2-3 lines)\n## Key Concepts (bullets with **bold** terms)\n## Important Points to Remember\n## Formulas / Definitions (if any; use $...$ for math)\n## Summary (5 crisp bullets)\nStay faithful to the material. Keep it under 700 words.`
          : `Explain the study material below in the SIMPLEST possible words for a Class 9-12 student, with one everyday example.\n\n${materialLine}\n\n${sourceBlock}\n\nUse Markdown:\n## In One Line\n## Step-by-Step Understanding (4-6 tiny steps)\n## Example from Daily Life\n## Common Confusions (2-3 bullets)\n## Quick Check (3 short questions with one-line answers)\nStay faithful to the material. Keep it under 500 words.`;
      const text = await runAi(fileInput, prompt, "medium");
      const { data: out, error: insErr } = await context.supabase
        .from("material_outputs")
        .insert({
          material_id: data.materialId,
          user_id: context.userId,
          kind: data.kind,
          title: data.kind === "notes" ? `Notes · ${m.title}` : `Explanation · ${m.title}`,
          content: { markdown: text },
        })
        .select("id, material_id, kind, title, content, created_at")
        .single();
      if (insErr) throw new Error(insErr.message);
      return { output: out as MaterialOutputRow, cached: false };
    }

    // JSON-based tools
    let parsed: unknown = null;
    let lastText = "";
    for (let attempt = 0; attempt < 2 && !parsed; attempt++) {
      const strict = attempt === 1 ? `\n\nIMPORTANT: Return strictly valid JSON only — no markdown fences, no commentary.` : "";
      const prompt = buildJsonPrompt(data.kind, materialLine, sourceBlock) + strict;
      lastText = await runAi(fileInput, prompt, "medium");
      parsed = safeJsonParse(lastText);
    }
    if (!parsed) {
      if (data.kind === "quiz") parsed = quizFallback(lastText);
      else throw new Error("The AI could not structure an answer from this material. Please try again.");
    }

    const content = normalizeToolContent(data.kind, parsed);
    const { data: out, error: insErr } = await context.supabase
      .from("material_outputs")
      .insert({
        material_id: data.materialId,
        user_id: context.userId,
        kind: data.kind,
        title: `${TOOL_LABELS[data.kind]} · ${m.title}`,
        content,
      })
      .select("id, material_id, kind, title, content, created_at")
      .single();
    if (insErr) throw new Error(insErr.message);
    return { output: out as MaterialOutputRow, cached: false };
  });

function buildJsonPrompt(kind: string, materialLine: string, sourceBlock: string): string {
  const base = `${materialLine}\n\n${sourceBlock}\n\n`;
  if (kind === "qa") {
    return `${base}Create a question-and-answer set of 10 items from the material, ordered easiest to hardest.\n\nReturn ONLY JSON (no fences, no commentary):\n{"items":[{"question":"...","answer":"..."}]}\nAnswers must be short (max 60 words) and faithful to the material.`;
  }
  if (kind === "quiz") {
    return `${base}Create a practice quiz of 8 multiple-choice questions (MCQs) from the material for Class 9-12 level.\n\nReturn ONLY JSON (no fences, no commentary):\n{"items":[{"question":"...","options":["A","B","C","D"],"answerIndex":0,"explanation":"why this answer is right"}]}\nExactly 4 options per question. answerIndex is 0-3. Explanations max 50 words, faithful to the material.`;
  }
  if (kind === "flashcards") {
    return `${base}Turn the material into 12 spaced-repetition flashcards.\n\nReturn ONLY JSON (no fences, no commentary):\n{"items":[{"front":"short question (max 120 chars)","back":"crisp answer (max 240 chars)","tag":"definition|formula|fact|apply"}]}\nOne idea per card, easiest first, never invent content outside the material.`;
  }
  // mindmap
  return `${base}Build a structured concept map of the material: a root topic with 4-6 main branches, each with 2-4 sub-points.\n\nReturn ONLY JSON (no fences, no commentary):\n{"root":"topic","children":[{"label":"branch","children":[{"label":"point"}]}]}\nKeep labels short (max 8 words), faithful to the material.`;
}

function normalizeToolContent(kind: string, parsed: unknown): unknown {
  const obj = (parsed && typeof parsed === "object" ? parsed : {}) as Record<string, unknown>;
  if (kind === "qa" || kind === "quiz" || kind === "flashcards") {
    const items = Array.isArray(obj.items) ? obj.items : Array.isArray(parsed) ? parsed : [];
    if (kind === "qa") {
      return {
        items: (items as Array<Record<string, unknown>>)
          .map((it) => ({ question: String(it?.question ?? "").trim(), answer: String(it?.answer ?? "").trim() }))
          .filter((it) => it.question && it.answer)
          .slice(0, 20),
      };
    }
    if (kind === "quiz") {
      return {
        items: (items as Array<Record<string, unknown>>)
          .map((it) => {
            const options = Array.isArray(it?.options) ? (it.options as unknown[]).map((o) => String(o)) : [];
            const answerIndex = Math.max(0, Math.min(3, Number(it?.answerIndex ?? 0) || 0));
            return {
              question: String(it?.question ?? "").trim(),
              options: options.slice(0, 4),
              answerIndex: options.length ? Math.min(answerIndex, options.length - 1) : 0,
              explanation: String(it?.explanation ?? "").trim(),
            };
          })
          .filter((it) => it.question && it.options.length >= 2)
          .slice(0, 20),
      };
    }
    return {
      items: (items as Array<Record<string, unknown>>)
        .map((it) => ({
          front: String(it?.front ?? "").trim(),
          back: String(it?.back ?? "").trim(),
          tag: ["definition", "formula", "fact", "apply"].includes(String(it?.tag)) ? String(it.tag) : "fact",
        }))
        .filter((it) => it.front && it.back)
        .slice(0, 30),
    };
  }
  // mindmap
  const toNode = (n: unknown): MindNode | null => {
    if (!n || typeof n !== "object") return null;
    const o = n as Record<string, unknown>;
    const label = String(o.label ?? o.root ?? "").trim();
    if (!label) return null;
    const children = Array.isArray(o.children) ? o.children.map(toNode).filter(Boolean) : [];
    return { label, children: children.length ? (children as MindNode[]) : undefined };
  };
  const root =
    toNode(obj) ??
    (Array.isArray(obj.items) ? { label: "Concept Map", children: (obj.items as unknown[]).map(toNode).filter(Boolean) } : null);
  return { root: root ?? { label: "Concept Map" } };
}

export const listMaterialOutputs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ materialId: z.string().uuid() }).strict().parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("material_outputs")
      .select("id, material_id, kind, title, content, created_at")
      .eq("material_id", data.materialId)
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (rows ?? []) as MaterialOutputRow[];
  });

export const deleteMaterialOutput = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).strict().parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("material_outputs")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
