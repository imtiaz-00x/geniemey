import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateText, Output } from "ai";
import { z } from "zod";

const SUBJECTS = ["Math", "Science"] as const;
const subjectSchema = z.enum(SUBJECTS);
const gradeSchema = z.number().int().min(1).max(12);

function model() {
  // dynamic import keeps server-only module out of client bundle
  return (async () => {
    const { createLovableAiGatewayProvider, getLovableApiKey } = await import("./ai-gateway.server");
    return createLovableAiGatewayProvider(getLovableApiKey())("google/gemini-3-flash-preview");
  })();
}

// ------- Topic suggestions -------
export const suggestTopics = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ grade: gradeSchema, subject: subjectSchema }).parse(d),
  )
  .handler(async ({ data }) => {
    const m = await model();
    const { output } = await generateText({
      model: m,
      prompt: `You are a curriculum planner for an Indian K-12 student in grade ${data.grade} studying ${data.subject}. Aligned to NCERT and useful for JEE/NEET prep when relevant. List 10 important chapter/topic names. Short (2-5 words), no numbering.`,
      experimental_output: Output.object({
        schema: z.object({ topics: z.array(z.string()).min(6).max(12) }),
      }),
    });
    return { topics: output.topics };
  });

// ------- Create session + lesson -------
export const startSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ grade: gradeSchema, subject: subjectSchema, topic: z.string().min(1).max(120) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const m = await model();
    const { text } = await generateText({
      model: m,
      prompt: `Write a clear, engaging study note for a grade ${data.grade} Indian student on the topic "${data.topic}" in ${data.subject}.

Format as Markdown with these sections:
## Overview (2-3 sentences)
## Key Concepts (bullets with bold terms)
## Important Formulas / Definitions (in a list, use $$inline LaTeX$$ where helpful)
## Worked Example (1-2 fully solved problems with steps)
## Quick Tips for JEE/NEET (3 short tips)
## Common Mistakes (3 bullets)

Keep it accurate, NCERT-aligned, and concise (~600 words).`,
    });

    const { data: row, error } = await context.supabase
      .from("study_sessions")
      .insert({
        user_id: context.userId,
        grade: data.grade,
        subject: data.subject,
        topic: data.topic,
        lesson_md: text,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { sessionId: row.id, lesson: text };
  });

export const getSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ sessionId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("study_sessions")
      .select("*")
      .eq("id", data.sessionId)
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

// ------- Quiz generation -------
const quizSchema = z.object({
  questions: z
    .array(
      z.object({
        q: z.string(),
        choices: z.array(z.string()).length(4),
        answer: z.number().int().min(0).max(3),
        explanation: z.string(),
      }),
    )
    .min(5)
    .max(10),
});
export type Quiz = z.infer<typeof quizSchema>;

export const generateQuiz = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        sessionId: z.string().uuid().optional(),
        grade: gradeSchema,
        subject: subjectSchema,
        topic: z.string().min(1).max(120),
        count: z.number().int().min(5).max(10).default(5),
        mode: z.enum(["practice", "timed", "weekly"]).default("practice"),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const m = await model();
    const { output } = await generateText({
      model: m,
      prompt: `Create ${data.count} multiple-choice questions for a grade ${data.grade} Indian student on "${data.topic}" in ${data.subject}.
Difficulty: ${data.mode === "weekly" ? "mixed JEE/NEET level" : "NCERT + JEE/NEET style"}. Each question must have exactly 4 choices, one correct answer (0-indexed), and a 1-2 sentence explanation. Use clear, plain text (no LaTeX delimiters).`,
      experimental_output: Output.object({ schema: quizSchema }),
    });

    const { data: row, error } = await context.supabase
      .from("quiz_attempts")
      .insert({
        user_id: context.userId,
        session_id: data.sessionId ?? null,
        grade: data.grade,
        subject: data.subject,
        topic: data.topic,
        questions: output.questions,
        total: output.questions.length,
        mode: data.mode,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { attemptId: row.id, questions: output.questions };
  });

// ------- Grade quiz -------
export const submitQuiz = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        attemptId: z.string().uuid(),
        answers: z.array(z.number().int().min(0).max(3)),
        timeTakenSeconds: z.number().int().min(0).max(36000),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: attempt, error } = await context.supabase
      .from("quiz_attempts")
      .select("id, user_id, questions, session_id, subject, topic")
      .eq("id", data.attemptId)
      .single();
    if (error || !attempt) throw new Error(error?.message ?? "Attempt not found");

    const questions = attempt.questions as Quiz["questions"];
    let score = 0;
    questions.forEach((q, i) => {
      if (data.answers[i] === q.answer) score += 1;
    });
    const xp = score * 5;

    await context.supabase
      .from("quiz_attempts")
      .update({
        answers: data.answers,
        score,
        time_taken_seconds: data.timeTakenSeconds,
      })
      .eq("id", data.attemptId);

    if (attempt.session_id) {
      await context.supabase
        .from("study_sessions")
        .update({ completed: true, xp_awarded: 10 })
        .eq("id", attempt.session_id);
    }

    // Update profile XP + streak
    const { data: profile } = await context.supabase
      .from("profiles")
      .select("total_xp, current_streak, last_active_date")
      .eq("id", context.userId)
      .single();

    const today = new Date().toISOString().slice(0, 10);
    let newStreak = profile?.current_streak ?? 0;
    if (profile?.last_active_date !== today) {
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      newStreak = profile?.last_active_date === yesterday ? newStreak + 1 : 1;
    }

    await context.supabase
      .from("profiles")
      .update({
        total_xp: (profile?.total_xp ?? 0) + xp + (attempt.session_id ? 10 : 0),
        current_streak: newStreak,
        last_active_date: today,
      })
      .eq("id", context.userId);

    return { score, total: questions.length, xpEarned: xp + (attempt.session_id ? 10 : 0) };
  });

// ------- Dashboard -------
export const getDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [{ data: profile }, { data: sessions }, { data: attempts }] = await Promise.all([
      context.supabase.from("profiles").select("*").eq("id", context.userId).single(),
      context.supabase
        .from("study_sessions")
        .select("id, subject, topic, completed, created_at")
        .eq("user_id", context.userId)
        .order("created_at", { ascending: false })
        .limit(20),
      context.supabase
        .from("quiz_attempts")
        .select("subject, score, total, created_at")
        .eq("user_id", context.userId)
        .order("created_at", { ascending: false })
        .limit(50),
    ]);
    return {
      profile,
      sessions: sessions ?? [],
      attempts: attempts ?? [],
    };
  });
