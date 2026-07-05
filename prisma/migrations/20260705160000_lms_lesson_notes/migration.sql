-- GP-459 (2026-07-05): durable lesson notes (LmsLessonNote).
-- Additive only — a brand-new table (lms_lesson_notes), no data dependency, so no pre-check.
-- Replaces the former in-memory notesStore in app/api/lms/[[...path]]/route.ts. Rows are upserted
-- by (user_id, lesson_id); the denormalised title columns let GET /api/lms/notes/me render the
-- notes list without joining the (external) course catalogue.

-- CreateTable
CREATE TABLE "lms_lesson_notes" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "lesson_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "lesson_title" TEXT,
    "module_title" TEXT,
    "course_title" TEXT,
    "course_slug" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lms_lesson_notes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "lms_lesson_notes_user_id_lesson_id_key" ON "lms_lesson_notes"("user_id", "lesson_id");

-- CreateIndex
CREATE INDEX "lms_lesson_notes_user_id_updated_at_idx" ON "lms_lesson_notes"("user_id", "updated_at");

-- AddForeignKey
ALTER TABLE "lms_lesson_notes" ADD CONSTRAINT "lms_lesson_notes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "lms_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
