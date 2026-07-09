import { prisma } from '@/lib/prisma';
import { orderedSteps, type DesignationDefinition } from '@/lib/designations/registry';

/**
 * A learner's progress toward a CARSI designation, rolled up from their course
 * enrolments. A designation is EARNED when every REQUIRED step's course has a
 * completed enrolment. Foundation (recommended) steps show on the pathway but do
 * not gate earning.
 *
 * There is no separate designation-credential row — a completed `LmsEnrollment`
 * IS a credential — so "earned" is derived, not persisted (no schema change).
 */

export type StepStatus = 'complete' | 'in-progress' | 'available';

export type DesignationStepProgress = {
  courseSlug: string;
  order: number;
  required: boolean;
  role: 'foundation' | 'credential';
  status: StepStatus;
  completed: boolean;
  enrolled: boolean;
};

export type DesignationProgress = {
  designationSlug: string;
  steps: DesignationStepProgress[];
  requiredTotal: number;
  requiredComplete: number;
  /** 0..100 over the REQUIRED steps only. */
  percentComplete: number;
  earned: boolean;
  /** First incomplete step's course slug, or null when earned/nothing to do. */
  nextStepSlug: string | null;
};

export async function computeDesignationProgress(
  userId: string | null,
  designation: DesignationDefinition,
): Promise<DesignationProgress> {
  const steps = orderedSteps(designation);
  const slugs = steps.map((s) => s.courseSlug);

  // slug -> courseId. Any status (drafts included) so preview works before publish.
  const courses = slugs.length
    ? await prisma.lmsCourse.findMany({ where: { slug: { in: slugs } }, select: { id: true, slug: true } })
    : [];
  const idBySlug = new Map(courses.map((c) => [c.slug, c.id]));

  const completedIds = new Set<string>();
  const enrolledIds = new Set<string>();
  if (userId && courses.length) {
    const enrollments = await prisma.lmsEnrollment.findMany({
      where: { studentId: userId, courseId: { in: courses.map((c) => c.id) } },
      select: { courseId: true, status: true },
    });
    for (const e of enrollments) {
      enrolledIds.add(e.courseId);
      if (e.status === 'completed') completedIds.add(e.courseId);
    }
  }

  const completedSlug = (slug: string): boolean => {
    const id = idBySlug.get(slug);
    return id ? completedIds.has(id) : false;
  };
  const enrolledSlug = (slug: string): boolean => {
    const id = idBySlug.get(slug);
    return id ? enrolledIds.has(id) : false;
  };

  let nextStepSlug: string | null = null;
  const stepProgress: DesignationStepProgress[] = steps.map((s) => {
    const completed = completedSlug(s.courseSlug);
    const enrolled = enrolledSlug(s.courseSlug);
    const status: StepStatus = completed ? 'complete' : enrolled ? 'in-progress' : 'available';
    if (!completed && nextStepSlug === null) nextStepSlug = s.courseSlug;
    return {
      courseSlug: s.courseSlug,
      order: s.order,
      required: s.required,
      role: s.role,
      status,
      completed,
      enrolled,
    };
  });

  const requiredSteps = steps.filter((s) => s.required);
  const requiredTotal = requiredSteps.length;
  const requiredComplete = requiredSteps.filter((s) => completedSlug(s.courseSlug)).length;
  const earned = requiredTotal > 0 && requiredComplete === requiredTotal;
  const percentComplete = requiredTotal === 0 ? 0 : Math.round((requiredComplete / requiredTotal) * 100);

  return {
    designationSlug: designation.slug,
    steps: stepProgress,
    requiredTotal,
    requiredComplete,
    percentComplete,
    earned,
    nextStepSlug: earned ? null : nextStepSlug,
  };
}
