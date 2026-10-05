import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const TONE = `You are a friendly Class 9-12 tutor. Use very simple words, short sentences, and bit-by-bit steps. Show an example before the exercise. Use small ASCII / emoji diagrams when useful.`;

// 1x1 transparent PNG used when the homework item has no image (text-only questions).
const BLANK_IMG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

type ChatCompletionResponse = {
  choices?: Array<{ message?: { content?: string } }>;
};

async function callGateway(
  messages: Array<{ role: string; content: unknown }>,
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Missing GEMINI_API_KEY");

  const res = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gemini-3.6-flash",
        messages,
      }),
    },
  );

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Gemini API error ${res.status}: ${errText.slice(0, 200)}`);
  }

  const json = (await res.json()) as ChatCompletionResponse;
  return json.choices?.[0]?.message?.content ?? "";
}

const SOLUTION_FORMAT = `Format the reply as Markdown with these top-level sections:
## Questions Found
## Step-by-Step Solutions
## Easy Language Answer
## Example
## Neat Notes`;

export const solveHomework = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        imageDataUrl: z.string().min(50).max(8_000_000),
        title: z.string().max(120).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const solution = await callGateway([
      { role: "system", content: TONE },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `This is a photo of a student's homework. List every question you can see (numbered), then give a clear step-by-step solution for each, an easy-language answer, a worked example, and a "Neat Notes" section the student can copy into their notebook.\n\n${SOLUTION_FORMAT}`,
          },
          {
            type: "image_url",
            image_url: { url: data.imageDataUrl },
          },
        ],
      },
    ]);

    const titleGuess =
      data.title?.trim() || `Homework · ${new Date().toLocaleDateString()}`;

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

    return {
      id: row.id,
      title: titleGuess,
      solution_md: solution,
    };
  });

export const askHomeworkQuestion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        question: z.string().min(2).max(2000),
        title: z.string().max(120).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const solution = await callGateway([
      { role: "system", content: TONE },
      {
        role: "user",
        content: `A Class 9-12 student asks:\n\n"${data.question}"\n\nPlease answer in Markdown using these sections:\n## Easy Language Answer\n## Step-by-Step Explanation\n## Example\n## Neat Notes`,
      },
    ]);

    const title = data.title?.trim() || data.question.slice(0, 60);
    const body = `**Question:** ${data.question}\n\n${solution}`;

    const { data: row, error } = await context.supabase
      .from("homework_items")
      .insert({
        user_id: context.userId,
        title,
        image_data_url: BLANK_IMG,
        solution_md: body,
        notes_md: solution,
      })
      .select("id, created_at")
      .single();

    if (error) throw new Error(error.message);

    return {
      id: row.id,
      title,
      solution_md: body,
    };
  });

export const followUpHomework = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        question: z.string().min(1).max(2000),
        simpler: z.boolean().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("homework_items")
      .select("solution_md")
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .single();

    if (error) throw new Error(error.message);

    const askLine = data.simpler
      ? `The student says they still don't understand. Re-explain in EVEN simpler words, with a fresh tiny example and very short steps.`
      : `Answer the student's follow-up question with simple words, small steps, and one short example.`;

    const answer = await callGateway([
      { role: "system", content: TONE },
      {
        role: "user",
        content: `Previous explanation:\n\n${row.solution_md ?? ""}\n\nStudent says:\n"${data.question}"\n\n${askLine}\n\nUse Markdown.`,
      },
    ]);

    const label = data.simpler
      ? "I still don't understand"
      : `You asked: ${data.question}`;

    const appended = `${row.solution_md ?? ""}\n\n---\n\n**${label}**\n\n${answer}`;

    const { error: upErr } = await context.supabase
      .from("homework_items")
      .update({ solution_md: appended })
      .eq("id", data.id)
      .eq("user_id", context.userId);

    if (upErr) throw new Error(upErr.message);

    return { solution_md: appended };
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
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid() }).parse(d),
  )
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
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await context.supabase
      .from("homework_items")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);

    return { ok: true };
  });