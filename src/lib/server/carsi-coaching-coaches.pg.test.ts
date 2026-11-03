/**
 * Coaching chapters on a REAL PostgreSQL (GP-632).
 *
 * Runs the real chapter code (real Prisma, real SQL) against the freshly migrated database:
 * the migration's seeded default coach, the one-default unique index, admin chapter creation,
 * member assignment, member-to-coach lookup and each coach's dashboard query.
 *
 * Where it runs: CI's E2E job (`npm run test:pg`) against its migrated postgres:16 service, and
 * locally against a throwaway migrated PostgreSQL on 127.0.0.1. It refuses any non-local
 * database. With CI=true and no usable DATABASE_URL it FAILS; locally it is skipped.
 */
import { randomUUID } from 'node:crypto';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { DEFAULT_COACHING_CHAPTER_SLUG } from '@/lib/coaching-portal/coach-routing';

const DB_URL = process.env.DATABASE_URL?.trim() ?? '';
const IN_CI = process.env.CI === 'true';
const HOST = (() => {
  try {
    return DB_URL ? new URL(DB_URL).hostname : '';
  } catch {
    return '';
  }
})();
const RUNNABLE = Boolean(DB_URL) && ['localhost', '127.0.0.1', '::1'].includes(HOST);

if (!RUNNABLE) {
  describe('coaching chapters (real PostgreSQL)', () => {
    if (IN_CI) {
      it('must run in CI: needs DATABASE_URL pointing at the local migrated postgres service', () => {
        throw new Error(`CI=true but no usable local DATABASE_URL (host: "${HOST || 'none'}").`);
      });
    } else {
      it.skip('runs in CI (E2E job, `npm run test:pg`): no local DATABASE_URL here', () => {});
    }
  });
}

describe.runIf(RUNNABLE)('coaching chapters (real PostgreSQL)', () => {
  let prisma: typeof import('@/lib/prisma').prisma;
  let chapters: typeof import('./carsi-coaching-coaches');
  const tag = randomUUID().slice(0, 8);
  const memberB = randomUUID();
  const memberP = randomUUID();
  const createdCoachIds: string[] = [];

  beforeAll(async () => {
    prisma = (await import('@/lib/prisma')).prisma;
    chapters = await import('./carsi-coaching-coaches');
    for (const [id, who] of [
      [memberB, 'b'],
      [memberP, 'p'],
    ] as const) {
      await prisma.lmsUser.create({
        data: { id, email: `gp632-${who}-${tag}@example.com`, hashedPassword: 'x', fullName: `Member ${who}` },
      });
      await prisma.carsiCoachingBusinessProfile.create({ data: { userId: id, businessName: `Biz ${who}` } });
    }
  });

  afterAll(async () => {
    await prisma.carsiCoachingBusinessProfile.deleteMany({ where: { userId: { in: [memberB, memberP] } } });
    await prisma.lmsUser.deleteMany({ where: { id: { in: [memberB, memberP] } } });
    await prisma.carsiCoachingCoach.deleteMany({ where: { id: { in: createdCoachIds } } });
    await prisma.$disconnect();
  });

  it('the migration seeded exactly one default coach on the shared default chapter', async () => {
    const defaults = await prisma.carsiCoachingCoach.findMany({ where: { isDefault: true } });
    expect(defaults).toHaveLength(1);
    expect(defaults[0]).toMatchObject({
      chapterSlug: DEFAULT_COACHING_CHAPTER_SLUG,
      displayName: 'Phill McGurk',
      currency: 'aud',
      monthlyPriceCents: 49500,
    });
  });

  it('the database refuses a second default coach', async () => {
    await expect(
      prisma.carsiCoachingCoach.create({
        data: {
          displayName: 'Second default',
          chapterSlug: `second-default-${tag}`,
          chapterName: 'Second default',
          notificationEmail: 'x@example.com',
          isDefault: true,
        },
      })
    ).rejects.toThrow();
  });

  it('routes a coach B member to B only and keeps an unassigned member with the default coach', async () => {
    const a = await chapters.createCoachingCoach({
      displayName: 'Alex Partner',
      chapterSlug: `nz-${tag}`,
      chapterName: 'Alex NZ',
      currency: 'nzd',
      monthlyPriceCents: 52000,
      stripePriceId: null,
      notificationEmail: 'coach.a@example.com',
      brandColour: null,
      logoUrl: null,
    });
    const b = await chapters.createCoachingCoach({
      displayName: 'Blake Partner',
      chapterSlug: `us-${tag}`,
      chapterName: 'Blake US',
      currency: 'usd',
      monthlyPriceCents: 49700,
      stripePriceId: null,
      notificationEmail: 'coach.b@example.com',
      brandColour: '#1d3557',
      logoUrl: 'https://cdn.example.com/logo.png',
    });
    if (!a.ok || !b.ok) throw new Error('coach creation failed');
    createdCoachIds.push(a.coach.id, b.coach.id);

    const dup = await chapters.createCoachingCoach({
      displayName: 'Dup',
      chapterSlug: `us-${tag}`,
      chapterName: 'Dup',
      currency: 'usd',
      monthlyPriceCents: 100,
      stripePriceId: null,
      notificationEmail: 'dup@example.com',
      brandColour: null,
      logoUrl: null,
    });
    expect(dup.ok).toBe(false);

    expect(await chapters.assignMemberToCoach(memberB, b.coach.id)).toEqual({ ok: true });

    expect((await chapters.getCoachForMember(memberB))?.id).toBe(b.coach.id);
    expect((await chapters.getCoachForMember(memberP))?.isDefault).toBe(true);
    expect((await chapters.getCoachRoutingForMember(memberB)).recipients).toEqual(['coach.b@example.com']);

    const ids = async (coach: Parameters<typeof chapters.listCoachMembers>[0]) =>
      (await chapters.listCoachMembers(coach)).map((m) => m.userId);
    const defaultCoach = await chapters.getDefaultCoach();
    expect(await ids(b.coach)).toEqual([memberB]);
    expect(await ids(a.coach)).toEqual([]);
    expect(await ids(defaultCoach!)).toContain(memberP);
    expect(await ids(defaultCoach!)).not.toContain(memberB);

    const listed = await chapters.listCoachingCoaches();
    expect(listed[0].isDefault).toBe(true);
    expect(listed.find((c) => c.id === b.coach.id)?.memberCount).toBe(1);
    // The default chapter counts its unassigned (NULL coach_id) members, as its dashboard lists them.
    const defaultRow = listed.find((c) => c.isDefault)!;
    expect(defaultRow.memberCount).toBe(await prisma.carsiCoachingBusinessProfile.count({ where: { coachId: null } }));
    expect(defaultRow.memberCount).toBeGreaterThan(0);

    // Unassigning returns the member to the default chapter (stored as NULL).
    expect(await chapters.assignMemberToCoach(memberB, null)).toEqual({ ok: true });
    expect((await chapters.getCoachForMember(memberB))?.isDefault).toBe(true);
  });
});
