import { prisma } from '@/lib/prisma';

/**
 * Deep link for post-enrolment onboarding: first lesson in first module.
 */
export async function getFirstLessonLearnPath(courseSlug: string): Promise<string | null> {
  const slug = courseSlug.trim().toLowerCase();
  if (!slug || !process.env.DATABASE_URL?.trim()) return null;

  const course = await prisma.lmsCourse.findUnique({
    where: { slug },
    select: {
      slug: true,
      modules: {
        orderBy: { orderIndex: 'asc' },
        take: 1,
        select: {
          lessons: {
            orderBy: { orderIndex: 'asc' },
            take: 1,
            select: { id: true },
          },
        },
      },
    },
  });

  const lessonId = course?.modules[0]?.lessons[0]?.id;
  if (!course || !lessonId) {
    return `/dashboard/learn/${encodeURIComponent(slug)}`;
  }

  return `/dashboard/learn/${encodeURIComponent(course.slug)}?lesson=${encodeURIComponent(lessonId)}`;
}
