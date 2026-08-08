import { type NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { getSessionClaimsFromRequest } from '@/lib/server/auth-from-request';
import { lmsPublishedCourseWhere } from '@/lib/server/public-courses-list';
import { getTeamCourseSeatPools } from '@/lib/server/team-course-seats';
import { repairAndGetTeamForUser } from '@/lib/server/teams';

/** GET /api/lms/teams/assignable-courses — owner's enrolled courses for team invites. */
export async function GET(request: NextRequest) {
  const claims = await getSessionClaimsFromRequest(request);
  if (!claims) {
    return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
  }

  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json({ courses: [] });
  }

  try {
    const team = await repairAndGetTeamForUser(claims.sub);
    const pools = team ? await getTeamCourseSeatPools(team.id) : [];
    const poolBySlug = new Map(pools.map((p) => [p.course_slug, p]));

    const rows = await prisma.lmsEnrollment.findMany({
      where: {
        studentId: claims.sub,
        status: { notIn: ['cancelled'] },
        // `status` is the canonical publication flag (#137); `isPublished` is the legacy
        // dual-write column. Filtering on the legacy field here split the product in two: 20
        // courses currently carry status='published' with isPublished=false, so a learner could
        // find and enrol in them from the public catalogue (which uses the canonical predicate)
        // while they stayed invisible to team assignment. Same predicate everywhere, one truth.
        course: lmsPublishedCourseWhere,
      },
      include: {
        course: { select: { slug: true, title: true } },
      },
      orderBy: { enrolledAt: 'desc' },
    });

    const seen = new Set<string>();
    const courses: {
      slug: string;
      title: string;
      is_team_purchase_course: boolean;
      seat_limit?: number;
      seats_used?: number;
      seats_remaining?: number;
      team_purchase_count?: number;
    }[] = [];

    for (const row of rows) {
      const slug = row.course.slug.trim().toLowerCase();
      if (!slug || seen.has(slug)) continue;
      seen.add(slug);
      const pool = poolBySlug.get(slug);
      courses.push({
        slug,
        title: row.course.title,
        is_team_purchase_course: Boolean(pool),
        ...(pool
          ? {
              seat_limit: pool.seat_limit,
              seats_used: pool.seats_used,
              seats_remaining: pool.seats_remaining,
              team_purchase_count: pool.purchase_count,
            }
          : {}),
      });
    }

    return NextResponse.json({ courses, course_seat_pools: pools });
  } catch (e) {
    console.error('[teams/assignable-courses]', e);
    return NextResponse.json({ detail: 'Failed to load courses' }, { status: 500 });
  }
}
