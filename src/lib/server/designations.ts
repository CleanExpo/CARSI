import { prisma } from '@/lib/prisma';
import {
  getDesignationDefinition,
  listDesignationDefinitions,
  orderedSteps,
  type DesignationDefinition,
} from '@/lib/designations/registry';
import { computeDesignationProgress, type DesignationProgress } from './designation-progress';

/**
 * Server-side join of a CARSI designation definition to live course data (titles,
 * status — from the LMS DB, any publish state so preview works on drafts) and a
 * learner's rolled-up progress. Kept separate from the pure `registry` module so
 * client code can import definitions without pulling in Prisma.
 */

export type PathwayCourseInfo = {
  slug: string;
  title: string;
  durationHours: number | null;
  status: string | null;
};

export type DesignationDetail = {
  definition: DesignationDefinition;
  courses: Record<string, PathwayCourseInfo>;
  progress: DesignationProgress | null;
};

export type DesignationSummary = {
  definition: DesignationDefinition;
  requiredCount: number;
  totalSteps: number;
};

async function loadCourses(slugs: string[]): Promise<Record<string, PathwayCourseInfo>> {
  if (slugs.length === 0) return {};
  const rows = await prisma.lmsCourse.findMany({
    where: { slug: { in: slugs } },
    select: { slug: true, title: true, durationHours: true, status: true },
  });
  const out: Record<string, PathwayCourseInfo> = {};
  for (const r of rows) {
    out[r.slug] = {
      slug: r.slug,
      title: r.title,
      durationHours: r.durationHours ?? null,
      status: r.status ?? null,
    };
  }
  return out;
}

/** All designations for the index — cheap, no per-user progress. */
export function listDesignationSummaries(): DesignationSummary[] {
  return listDesignationDefinitions().map((d) => ({
    definition: d,
    requiredCount: d.pathwaySteps.filter((s) => s.required).length,
    totalSteps: d.pathwaySteps.length,
  }));
}

/** One designation with resolved course info + (optional) learner progress. */
export async function getDesignationDetail(
  slug: string,
  userId: string | null,
): Promise<DesignationDetail | null> {
  const definition = getDesignationDefinition(slug);
  if (!definition) return null;
  const slugs = orderedSteps(definition).map((s) => s.courseSlug);
  const [courses, progress] = await Promise.all([
    loadCourses(slugs),
    computeDesignationProgress(userId, definition),
  ]);
  return { definition, courses, progress };
}
