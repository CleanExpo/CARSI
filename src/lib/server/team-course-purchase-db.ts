import { prisma } from '@/lib/prisma';

export type TeamCoursePurchaseRecord = {
  id: string;
  teamId: string;
  courseSlug: string;
  seatLimit: number;
  paymentReference: string | null;
  purchasedAt: Date;
};

function purchaseDelegateAvailable(): boolean {
  const delegate = (
    prisma as { lmsTeamCoursePurchase?: { findMany?: unknown } }
  ).lmsTeamCoursePurchase;
  return typeof delegate?.findMany === 'function';
}

function mapRaw(row: {
  id: string;
  team_id: string;
  course_slug: string;
  seat_limit: number;
  payment_reference: string | null;
  purchased_at: Date;
}): TeamCoursePurchaseRecord {
  return {
    id: row.id,
    teamId: row.team_id,
    courseSlug: row.course_slug,
    seatLimit: row.seat_limit,
    paymentReference: row.payment_reference,
    purchasedAt: row.purchased_at,
  };
}

export async function findTeamCoursePurchasesByTeamId(
  teamId: string,
): Promise<TeamCoursePurchaseRecord[]> {
  if (purchaseDelegateAvailable()) {
    const rows = await prisma.lmsTeamCoursePurchase.findMany({
      where: { teamId },
      orderBy: { purchasedAt: 'asc' },
    });
    return rows.map((r) => ({
      id: r.id,
      teamId: r.teamId,
      courseSlug: r.courseSlug,
      seatLimit: r.seatLimit,
      paymentReference: r.paymentReference,
      purchasedAt: r.purchasedAt,
    }));
  }

  const rows = await prisma.$queryRaw<
    {
      id: string;
      team_id: string;
      course_slug: string;
      seat_limit: number;
      payment_reference: string | null;
      purchased_at: Date;
    }[]
  >`
    SELECT id, team_id, course_slug, seat_limit, payment_reference, purchased_at
    FROM lms_team_course_purchases
    WHERE team_id = ${teamId}::uuid
    ORDER BY purchased_at ASC
  `;
  return rows.map(mapRaw);
}

export async function sumTeamCoursePurchaseSeats(teamId: string): Promise<number> {
  if (purchaseDelegateAvailable()) {
    const total = await prisma.lmsTeamCoursePurchase.aggregate({
      where: { teamId },
      _sum: { seatLimit: true },
    });
    return total._sum.seatLimit ?? 0;
  }

  const rows = await prisma.$queryRaw<{ total: number | null }[]>`
    SELECT COALESCE(SUM(seat_limit), 0)::int AS total
    FROM lms_team_course_purchases
    WHERE team_id = ${teamId}::uuid
  `;
  return rows[0]?.total ?? 0;
}

export async function listTeamCoursePurchaseSlugs(teamId: string): Promise<string[]> {
  const purchases = await findTeamCoursePurchasesByTeamId(teamId);
  return purchases.map((p) => p.courseSlug.trim().toLowerCase());
}
