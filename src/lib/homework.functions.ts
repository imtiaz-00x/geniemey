import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const TONE = `You are a friendly Class 9-12 tutor. Use very simple words, short sentences, and bit-by-bit steps. Show an example before the exercise. Use small ASCII / emoji diagrams when useful.`;

type ChatCompletionResponse = {
  choices?: Array<{ message?: { content?: string } }>;
};

async function callGeminiMultimodal(dataUrl: string, instruction: string): Promise<string> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("Missing LOVABLE_API_KEY");
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": apiKey,
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: TONE },
        {
          role: "user",
          content: [
            { type: "text", text: instruction },
            { type: "image_url", image_url: { url: dataUrl } },
          ],
        },
      ],
    }),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`AI gateway error ${res.status}: ${errText.slice(0, 200)}`);
  }
  const json = (await res.json()) as ChatCompletionResponse;
  return json.choices?.[0]?.message?.content ?? "";
}

export const solveHomework = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      imageDataUrl: z.string().min(50).max(8_000_000),
      title: z.string().max(120).optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const solution = await callGeminiMultimodal(
      data.imageDataUrl,
      `This is a photo of a student's homework. Please:
1. List every question you can see (numbered).
2. For each question, give a clear step-by-step solution.
3. Then write a "Neat Notes" section the student can copy into their notebook.

Format the whole reply as Markdown with these top-level sections:
## Questions Found
## Step-by-Step Solutions
## Neat Notes`,
    );

    const titleGuess = data.title?.trim() || `Homework · ${new Date().toLocaleDateString()}`;

    const { data: row, error } = await context.supabase
      .from("homework_items")
      .insert({
        user_id: context.userId,
        title: titleGuess,
        image_data_url: data.imageDataUrl,
        solution_md: solution,
        notes_md: solution,
      })
      .select("id, created_at")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id, title: titleGuess, solution_md: solution };
  });

export const listHomework = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("homework_items")
      .select("id, title, created_at, solution_md")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getHomework = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("homework_items")
      .select("*")
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteHomework = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await context.supabase
      .from("homework_items")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    return { ok: true };
  });
