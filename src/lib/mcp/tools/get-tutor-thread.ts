import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, notAuthenticated } from "../supabase";

type Part = { type?: string; text?: string };

function partsToText(parts: unknown): string {
  if (!Array.isArray(parts)) return "";
  return (parts as Part[])
    .map((p) => (typeof p?.text === "string" ? p.text : ""))
    .filter(Boolean)
    .join("\n");
}

export default defineTool({
  name: "get_tutor_thread",
  title: "Read a tutor chat",
  description: "Read the messages of one of the signed-in student's GenieMey AI tutor chat threads.",
  inputSchema: {
    threadId: z.string().describe("The tutor thread id from list_tutor_threads."),
    limit: z.number().int().min(1).max(100).optional().describe("Max messages to return (default 40)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ threadId, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const supabase = supabaseForUser(ctx);
    const { data: thread, error: threadErr } = await supabase
      .from("tutor_threads")
      .select("id, title, grade, subject, topic")
      .eq("id", threadId)
      .maybeSingle();
    if (threadErr) return { content: [{ type: "text", text: threadErr.message }], isError: true };
    if (!thread) return { content: [{ type: "text", text: "Thread not found." }], isError: true };

    const { data, error } = await supabase
      .from("tutor_messages")
      .select("id, role, parts, created_at")
      .eq("thread_id", threadId)
      .order("created_at", { ascending: true })
      .limit(limit ?? 40);
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };

    const messages = (data ?? []).map((m) => ({
      role: m.role,
      created_at: m.created_at,
      text: partsToText(m.parts),
    }));
    return {
      content: [{ type: "text", text: JSON.stringify({ thread, messages }, null, 2) }],
      structuredContent: { thread, messages },
    };
  },
});
