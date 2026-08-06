import { auth, defineMcp } from "@lovable.dev/mcp-js";

import listStudySessions from "./tools/list-study-sessions";
import getStudyProgress from "./tools/get-study-progress";
import listTutorThreads from "./tools/list-tutor-threads";
import getTutorThread from "./tools/get-tutor-thread";
import createTutorThread from "./tools/create-tutor-thread";

// Must be the direct Supabase host: the published SUPABASE_URL is a proxy the
// OAuth issuer check rejects. VITE_SUPABASE_PROJECT_ID is inlined at build time.
const projectRef = import.meta.env["VITE_SUPABASE_PROJECT_ID"] ?? "project-ref-unset";

export default defineMcp({
  name: "geniemey",
  title: "GenieMey",
  version: "0.1.0",
  instructions:
    "Tools for GenieMey AI, a Class 9-12 Maths & Science study app. Read the signed-in student's study sessions, progress and XP, browse and read their AI tutor chats, and start new tutor threads they can continue in the app.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listStudySessions, getStudyProgress, listTutorThreads, getTutorThread, createTutorThread],
});
