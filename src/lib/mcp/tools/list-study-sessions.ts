import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, notAuthenticated } from "../supabase";

export default defineTool({
  name: "list_study_sessions",
  title: "List study sessions",
  description: "List the signed-in student's recent GenieMey AI study sessions (topic, subject, grade, completion).",
  inputSchema: {
    limit: z.number().int().min(1).max(50).optional().describe("How many sessions to return (default 10)."),
    subject: z.string().optional().describe("Optional subject filter, e.g. Maths or Science."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit, subject }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("study_sessions")
      .select("id, topic, subject, sub_subject, section, grade, completed, xp_awarded, updated_at")
      .order("updated_at", { ascending: false })
      .limit(limit ?? 10);
    if (subject) query = query.ilike("subject", subject);
    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { sessions: data ?? [] },
    };
  },
});
