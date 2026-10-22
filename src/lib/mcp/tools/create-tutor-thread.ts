import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, notAuthenticated } from "../supabase";

export default defineTool({
  name: "create_tutor_thread",
  title: "Start a tutor chat",
  description:
    "Create a new GenieMey AI tutor chat thread for the signed-in student so they can continue it inside the app.",
  inputSchema: {
    title: z.string().trim().describe("Short title for the chat, e.g. 'Trigonometry doubts'."),
    grade: z.number().int().min(9).max(12).optional().describe("Class/grade 9-12."),
    subject: z.string().optional().describe("Subject, e.g. Maths or Science."),
    topic: z.string().optional().describe("Topic the chat is about."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ title, grade, subject, topic }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("tutor_threads")
      .insert({
        user_id: ctx.getUserId()!,
        title: title || "New chat",
        grade: grade ?? null,
        subject: subject ?? null,
        topic: topic ?? null,
      })
      .select("id, title, grade, subject, topic")
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { thread: data },
    };
  },
});
