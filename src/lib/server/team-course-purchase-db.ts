import { randomUUID } from 'node:crypto';

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

export async function findTeamCoursePurchaseByPaymentReference(
  paymentReference: string,
): Promise<TeamCoursePurchaseRecord | null> {
  const ref = paymentReference.trim();
  if (!ref) return null;

  if (purchaseDelegateAvailable()) {
    const row = await prisma.lmsTeamCoursePurchase.findFirst({
      where: { paymentReference: ref },
    });
    if (!row) return null;
    return {
      id: row.id,
      teamId: row.teamId,
      courseSlug: row.courseSlug,
      seatLimit: row.seatLimit,
      paymentReference: row.paymentReference,
      purchasedAt: row.purchasedAt,
    };
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
    WHERE payment_reference = ${ref}
    LIMIT 1
  `;
  const row = rows[0];
  return row ? mapRaw(row) : null;
}

export async function insertTeamCoursePurchase(params: {
  teamId: string;
  courseSlug: string;
  seatLimit: number;
  paymentReference?: string;
}): Promise<void> {
  const slug = params.courseSlug.trim().toLowerCase();
  const ref = params.paymentReference?.trim() || null;
  const id = randomUUID();

  if (purchaseDelegateAvailable()) {
    await prisma.lmsTeamCoursePurchase.create({
      data: {
        teamId: params.teamId,
        courseSlug: slug,
        seatLimit: params.seatLimit,
        paymentReference: ref,
      },
    });
    return;
  }

  await prisma.$executeRaw`
    INSERT INTO lms_team_course_purchases (id, team_id, course_slug, seat_limit, payment_reference, purchased_at)
    VALUES (${id}::uuid, ${params.teamId}::uuid, ${slug}, ${params.seatLimit}, ${ref}, NOW())
  `;
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
