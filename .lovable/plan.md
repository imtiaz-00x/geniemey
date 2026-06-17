## StudyGenie — AI Learning App for 11-12 (Math & Science)

A focused study app where students pick a grade and topic, get AI-generated lessons and quizzes, chat with an AI tutor about doubts (with threaded history), and track their progress.

### Tech & backend

- TanStack Start + React + Tailwind (existing stack)
- Lovable Cloud for auth (email + Google), database, and storing chats/progress
- Lovable AI Gateway (`google/gemini-3-flash-preview`) for lessons, quizzes, and tutor
- AI Elements for the tutor chat surface

### Auth

- Email/password + Google sign-in
- A `profiles` table (display name, avatar) auto-created on signup
- Protected app routes live under `_authenticated/`

### Core pages

1. `**/auth**` — sign in / sign up
2. `/` **(home, authenticated)** — Pick grade (11-12) and subject (Math / Science), then choose a topic from a generated topic list or type a custom topic. Shows weekly streak, XP, and "Continue learning" card.
3. `**/learn/$session**` — A study session for the chosen topic:
  - **Lesson** tab: AI-generated explanation with examples, formulas, diagrams-in-text
  - **Quiz** tab: 5–10 MCQs with instant feedback + explanation
  - **Ask tutor** button → opens a new tutor thread pre-loaded with topic context
  - On completion: XP awarded, topic marked complete, recorded in progress
  - Easy Notes for each chapters from each subjects.
  - Easy diagrams and illustrations wherever necessary 
  - Practice questions banks and NCERT exemplar
  - Focus on the difficulty level of NEET and JEE exams and make the preparation easier.
  - Practice sets for problems 
  - Tests with minimum questions in minimum time in rounds and especially a weekend full chapter test from each chapter.

&nbsp;

1. `**/tutor**` — threaded AI tutor chat
  - Sidebar with past threads (rename/delete)
  - New thread auto-titles from first question
  - Each thread at `/tutor/$threadId`
  - Built with AI Elements (Conversation, Message, PromptInput, Shimmer)
2. `**/progress**` — dashboard
  - Streak, total XP, topics completed by subject
  - Quiz accuracy over time
  - Per-subject mastery bars

### Data model (Lovable Cloud)

- `profiles` — id (=auth user), display_name, avatar_url, current_streak, last_active_date, total_xp
- `study_sessions` — id, user_id, grade, subject, topic, lesson_md, completed, xp_awarded, created_at
- `quiz_attempts` — id, session_id, user_id, questions(jsonb), score, total, created_at, timer 
- `tutor_threads` — id, user_id, title, grade, subject, updated_at
- `tutor_messages` — id, thread_id, user_id, role, parts(jsonb), created_at
- RLS: every table scoped to `auth.uid()`; explicit GRANTs to `authenticated`

### Server functions (`src/lib/*.functions.ts`)

- `generateLesson({ grade, subject, topic })` → markdown lesson via Lovable AI
- `generateQuiz({ grade, subject, topic })` → structured MCQs via AI SDK `Output.object` with Zod schema
- `gradeQuiz({ sessionId, answers })` → score, update XP/streak
- `suggestTopics({ grade, subject })` → 8 topic chips
- `listThreads` / `createThread` / `renameThread` / `deleteThread`
- `loadThreadMessages({ threadId })`
- Chat streaming endpoint at `src/routes/api/chat.ts` using `streamText` + `toUIMessageStreamResponse`, persisting messages in `onFinish` with thread context (grade/subject) injected into the system prompt
- All protected by `requireSupabaseAuth`

### Design direction

- Friendly, school-appropriate: rounded cards, soft pastels, clear typography, big readable text
- Math = blue accent, Science = green accent
- Mobile-first (current viewport is mobile)
- Subject-specific iconography (no generic Sparkles for tutor identity — generate a small mascot/logo)
- Overal red orange mix theme.

### Gamification (lightweight)

- +10 XP per lesson completed, +5 XP per correct quiz answer
- Daily streak increments when any session is completed
- Visible streak flame + XP badge in header

### Out of scope for v1

- Parent/teacher dashboards
- Payments
- Voice input
- Real-time collaboration

### Build order

1. Enable Lovable Cloud + provision Lovable AI key
2. DB migration (profiles + tables + RLS + GRANTs + signup trigger)
3. Auth page + `_authenticated` integration
4. Home (grade/subject/topic picker) + topic suggestions server fn
5. Study session page: lesson + quiz generation + grading + performance certificate 
6. Tutor threaded chat (AI Elements + chat route)
7. Progress dashboard
8. Polish: design tokens, mascot/logo, streak header