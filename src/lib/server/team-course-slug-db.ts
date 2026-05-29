import { prisma } from '@/lib/prisma';

/** Write course_slug even when Prisma Client was generated before the column existed. */
export async function writeTeamCourseSlug(teamId: string, courseSlug: string): Promise<void> {
  const slug = courseSlug.trim().toLowerCase();
  try {
    await prisma.lmsTeam.update({
      where: { id: teamId },
      data: { courseSlug: slug },
    });
  } catch {
    await prisma.$executeRaw`
      UPDATE lms_teams SET course_slug = ${slug} WHERE id = ${teamId}::uuid
    `;
  }
}

export async function readTeamCourseSlug(teamId: string): Promise<string | null> {
  try {
    const team = await prisma.lmsTeam.findUnique({
      where: { id: teamId },
      select: { courseSlug: true },
    });
    if (team?.courseSlug?.trim()) return team.courseSlug.trim().toLowerCase();
  } catch {
    // Stale Prisma client may lack courseSlug; fall back to raw SQL below.
  }

  const rows = await prisma.$queryRaw<{ course_slug: string | null }[]>`
    SELECT course_slug FROM lms_teams WHERE id = ${teamId}::uuid
  `;
  const raw = rows[0]?.course_slug?.trim().toLowerCase();
  return raw || null;
}
