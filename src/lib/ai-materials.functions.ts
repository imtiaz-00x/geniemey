import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

// Agar "model not found" error aaye to yahan naam badal dena
const MODEL = "gemini-2.5-flash";
const MAX_FILE_BYTES = 10 * 1024 * 1024;

const PROMPTS = {
  analyze:
    "You are a study assistant. Analyze this study material. Give: 1) a short summary, 2) the main topics, 3) key terms with simple meanings, 4) what a student should focus on. Use simple language and short bullet points.",
  notes:
    "Create clear, well-organised study notes from this material in Markdown with headings and bullet points. Keep it concise and exam-focused.",
  flashcards:
    'Create 10 flashcards from this material. Return ONLY a JSON array like [{"front":"question","back":"answer"}].',
  quiz:
    'Create a 5-question multiple choice quiz from this material. Return ONLY a JSON array like [{"question":"...","options":["A","B","C","D"],"answerIndex":0,"explanation":"..."}].',
} as const;

export const generateFromMaterial = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        action: z.enum(["analyze", "notes", "flashcards", "quiz"]),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("Missing GEMINI_API_KEY");

    const { data: m, error } = await context.supabase
      .from("materials")
      .select("title, file_path, mime_type, content_text")
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .single();
    if (error) throw new Error(error.message);

    const parts: Array<Record<string, unknown>> = [
      { text: PROMPTS[data.action] },
    ];

    if (m.content_text) {
      parts.push({ text: m.content_text });
    } else if (m.file_path) {
      const { data: blob, error: dlError } = await context.supabase.storage
        .from("materials")
        .download(m.file_path);
      if (dlError || !blob) {
        throw new Error(dlError?.message ?? "Could not read the file.");
      }
      if (blob.size > MAX_FILE_BYTES) {
        throw new Error("File is too large (max 10 MB).");
      }
      const mime = m.mime_type || blob.type || "";
      const supported =
        mime === "application/pdf" ||
        mime.startsWith("image/") ||
        mime.startsWith("text/");
      if (!supported) {
        throw new Error(
          "This file type is not supported yet. Please use PDF, image or text files.",
        );
      }
      const base64 = Buffer.from(await blob.arrayBuffer()).toString("base64");
      parts.push({ inline_data: { mime_type: mime, data: base64 } });
    } else {
      throw new Error("This material has no content to read.");
    }

    const wantsJson = data.action === "flashcards" || data.action === "quiz";

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          contents: [{ role: "user", parts }],
          generationConfig: wantsJson
            ? { responseMimeType: "application/json" }
            : {},
        }),
      },
    );

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Gemini error ${res.status}: ${errText.slice(0, 300)}`);
    }

    const json = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text =
      json.candidates?.[0]?.content?.parts
        ?.map((p) => p.text ?? "")
        .join("") ?? "";

    if (!text) throw new Error("AI returned an empty response.");

    if (wantsJson) {
      try {
        return { action: data.action, items: JSON.parse(text) as unknown[] };
      } catch {
        throw new Error("AI response could not be read. Please try again.");
      }
    }

    return { action: data.action, text };
  });