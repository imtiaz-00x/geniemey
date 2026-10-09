import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getGeminiApiKey } from "@/lib/ai-gateway.server";
import { z } from "zod";

const materialTypeSchema = z.enum([
  "document",
  "pdf",
  "image",
  "note",
  "ppt",
  "question_paper",
  "study_pack",
]);

const sourceTypeSchema = z.enum([
  "upload",
  "created",
  "learning",
]);

const materialIdSchema = z.string().uuid();

const materialInput = z.object({
  title: z.string().min(1).max(200),
  materialType: materialTypeSchema.default("document"),
  fileName: z.string().max(255).optional(),
  filePath: z.string().max(2000).optional(),
  fileUrl: z.string().url().max(2000).optional(),
  fileSize: z.number().int().min(0).max(500_000_000).optional(),
  mimeType: z.string().max(120).optional(),
  contentText: z.string().max(200_000).optional(),
  description: z.string().max(2000).optional(),
  sourceType: sourceTypeSchema.default("upload"),
});

const materialAIInput = z.object({
  id: materialIdSchema,
  action: z.enum(["analyze", "explain", "notes"]),
});

type MaterialAIAction = z.infer<typeof materialAIInput>["action"];

function getMaterialPrompt(action: MaterialAIAction, title: string) {
  const common = `
You are GenieMey, a helpful study assistant for school students.
Study material title: "${title}".

Rules:
- Use the supplied material as your primary source.
- Explain in simple, student-friendly English.
- Keep facts, formulas, definitions and examples accurate.
- If something is unclear or missing, say so instead of inventing it.
- Format the answer with clear headings and readable bullet points.
`;

  if (action === "analyze") {
    return `${common}

Analyze this study material.
Include:
1. What the material is about.
2. Its main topics and important concepts.
3. Important definitions, formulas or facts.
4. Topics a student should revise carefully.
5. Any unclear or incomplete parts you notice.
`;
  }

  if (action === "explain") {
    return `${common}

Explain this material step by step as a patient school teacher.
Define difficult terms, explain the main concepts in simple language,
and use examples where useful. Explain formulas and their symbols
when they appear in the material. Do not invent missing content.
`;
  }

  return `${common}

Convert this material into well-organized study notes.
Include:
1. A short overview.
2. Topic-wise headings and concise explanations.
3. Important definitions, formulas and key points.
4. Examples or steps where useful.
5. A final quick-revision summary.

Preserve important details. Do not make the notes so short that
essential concepts are lost.
`;
}

// List the signed-in student's materials.
export const listMaterials = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("materials")
      .select(
        "id, title, material_type, file_name, file_path, file_url, file_size, mime_type, description, source_type, created_at, updated_at",
      )
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);

    return {
      materials: data ?? [],
    };
  });

// Create a material record after the file has been uploaded to Storage.
export const createMaterial = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => materialInput.parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("materials")
      .insert({
        user_id: context.userId,
        title: data.title,
        material_type: data.materialType,
        file_name: data.fileName ?? null,
        file_path: data.filePath ?? null,
        file_url: data.fileUrl ?? null,
        file_size: data.fileSize ?? null,
        mime_type: data.mimeType ?? null,
        content_text: data.contentText ?? null,
        description: data.description ?? null,
        source_type: data.sourceType,
      })
      .select(
        "id, title, material_type, file_name, file_path, file_url, file_size, mime_type, content_text, description, source_type, created_at, updated_at",
      )
      .single();

    if (error) throw new Error(error.message);

    return {
      material: row,
    };
  });

// Update material metadata/content.
export const updateMaterial = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      id: materialIdSchema,
      title: z.string().min(1).max(200).optional(),
      description: z.string().max(2000).optional(),
      contentText: z.string().max(200_000).optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const updates: Record<string, unknown> = {};

    if (data.title !== undefined) {
      updates.title = data.title;
    }

    if (data.description !== undefined) {
      updates.description = data.description;
    }

    if (data.contentText !== undefined) {
      updates.content_text = data.contentText;
    }

    if (Object.keys(updates).length === 0) {
      throw new Error("Nothing to update.");
    }

    updates.updated_at = new Date().toISOString();

    const { data: row, error } = await context.supabase
      .from("materials")
      .update(updates)
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .select(
        "id, title, material_type, file_name, file_path, file_url, file_size, mime_type, content_text, description, source_type, created_at, updated_at",
      )
      .single();

    if (error) throw new Error(error.message);

    return {
      material: row,
    };
  });

// Analyze a student's saved material with Gemini.
// The ownership check prevents students from processing other users' files.
export const generateMaterialStudyOutput = createServerFn({
  method: "POST",
})
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => materialAIInput.parse(d))
  .handler(async ({ data, context }) => {
    const { data: material, error } = await context.supabase
      .from("materials")
      .select(
        "id, title, file_name, file_path, mime_type, content_text, file_size",
      )
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .single();

    if (error || !material) {
      throw new Error("Material not found or you do not have access to it.");
    }

    let textContent = material.content_text?.trim() ?? "";
    let inlineData: { mimeType: string; data: string } | null = null;

    if (material.file_path) {
      const { data: file, error: downloadError } =
        await context.supabase.storage
          .from("materials")
          .download(material.file_path);

      if (downloadError || !file) {
        throw new Error(
          "Could not read this uploaded file. Please upload it again.",
        );
      }

      // Limit AI processing to 15 MB per file.
      if (file.size > 15 * 1024 * 1024) {
        throw new Error(
          "This file is too large for AI processing. Please upload a file smaller than 15 MB.",
        );
      }

      const mimeType = (
        material.mime_type ||
        file.type ||
        "application/octet-stream"
      ).split(";")[0].trim().toLowerCase();

      if (
        mimeType === "text/plain" ||
        mimeType === "text/markdown" ||
        mimeType === "text/csv"
      ) {
        textContent = await file.text();
      } else if (
        mimeType === "application/pdf" ||
        mimeType.startsWith("image/")
      ) {
        const bytes = new Uint8Array(await file.arrayBuffer());
        let binary = "";

        // Convert in chunks to avoid overflowing the call stack.
        const chunkSize = 0x8000;
        for (let i = 0; i < bytes.length; i += chunkSize) {
          binary += String.fromCharCode(
            ...bytes.subarray(i, i + chunkSize),
          );
        }

        inlineData = {
          mimeType,
          data: btoa(binary),
        };
      } else {
        throw new Error(
          "AI processing currently supports PDF, images and text files. DOC, DOCX, PPT and PPTX files need to be converted to PDF or TXT first.",
        );
      }
    }

    if (!textContent && !inlineData) {
      throw new Error(
        "This material has no readable content or uploaded file.",
      );
    }

    if (textContent.length > 180_000) {
      textContent = textContent.slice(0, 180_000);
    }

    const apiKey = getGeminiApiKey();

    if (!apiKey) {
      throw new Error(
        "Gemini API key is not configured on the server. Check your Netlify environment variables.",
      );
    }

    const parts: Array<Record<string, unknown>> = [
      { text: getMaterialPrompt(data.action, material.title) },
    ];

    if (textContent) {
      parts.push({ text: `Material content:\n\n${textContent}` });
    }

    if (inlineData) {
      parts.push({
        inline_data: {
          mime_type: inlineData.mimeType,
          data: inlineData.data,
        },
      });
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [{ role: "user", parts }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 6000,
          },
        }),
      },
    );

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("Gemini material processing failed:", errorBody);

      if (response.status === 429) {
        throw new Error(
          "AI request limit reached. Please wait a little and try again.",
        );
      }

      throw new Error(
        "Gemini could not process this material right now. Please try again.",
      );
    }

    const result = await response.json();

    const output = result?.candidates?.[0]?.content?.parts
      ?.map((part: { text?: string }) => part.text ?? "")
      .join("\n")
      .trim();

    if (!output) {
      throw new Error(
        "The AI returned an empty answer. Try again with a clearer file.",
      );
    }

    return {
      title: material.title,
      action: data.action,
      output,
    };
  });

// Create a temporary download URL for a private Storage file.
export const getMaterialDownloadUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      id: materialIdSchema,
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: material, error } = await context.supabase
      .from("materials")
      .select("id, file_path")
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .single();

    if (error) throw new Error(error.message);

    if (!material.file_path) {
      throw new Error("This material has no uploaded file.");
    }

    const { data: signed, error: signedError } =
      await context.supabase.storage
        .from("materials")
        .createSignedUrl(material.file_path, 60 * 10);

    if (signedError) {
      throw new Error(signedError.message);
    }

    return {
      url: signed.signedUrl,
    };
  });

// Delete a material owned by the signed-in student.
export const deleteMaterial = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      id: materialIdSchema,
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: material, error: materialError } =
      await context.supabase
        .from("materials")
        .select("file_path")
        .eq("id", data.id)
        .eq("user_id", context.userId)
        .single();

    if (materialError) {
      throw new Error(materialError.message);
    }

    // Delete the physical Storage file first.
    if (material.file_path) {
      const { error: storageError } =
        await context.supabase.storage
          .from("materials")
          .remove([material.file_path]);

      if (storageError) {
        throw new Error(storageError.message);
      }
    }

    // Then delete the database record.
    const { error } = await context.supabase
      .from("materials")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);

    if (error) {
      throw new Error(error.message);
    }

    return {
      ok: true,
    };
  });