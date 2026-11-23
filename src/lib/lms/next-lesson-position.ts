/**
 * Which lesson number a "continue learning" card shows (GP-627).
 *
 * The card names the next lesson by title, so the number beside it must be that same lesson's
 * position: "Lesson 2 of 8" beside lesson 2's title, matching the "Lesson 2 of 8" label the
 * learner sees when it opens. The old card passed the count of completed lessons as the
 * position, so after finishing lesson 1 it read "Lesson 1 of 8" next to lesson 2.
 *
 * Order of preference:
 *  1. the resume lesson's own position, when the API sent it;
 *  2. otherwise the lesson after the completed ones (completed + 1), capped at the total.
 */
export function resolveNextLessonPosition(input: {
  resumeIndex?: number | null;
  resumeTotal?: number | null;
  lessonsCompleted?: number | null;
  lessonsTotal?: number | null;
}): { index: number; total: number } | null {
  const { resumeIndex, resumeTotal, lessonsCompleted, lessonsTotal } = input;
  if (isCount(resumeIndex) && isCount(resumeTotal) && resumeIndex >= 1 && resumeIndex <= resumeTotal) {
    return { index: resumeIndex, total: resumeTotal };
  }
  if (!isCount(lessonsTotal) || lessonsTotal < 1) return null;
  const done = isCount(lessonsCompleted) ? lessonsCompleted : 0;
  return { index: Math.min(lessonsTotal, done + 1), total: lessonsTotal };
}

function isCount(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}
