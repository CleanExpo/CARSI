import { prisma } from '@/lib/prisma';
import { decideTeamSeatSubscription } from '@/lib/server/entitlements';
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

  const [seatsUsed, coursePurchases, courseSeatPools, teamSub] = await Promise.all([
    countTeamSeatsUsed(team.id),
    getTeamCoursePurchases(team.id),
    getTeamCourseSeatPools(team.id),
    // WS1-E2 (GP-442): the recurring seat subscription, when this is a Teams
    // subscription team. Drives the owner dashboard seats/usage + status block.
    team.bundleTier === 'teams_subscription'
      ? prisma.lmsTeamSubscription.findUnique({ where: { teamId: team.id } })
      : Promise.resolve(null),
  ]);

  const teamSubscription = teamSub
    ? (() => {
        const decision = decideTeamSeatSubscription({
          status: teamSub.status,
          currentPeriodEnd: teamSub.currentPeriodEnd,
          seatLimit: teamSub.seatLimit,
        });
        return {
          plan: teamSub.plan,
          status: teamSub.status,
          reason: decision.reason,
          active: decision.subscriptionEntitled,
          seat_limit: teamSub.seatLimit,
          seats_used: Math.min(seatsUsed, teamSub.seatLimit),
          seats_remaining: Math.max(0, teamSub.seatLimit - seatsUsed),
          current_period_end: teamSub.currentPeriodEnd
            ? teamSub.currentPeriodEnd.toISOString()
            : null,
          cancel_at_period_end: teamSub.cancelAtPeriodEnd,
        };
      })()
    : null;

  return {
    id: team.id,
    name: team.name,
    slug: team.slug,
    bundle_tier: team.bundleTier,
    course_slug: team.courseSlug,
    // For a Teams subscription team the PAID seat count is authoritative.
    seat_limit: teamSub ? teamSub.seatLimit : team.seatLimit,
    seats_used: seatsUsed,
    owner_id: team.ownerId,
    is_owner: true,
    team_subscription: teamSubscription,
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
