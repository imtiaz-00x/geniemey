import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const MODEL = "gemini-3.8-flash";
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const REQUEST_TIMEOUT_MS = 50_000;

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

    if (!apiKey) {
      throw new Error("Server configuration error: GEMINI_API_KEY is missing.");
    }

    const { data: material, error } = await context.supabase
      .from("materials")
      .select("title, file_path, mime_type, content_text")
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .single();

    if (error || !material) {
      throw new Error("Could not find this material. Refresh and try again.");
    }

    const parts: Array<Record<string, unknown>> = [
      { text: `${PROMPTS[data.action]}\n\nMaterial title: ${material.title}` },
    ];

    if (material.content_text?.trim()) {
      parts.push({ text: material.content_text.slice(0, 100_000) });
    } else if (material.file_path) {
      const { data: blob, error: downloadError } =
        await context.supabase.storage
          .from("materials")
          .download(material.file_path);

      if (downloadError || !blob) {
        throw new Error("Could not download the study file. Please try again.");
      }

      if (blob.size > MAX_FILE_BYTES) {
        throw new Error("File is too large. The maximum supported size is 10 MB.");
      }

      const mime = (material.mime_type || blob.type || "").split(";")[0].trim();

      const supported =
        mime === "application/pdf" ||
        mime.startsWith("image/") ||
        mime === "text/plain" ||
        mime === "text/markdown";

      if (!supported) {
        throw new Error(
          "This file type is not supported for AI yet. Try a PDF, image or text file.",
        );
      }

      const base64 = Buffer.from(await blob.arrayBuffer()).toString("base64");

      parts.push({
        inline_data: {
          mime_type: mime || "application/pdf",
          data: base64,
        },
      });
    } else {
      throw new Error("This material has no readable content.");
    }

    const wantsJson =
      data.action === "flashcards" || data.action === "quiz";

    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      REQUEST_TIMEOUT_MS,
    );

    let responseText: string;

    try {
      const response = await fetch(
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
          signal: controller.signal,
        },
      );

      if (!response.ok) {
        const errorBody = await response.text();

        if (response.status === 429) {
          throw new Error("AI limit reached. Please wait and try again.");
        }

        if (response.status === 401 || response.status === 403) {
          throw new Error("Gemini API key is invalid or does not have access.");
        }

        if (response.status === 404) {
          throw new Error(
            `Gemini model "${MODEL}" was not found. Check the model name and API access.`,
          );
        }

        throw new Error(
          `Gemini request failed (${response.status}): ${errorBody.slice(0, 250)}`,
        );
      }

      const result = (await response.json()) as {
        candidates?: Array<{
          finishReason?: string;
          content?: { parts?: Array<{ text?: string }> };
        }>;
        promptFeedback?: { blockReason?: string };
      };

      if (result.promptFeedback?.blockReason) {
        throw new Error("AI could not process this material. Try another file.");
      }

      const candidate = result.candidates?.[0];

      responseText =
        candidate?.content?.parts?.map((part) => part.text ?? "").join("") ?? "";

      if (!responseText.trim()) {
        throw new Error(
          candidate?.finishReason === "MAX_TOKENS"
            ? "The response was too long. Try a smaller file."
            : "AI returned an empty response. Please try again.",
        );
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error(
          "AI request timed out. Try a smaller file or try again later.",
        );
      }

      throw error;
    } finally {
      clearTimeout(timeout);
    }

    if (wantsJson) {
      try {
        const cleaned = responseText
          .trim()
          .replace(/^```(?:json)?\s*/i, "")
          .replace(/\s*```$/, "");

        const items: unknown = JSON.parse(cleaned);

        if (!Array.isArray(items) || items.length === 0) {
          throw new Error("AI returned no quiz questions or flashcards.");
        }

        return { action: data.action, items };
      } catch (error) {
        if (error instanceof Error &&
            error.message === "AI returned no quiz questions or flashcards.") {
          throw error;
        }

        throw new Error("AI response format was invalid. Please try again.");
      }
    }

    return { action: data.action, text: responseText };
  });