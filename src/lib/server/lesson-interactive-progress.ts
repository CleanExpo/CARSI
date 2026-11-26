import type { Prisma } from '@/generated/prisma/client';

import { getInteractiveExperienceById } from '@/lib/lms/interactive-experience-registry';
import { prisma } from '@/lib/prisma';
import { withLockedEnrollment } from '@/lib/server/enrollment-row-lock';
import {
  parseInteractiveProgressDocument,
  upsertExperienceSnapshot,
  type InteractiveProgressDocument,
} from '@/lib/lms/interactive-progress-store';
import type { InteractiveProgressSnapshot } from '@/lib/lms/interactive-progress';

export async function readLessonInteractiveProgress(
  db: Prisma.TransactionClient | typeof import('@/lib/prisma').prisma,
  studentId: string,
  lessonId: string
): Promise<InteractiveProgressDocument> {
  const row = await db.lmsLessonProgress.findUnique({
    where: { studentId_lessonId: { studentId, lessonId } },
    select: { interactiveProgress: true },
  });
  return parseInteractiveProgressDocument(row?.interactiveProgress);
}

export async function writeLessonInteractiveProgress(params: {
  studentId: string;
  lessonId: string;
  enrollmentId: string;
  experienceId: string;
  snapshot: InteractiveProgressSnapshot;
}): Promise<InteractiveProgressDocument> {
  const experience = getInteractiveExperienceById(params.experienceId);
  if (!experience) {
    throw new Error('Unknown interactive experience');
  }

  const now = new Date();

  let nextDoc: InteractiveProgressDocument = {};

  await prisma.$transaction((tx) =>
    withLockedEnrollment(
      tx,
      { enrollmentId: params.enrollmentId, studentId: params.studentId, require: 'access' },
      async () => {
        const existing = await readLessonInteractiveProgress(tx, params.studentId, params.lessonId);
        nextDoc = upsertExperienceSnapshot(existing, experience, params.experienceId, params.snapshot);
        await tx.lmsLessonProgress.upsert({
          where: {
            studentId_lessonId: { studentId: params.studentId, lessonId: params.lessonId },
          },
          create: {
            studentId: params.studentId,
            lessonId: params.lessonId,
            interactiveProgress: nextDoc as Prisma.InputJsonValue,
            lastAccessedAt: now,
          },
          update: {
            interactiveProgress: nextDoc as Prisma.InputJsonValue,
            lastAccessedAt: now,
          },
        });
      }
    )
  );

  return nextDoc;
}