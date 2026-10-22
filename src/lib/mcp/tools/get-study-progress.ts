import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, notAuthenticated } from "../supabase";

export default defineTool({
  name: "get_study_progress",
  title: "Get study progress",
  description:
    "Get the signed-in student's GenieMey AI progress summary: XP, streak, completed sessions and recent quiz scores.",
  inputSchema: {
    recentQuizzes: z
      .number()
      .int()
      .min(1)
      .max(25)
      .optional()
      .describe("How many recent quiz attempts to include (default 5)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ recentQuizzes }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const supabase = supabaseForUser(ctx);
    const [profileRes, sessionsRes, quizRes] = await Promise.all([
      supabase
        .from("profiles")
        .select("display_name, username, total_xp, current_streak, last_active_date")
        .eq("id", ctx.getUserId()!)
        .maybeSingle(),
      supabase.from("study_sessions").select("id, completed"),
      supabase
        .from("quiz_attempts")
        .select("id, subject, topic, grade, mode, score, total, exam_track, created_at")
        .order("created_at", { ascending: false })
        .limit(recentQuizzes ?? 5),
    ]);
    const error = profileRes.error ?? sessionsRes.error ?? quizRes.error;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };

    const sessions = sessionsRes.data ?? [];
    const summary = {
      profile: profileRes.data,
      sessionsTotal: sessions.length,
      sessionsCompleted: sessions.filter((s) => s.completed).length,
      recentQuizzes: quizRes.data ?? [],
    };
    return {
      content: [{ type: "text", text: JSON.stringify(summary, null, 2) }],
      structuredContent: summary,
    };
  },
});
