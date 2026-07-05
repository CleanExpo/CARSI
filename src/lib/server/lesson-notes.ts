/**
 * Durable lesson-notes service (GP-459).
 *
 * Replaces the former in-memory `notesStore` in `app/api/lms/[[...path]]/route.ts`. Persistence is
 * `LmsLessonNote`, upserted by (user_id, lesson_id). The denormalised title columns are captured at
 * save time so `GET /api/lms/notes/me` can render the notes list without joining the course
 * catalogue (which lives outside this DB).
 *
 * The DTO mapper is pure so it can be unit-tested without a database (repo test convention). The
 * JSON shape (snake_case) exactly matches `LessonNoteOut` consumed by
 * `app/(dashboard)/dashboard/student/notes/page.tsx` and `src/components/lms/LearnCourseShell.tsx`.
 */

import { prisma } from '@/lib/prisma';

/** The JSON shape the notes UI consumes (`LessonNoteOut`). */
export type LessonNoteDto = {
  id: string;
  lesson_id: string;
  lesson_title: string;
  module_title: string | null;
  course_title: string;
  course_slug: string;
  content: string | null;
  updated_at: string | null;
};

/** Subset of the persisted `LmsLessonNote` row the DTO mapper needs. */
type LessonNoteRow = {
  id: string;
  lessonId: string;
  lessonTitle: string | null;
  moduleTitle: string | null;
  courseTitle: string | null;
  courseSlug: string | null;
  content: string;
  updatedAt: Date;
};

/** Pure row -> DTO mapper (snake_case, defaults matching the previous stub). */
export function toLessonNoteDto(row: LessonNoteRow): LessonNoteDto {
  return {
    id: row.id,
    lesson_id: row.lessonId,
    lesson_title: row.lessonTitle ?? 'Lesson note',
    module_title: row.moduleTitle ?? null,
    course_title: row.courseTitle ?? 'Course',
    course_slug: row.courseSlug ?? 'course',
    content: row.content,
    updated_at: row.updatedAt.toISOString(),
  };
}

/** Metadata that may accompany a note upsert (from the lesson view). */
export type LessonNoteMetadata = {
  courseSlug?: string;
  courseTitle?: string;
  lessonTitle?: string;
  moduleTitle?: string | null;
};

/** All notes for a user, newest-updated first (mirrors the former stub ordering). */
export async function listNotesForUser(userId: string): Promise<LessonNoteDto[]> {
  const rows = await prisma.lmsLessonNote.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
  });
  return rows.map(toLessonNoteDto);
}

/**
 * Create or update the note for (user, lesson). Denormalised titles are only overwritten when a
 * non-empty value is supplied, so a metadata-less save (e.g. the inline editor sending just
 * `content`) preserves the titles captured on the first save.
 */
export async function upsertNote(
  userId: string,
  lessonId: string,
  content: string,
  meta: LessonNoteMetadata
): Promise<LessonNoteDto> {
  const courseSlug = meta.courseSlug?.trim() || undefined;
  const courseTitle = meta.courseTitle?.trim() || undefined;
  const lessonTitle = meta.lessonTitle?.trim() || undefined;
  const moduleTitle =
    typeof meta.moduleTitle === 'string' && meta.moduleTitle.trim() ? meta.moduleTitle : undefined;

  const row = await prisma.lmsLessonNote.upsert({
    where: { userId_lessonId: { userId, lessonId } },
    create: {
      userId,
      lessonId,
      content,
      lessonTitle: lessonTitle ?? null,
      moduleTitle: moduleTitle ?? null,
      courseTitle: courseTitle ?? null,
      courseSlug: courseSlug ?? null,
    },
    update: {
      content,
      // Only overwrite titles when a fresh value is provided (keeps first-save metadata otherwise).
      ...(lessonTitle !== undefined ? { lessonTitle } : {}),
      ...(moduleTitle !== undefined ? { moduleTitle } : {}),
      ...(courseTitle !== undefined ? { courseTitle } : {}),
      ...(courseSlug !== undefined ? { courseSlug } : {}),
    },
  });

  return toLessonNoteDto(row);
}

/** Delete the note for (user, lesson). Idempotent — no error if it does not exist. */
export async function deleteNote(userId: string, lessonId: string): Promise<void> {
  await prisma.lmsLessonNote.deleteMany({ where: { userId, lessonId } });
}
