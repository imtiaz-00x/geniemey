import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
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