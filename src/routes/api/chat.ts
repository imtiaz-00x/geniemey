import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

type Body = {
  messages?: UIMessage[];
  threadId?: string;
  persistMode?: "append" | "assistantOnly";
};

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authHeader = request.headers.get("authorization") ?? "";
        const token = authHeader.replace(/^Bearer\s+/i, "");

        if (!token) {
          return new Response("Unauthorized", { status: 401 });
        }

        const { messages, threadId, persistMode = "append" } =
          (await request.json()) as Body;

        if (!Array.isArray(messages) || !threadId) {
          return new Response("messages and threadId required", {
            status: 400,
          });
        }

        const supabase = createClient<Database>(
          process.env.SUPABASE_URL!,
          process.env.SUPABASE_PUBLISHABLE_KEY!,
          {
            global: {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            },
            auth: {
              storage: undefined,
              persistSession: false,
              autoRefreshToken: false,
            },
          },
        );

        const { data: userData, error: userErr } =
          await supabase.auth.getUser(token);

        if (userErr || !userData.user) {
          return new Response("Unauthorized", { status: 401 });
        }

        const userId = userData.user.id;

        const { data: thread } = await supabase
          .from("tutor_threads")
          .select("id, title, grade, subject, topic")
          .eq("id", threadId)
          .eq("user_id", userId)
          .maybeSingle();

        if (!thread) {
          return new Response("Thread not found", { status: 404 });
        }

        // Gemini AI provider
        const { createGeminiProvider } = await import(
          "@/lib/ai-gateway.server"
        );

        const gemini = createGeminiProvider();

        const ctx = [
          thread.grade ? `Student grade: ${thread.grade}.` : "",
          thread.subject ? `Subject: ${thread.subject}.` : "",
          thread.topic ? `Current topic: ${thread.topic}.` : "",
        ]
          .filter(Boolean)
          .join(" ");

        const system = `You are GenieMey AI, a friendly AI tutor for Indian Class 9-12 students. ${ctx}

- Explain like a senior helping a younger student.
- Use very simple words and short sentences.
- Explain concepts step-by-step.
- Always show a small example BEFORE giving an exercise.
- Use small ASCII / emoji diagrams or markdown tables when helpful.
- Keep notes short and exam-friendly.
- Avoid unnecessary jargon and difficult wording.
- When solving numerical problems, show the formula, substitution, calculation, and final answer clearly.
- For school questions, give answers suitable for the student's class level.
- Wrap inline math in $...$ and block math in $$...$$ when needed.`;

        const result = streamText({
          model: gemini("gemini-3.6-flash"),
          system,
          messages: await convertToModelMessages(messages),
        });

        return result.toUIMessageStreamResponse({
          originalMessages: messages,

          onFinish: async ({ messages: finalMessages }) => {
            try {
              const last = finalMessages[finalMessages.length - 1];
              const prevUser = finalMessages[finalMessages.length - 2];

              const toInsert =
                persistMode === "assistantOnly"
                  ? [last].filter(
                      (m): m is UIMessage =>
                        !!m && m.role === "assistant",
                    )
                  : [prevUser, last].filter(
                      (m): m is UIMessage => !!m,
                    );

              const rows = toInsert.map((m) => ({
                thread_id: threadId,
                user_id: userId,
                role: m.role,
                parts: m.parts as unknown as object,
              }));

              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              if (rows.length) {
                await supabase
                  .from("tutor_messages")
                  .insert(rows as any);
              }

              // Auto-title from first user message
              if (thread.title === "New chat") {
                const firstUser = finalMessages.find(
                  (m) => m.role === "user",
                );

                const text =
                  firstUser?.parts
                    ?.map((p) =>
                      "text" in p
                        ? (p as { text: string }).text
                        : "",
                    )
                    .join(" ")
                    .slice(0, 60) ?? "Chat";

                await supabase
                  .from("tutor_threads")
                  .update({
                    title: text || "Chat",
                    updated_at: new Date().toISOString(),
                  })
                  .eq("id", threadId);
              } else {
                await supabase
                  .from("tutor_threads")
                  .update({
                    updated_at: new Date().toISOString(),
                  })
                  .eq("id", threadId);
              }
            } catch (e) {
              console.error("Persist chat error", e);
            }
          },
        });
      },
    },
  },
});