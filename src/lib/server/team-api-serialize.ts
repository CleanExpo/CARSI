import { prisma } from '@/lib/prisma';
import {
  getTeamCoursePurchases,
  getTeamCourseSeatPools,
} from '@/lib/server/team-course-seats';
import { countTeamSeatsUsed, repairAndGetTeamForUser } from '@/lib/server/teams';

type TeamRecord = NonNullable<Awaited<ReturnType<typeof repairAndGetTeamForUser>>>;

export async function serializeTeamForClient(team: TeamRecord, claimsSub: string) {
  const isOwner = team.ownerId === claimsSub;
  const ownerMember = team.members.find((m) => m.userId === team.ownerId);

  if (!isOwner) {
    const teamRef = `team:${team.id}`;
    const assigned = await prisma.lmsEnrollment.findMany({
      where: {
        studentId: claimsSub,
        paymentReference: teamRef,
        status: { notIn: ['cancelled'] },
      },
      include: { course: { select: { slug: true, title: true } } },
      orderBy: { enrolledAt: 'asc' },
    });

    return {
      id: team.id,
      name: team.name,
      slug: team.slug,
      bundle_tier: team.bundleTier,
      is_owner: false,
      added_by: {
        full_name: ownerMember?.user.fullName ?? null,
        email: ownerMember?.user.email ?? '',
      },
      my_team_courses: assigned.map((e) => ({
        slug: e.course.slug.trim().toLowerCase(),
        title: e.course.title,
      })),
    };
  }

  const seatsUsed = await countTeamSeatsUsed(team.id);
  const coursePurchases = await getTeamCoursePurchases(team.id);
  const courseSeatPools = await getTeamCourseSeatPools(team.id);

  return {
    id: team.id,
    name: team.name,
    slug: team.slug,
    bundle_tier: team.bundleTier,
    course_slug: team.courseSlug,
    seat_limit: team.seatLimit,
    seats_used: seatsUsed,
    owner_id: team.ownerId,
    is_owner: true,
    course_purchases: coursePurchases,
    course_seat_pools: courseSeatPools.map((p) => ({
      course_slug: p.course_slug,
      course_title: p.course_title,
      seat_limit: p.seat_limit,
      seats_used: p.seats_used,
      seats_remaining: p.seats_remaining,
      purchase_count: p.purchase_count,
      purchases: p.purchases,
    })),
    members: team.members.map((m) => ({
      user_id: m.userId,
      role: m.role,
      email: m.user.email,
      full_name: m.user.fullName,
    })),
    pending_invites: team.invites.map((i) => ({
      id: i.id,
      email: i.email,
      role: i.role,
      expires_at: i.expiresAt.toISOString(),
    })),
  };
}
