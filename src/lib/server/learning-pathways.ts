import type { LearnerPathwayStep } from '@/types/learner-learning-journey';

import { prisma } from '@/lib/prisma';

export async function resolveDbPathwayNext(args: {
  completedSlugs: Set<string>;
  enrolledSlugs: Set<string>;
  completedDisciplines: string[];
}): Promise<LearnerPathwayStep | null> {
  const pathways = await prisma.lmsLearningPathway.findMany({
    where: { isPublished: true },
    orderBy: { orderIndex: 'asc' },
    select: {
      id: true,
      title: true,
      iicrcDiscipline: true,
      courses: {
        orderBy: { orderIndex: 'asc' },
        select: {
          course: { select: { slug: true, title: true, isPublished: true, status: true } },
        },
      },
    },
  });

  if (pathways.length === 0) return null;

  const completedDisciplineSet = new Set(args.completedDisciplines.map((d) => d.toUpperCase()));

  let best: { pathway: (typeof pathways)[number]; score: number } | null = null;

  for (const pathway of pathways) {
    const courseSlugs = pathway.courses.map((c) => c.course.slug);
    const completedInPathway = courseSlugs.filter((slug) => args.completedSlugs.has(slug)).length;
    const disciplineMatch =
      pathway.iicrcDiscipline &&
      completedDisciplineSet.has(pathway.iicrcDiscipline.trim().toUpperCase())
        ? 2
        : 0;
    const enrolledInPathway = courseSlugs.some((slug) => args.enrolledSlugs.has(slug)) ? 1 : 0;
    const score = completedInPathway * 10 + disciplineMatch + enrolledInPathway;
    if (score === 0) continue;
    if (!best || score > best.score) best = { pathway, score };
  }

  if (!best) return null;

  for (const link of best.pathway.courses) {
    const course = link.course;
    const published = course.isPublished || course.status === 'published';
    if (!published) continue;
    if (args.enrolledSlugs.has(course.slug) || args.completedSlugs.has(course.slug)) continue;
    return {
      slug: course.slug,
      title: course.title,
      reason: `Next on the ${best.pathway.title} pathway — continue your structured restoration training.`,
      pathway_title: best.pathway.title,
      source: 'database',
    };
  }

  return null;
}
