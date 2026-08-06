import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, notAuthenticated } from "../supabase";

export default defineTool({
  name: "list_tutor_threads",
  title: "List tutor chats",
  description: "List the signed-in student's GenieMey AI tutor chat threads with their subject and topic.",
  inputSchema: {
    limit: z.number().int().min(1).max(50).optional().describe("How many threads to return (default 15)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("tutor_threads")
      .select("id, title, grade, subject, topic, updated_at")
      .order("updated_at", { ascending: false })
      .limit(limit ?? 15);
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { threads: data ?? [] },
    };
  },
});
