import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateText, Output } from "ai";
import { z } from "zod";

export const SUBJECTS = [
  "Mathematics",
  "Physics",
  "Chemistry",
  "Biology",
  "English",
  "EVS",
  "Social Studies",
] as const;

export const SOCIAL_BRANCHES = [
  "History",
  "Civics",
  "Geography",
  "Disaster Management",
  "Road Safety Education",
] as const;

export const EXAM_TRACKS = ["JEE", "NEET", "CUET", "Olympiad", "NTSE", "Foundation"] as const;

const subjectSchema = z.string().min(1).max(40);
const gradeSchema = z.number().int().min(1).max(12);
const sectionSchema = z.enum(["school", "ncert", "exam"]).default("school");

function model() {
  return (async () => {
    const { createLovableAiGatewayProvider, getLovableApiKey } = await import("./ai-gateway.server");
    return createLovableAiGatewayProvider(getLovableApiKey())("google/gemini-3-flash-preview");
  })();
}

const TONE = `Explain like a friendly senior teaching an Indian Class 9-12 student. Use very simple words, short sentences, and bit-by-bit steps. Always give an example before the exercise. Use small markdown tables, ASCII diagrams, or emoji where helpful. Avoid jargon.`;

// ------- Topic suggestions -------
export const suggestTopics = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      grade: gradeSchema,
      subject: subjectSchema,
      subSubject: z.string().optional(),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    const m = await model();
    const focus = data.subSubject ? `${data.subject} → ${data.subSubject}` : data.subject;
    const { output } = await generateText({
      model: m,
      prompt: `List 10 important NCERT chapter/topic names for Class ${data.grade} Indian student studying ${focus}. Short names (2-5 words), no numbering.`,
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
    z.object({
      grade: gradeSchema,
      subject: subjectSchema,
      topic: z.string().min(1).max(160),
      subSubject: z.string().optional(),
      section: sectionSchema.optional(),
      examTrack: z.string().optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const m = await model();
    const section = data.section ?? "school";
    const focus = data.subSubject ? `${data.subject} (${data.subSubject})` : data.subject;
    const header =
      section === "exam"
        ? `Write a focused study note for an Indian Class ${data.grade} student preparing for ${data.examTrack ?? "competitive exam"} on "${data.topic}".`
        : section === "ncert"
        ? `Write a Class ${data.grade} NCERT chapter explainer for "${data.topic}" in ${focus}.`
        : `Write a friendly study note for an Indian Class ${data.grade} student on "${data.topic}" in ${focus}.`;

    const { text } = await generateText({
      model: m,
      prompt: `${header}

${TONE}

Use this Markdown structure:
## Easy Explanation (3-4 short sentences in simple words)
## Key Points (bullets with **bold** key terms)
## Important Formulas / Definitions (list, use $...$ or $$...$$ for math)
## Diagram (simple ASCII / emoji / markdown table that shows the idea)
## Solved Example (1-2 fully worked problems, step by step)
## Important Questions with Answers (3 Q&A, short answers)
## Quick Recap (3 bullets a student can revise in 30 seconds)
## Common Mistakes (3 bullets)

Keep it accurate, NCERT-aligned, ~650 words.`,
    });

    const { data: row, error } = await context.supabase
      .from("study_sessions")
      .insert({
        user_id: context.userId,
        grade: data.grade,
        subject: data.subject,
        topic: data.topic,
        lesson_md: text,
        section,
        sub_subject: data.subSubject ?? null,
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

// ------- NCERT chapter list -------
export const listNcertChapters = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ grade: gradeSchema, subject: subjectSchema, subSubject: z.string().optional() }).parse(d),
  )
  .handler(async ({ data }) => {
    const m = await model();
    const focus = data.subSubject ? `${data.subject} → ${data.subSubject}` : data.subject;
    const { output } = await generateText({
      model: m,
      prompt: `List the official NCERT textbook chapters for Class ${data.grade} ${focus} in order. Give each chapter's number and full title.`,
      experimental_output: Output.object({
        schema: z.object({
          chapters: z.array(z.object({ number: z.number().int(), title: z.string() })).min(4).max(20),
        }),
      }),
    });
    return { chapters: output.chapters };
  });

// ------- Quiz generation -------
const quizSchema = z.object({
  questions: z.array(
    z.object({
      q: z.string(),
      choices: z.array(z.string()).length(4),
      answer: z.number().int().min(0).max(3),
      explanation: z.string(),
    }),
  ).min(5).max(25),
});
export type Quiz = z.infer<typeof quizSchema>;

function extractQuizJson(raw: string, count: number): Quiz["questions"] | null {
  let s = (raw ?? "").trim();
  s = s.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  const start = s.search(/[\[{]/);
  const openChar = start >= 0 ? s[start] : "";
  const endChar = openChar === "[" ? "]" : "}";
  const end = s.lastIndexOf(endChar);
  if (start < 0 || end < 0) return null;
  s = s.slice(start, end + 1).replace(/,\s*([}\]])/g, "$1").replace(/[\x00-\x1F\x7F]/g, " ");
  let parsed: any;
  try { parsed = JSON.parse(s); } catch { return null; }
  const arr = Array.isArray(parsed) ? parsed : parsed?.questions;
  if (!Array.isArray(arr) || arr.length === 0) return null;
  const out: Quiz["questions"] = [];
  for (const it of arr) {
    if (!it || typeof it !== "object") continue;
    const q = String(it.question ?? it.q ?? "").trim();
    const options = it.options ?? it.choices;
    const ans = it.correctAnswer ?? it.answer;
    const expl = String(it.explanation ?? "").trim() || "—";
    if (!q || !Array.isArray(options) || options.length !== 4) continue;
    const choices = options.map((o: unknown) => String(o));
    const a = Number(ans);
    if (!Number.isInteger(a) || a < 0 || a > 3) continue;
    out.push({ q, choices, answer: a, explanation: expl });
  }
  if (out.length === 0) return null;
  return out.slice(0, count);
}

function fallbackQuiz(topic: string, subject: string, count: number): Quiz["questions"] {
  const items: Quiz["questions"] = [];
  for (let i = 1; i <= count; i++) {
    items.push({
      q: `Quick check ${i}: Which statement best describes a key idea of "${topic}" in ${subject}?`,
      choices: [
        `It is a core concept of ${topic}.`,
        `It is unrelated to ${subject}.`,
        `It only applies outside ${subject}.`,
        `It has no definition.`,
      ],
      answer: 0,
      explanation: `Review the chapter "${topic}" — option 1 reflects its main idea.`,
    });
  }
  return items;
}

async function tryGenerateQuestions(
  prompt: string,
  count: number,
): Promise<Quiz["questions"] | null> {
  const m = await model();
  try {
    const { text } = await generateText({ model: m, prompt });
    return extractQuizJson(text, count);
  } catch {
    return null;
  }
}

export const generateQuiz = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      sessionId: z.string().uuid().optional(),
      grade: gradeSchema,
      subject: subjectSchema,
      topic: z.string().min(1).max(160),
      count: z.number().int().min(5).max(25).default(5),
      mode: z.enum(["practice", "timed", "weekly", "exam", "series"]).default("practice"),
      examTrack: z.string().optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const difficulty =
      data.mode === "exam" || data.mode === "series"
        ? `${data.examTrack ?? "competitive exam"} level`
        : data.mode === "weekly"
        ? "mixed (NCERT + tougher)"
        : "NCERT level";

    const basePrompt = `You are a quiz generator. Return ONLY valid JSON (no markdown, no code fences, no commentary, no prose).
Create ${data.count} multiple-choice questions for an Indian Class ${data.grade} student on "${data.topic}" in ${data.subject}. Difficulty: ${difficulty}.
Use simple student language. Plain text only (no LaTeX delimiters like $ or $$).
Exactly this JSON shape:
{"title":"Quiz","questions":[{"question":"...","options":["A","B","C","D"],"correctAnswer":0,"explanation":"short"}]}
Rules: exactly 4 options per question, correctAnswer is the 0-indexed integer of the right option, explanation is 1-2 short sentences. Output ONLY the JSON object.`;

    let questions = await tryGenerateQuestions(basePrompt, data.count);
    if (!questions) {
      questions = await tryGenerateQuestions(
        basePrompt + "\n\nIMPORTANT: Your previous attempt was invalid. Return ONLY the JSON object now.",
        data.count,
      );
    }
    if (!questions) {
      questions = fallbackQuiz(data.topic, data.subject, data.count);
    }

    const { data: row, error } = await context.supabase
      .from("quiz_attempts")
      .insert({
        user_id: context.userId,
        session_id: data.sessionId ?? null,
        grade: data.grade,
        subject: data.subject,
        topic: data.topic,
        questions,
        total: questions.length,
        mode: data.mode,
        exam_track: data.examTrack ?? null,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { attemptId: row.id, questions };
  });

// ------- Grade quiz -------
export const submitQuiz = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      attemptId: z.string().uuid(),
      answers: z.array(z.number().int().min(0).max(3)),
      timeTakenSeconds: z.number().int().min(0).max(36000),
    }).parse(d),
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
    const [{ data: profile }, { data: sessions }, { data: attempts }, { data: homework }] =
      await Promise.all([
        context.supabase.from("profiles").select("*").eq("id", context.userId).single(),
        context.supabase
          .from("study_sessions")
          .select("id, subject, topic, completed, section, created_at")
          .eq("user_id", context.userId)
          .order("created_at", { ascending: false })
          .limit(20),
        context.supabase
          .from("quiz_attempts")
          .select("subject, score, total, mode, exam_track, created_at")
          .eq("user_id", context.userId)
          .order("created_at", { ascending: false })
          .limit(50),
        context.supabase
          .from("homework_items")
          .select("id, title, created_at")
          .eq("user_id", context.userId)
          .order("created_at", { ascending: false })
          .limit(10),
      ]);
    return {
      profile,
      sessions: sessions ?? [],
      attempts: attempts ?? [],
      homework: homework ?? [],
    };
  });
