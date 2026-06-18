# StudyGenie 9–12 Upgrade

Focused rebuild of the learner-facing surface. Backend tables stay; we widen the subject list, add three new sections, and tune the AI tutor for simple student language.

## 1. Class & Subject scope

- Grade picker reduced to **9, 10, 11, 12** on Home and everywhere a grade is asked.
- Subject list replaced with: **Mathematics, Physics, Chemistry, Biology, English, EVS, Social Studies**.
- Tapping **Social Studies** opens a sub-picker: History, Civics, Geography, Disaster Management, Road Safety Education. The chosen sub-subject is stored as the `topic` parent context.
- Server enum widens accordingly; existing `Math/Science` rows still readable (we accept legacy values).

## 2. Bottom navigation

Five tabs: **Learn | Tutor | Homework | Exams | Progress**. Mobile bottom bar grows to 5 columns; desktop header gets the same links.

## 3. New section — Competitive Exams (`/exams`)

Separate route, not mixed with school flow. User picks an exam track (JEE, NEET, CUET, Olympiad, NTSE, Other) then a topic. Server functions:

- `listExamTracks` (static list)
- `startExamLesson(track, topic)` — generates: easy explanation → solved examples → practice questions
- `generateChapterTest(track, topic)` — 10 Q chapter test
- `generateTestSeries(track)` — 25 Q mixed test
- Reuses `quiz_attempts` with new `mode='exam'` + `exam_track` column

Progress for exams shown in the Progress page under its own card.

## 4. NCERT Library (`/ncert`)

- Pick **Class** then **Subject** → AI returns NCERT chapter list (cached per class+subject).
- Chapter detail page: AI generates structured lesson with sections — *Easy Explanation, Notes, Worked Examples, Diagrams (described in markdown / simple ASCII or emoji), Important Questions with Answers, Step-by-Step Recap*.
- "Ask Tutor about this chapter" button opens a tutor thread pre-seeded with chapter context.

## 5. Homework (`/homework`)

- Camera/file input (`<input type="file" accept="image/*" capture="environment">`).
- Uploads image as base64 to `solveHomework` server fn → Gemini multimodal (chat-completions endpoint with `image_url` data URL, since AI SDK message converter blocks non-wav audio but images are fine).
- Returns: detected questions, step-by-step solutions, neat-notes markdown.
- Stored in new `homework_items` table (image stored as data URL string for simplicity; small images only — we downscale client-side to ~1024px).
- History list on `/homework` with thumbnail + topic.

## 6. AI Tutor tone

System prompt updated everywhere: "Explain like a friendly senior teaching a Class 9–12 Indian student. Use very simple words. Short notes. Bit-by-bit steps. Always give an example before the exercise. Use small diagrams (ASCII / emoji / markdown tables) when helpful. Avoid jargon."

## 7. Database migration

New columns/tables:

```sql
ALTER TABLE quiz_attempts ADD COLUMN exam_track text;
ALTER TABLE study_sessions ADD COLUMN section text DEFAULT 'school'; -- 'school' | 'exam' | 'ncert'
ALTER TABLE study_sessions ADD COLUMN sub_subject text;

CREATE TABLE homework_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  image_data_url text not null,
  questions jsonb,
  solution_md text,
  notes_md text,
  created_at timestamptz not null default now()
);
-- + GRANTs + RLS scoped to auth.uid()
```

Grade check loosened (we keep int 1–12 to avoid breaking old rows) but UI only offers 9–12.

## 8. UI / Design

Keep the warm reddish-orange rounded look. New cards use the same `rounded-2xl`, `border-border`, primary accent. Subject grid becomes a 2-col mobile / 3-col tablet layout with subject-color chips (Math, Physics, Chem, Bio, Eng, EVS, Social each get a token color). Bottom nav uses `grid-cols-5`.

## Out of scope

- OCR fine-tuning beyond what Gemini provides.
- Real diagrams (we describe / use simple SVG-ish markdown). No image generation in lessons.
- Per-board (CBSE/ICSE/State) variants — assume NCERT/CBSE.

## Build order

1. Migration (schema additions)
2. Subject/grade refactor on Home + tutor prompt
3. Bottom nav → 5 tabs
4. NCERT Library route + server fns
5. Competitive Exams route + server fns
6. Homework route + multimodal server fn + table writes
7. Progress page: add Exams + Homework summaries
8. Polish (responsive, empty states)
