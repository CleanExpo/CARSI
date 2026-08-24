/**
 * The yearly-membership grant must not promise access the read gates deny.
 *
 * `adminGrantEnrollment` reports ANY existing enrolment row as `already_enrolled` without
 * inspecting its status, so a revoked/refunded/disputed row was tallied as a success. The grant
 * then emailed the member `slugs.length` — the published total, unchanged by failures too — so
 * a member could be welcomed to courses they could not open. Same defect class as
 * `scripts/grant-toby-comp-access.ts` (#692, #693), on the path that emails real members.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  /** Published catalogue, as `lmsCourse.findMany` returns it. */
  courses: [] as { slug: string }[],
  /** The member's enrolment rows, as `lmsEnrollment.findMany` returns them. */
  enrolments: [] as { status: string; course: { slug: string } }[],
  user: null as { id: string; email: string; fullName: string | null; isActive: boolean } | null,
  /** Slugs `adminGrantEnrollment` should throw for. */
  failSlugs: new Set<string>(),
  /** Slugs already enrolled (any status) — these return `already_enrolled`. */
  existingSlugs: new Set<string>(),
  sentEmails: [] as { to: string; courseCount: number }[],
  /** Every `lmsUser.update` payload, in order — credential mutations show up here. */
  userUpdates: [] as Record<string, unknown>[],
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    lmsCourse: { findMany: vi.fn(async () => state.courses) },
    lmsEnrollment: { findMany: vi.fn(async () => state.enrolments) },
    lmsUser: {
      findUnique: vi.fn(async () => state.user),
      create: vi.fn(async (args: { data: Record<string, unknown> }) => {
        state.user = {
          id: 'usr',
          email: String(args.data.email),
          fullName: (args.data.fullName as string) ?? null,
          isActive: true,
        };
        return state.user;
      }),
      update: vi.fn(async (args: { data: Record<string, unknown> }) => {
        state.userUpdates.push(args.data);
        return state.user;
      }),
    },
  },
}));

vi.mock('@/lib/admin/admin-enrollment-mutations', () => ({
  adminGrantEnrollment: vi.fn(async ({ courseSlug }: { courseSlug: string }) => {
    if (state.failSlugs.has(courseSlug)) throw new Error('BOOM');
    // Mirrors the real helper: an existing row is 'already_enrolled' whatever its status.
    if (state.existingSlugs.has(courseSlug)) {
      return { kind: 'already_enrolled' as const, enrollmentId: 'e' };
    }
    return { kind: 'created' as const, enrollmentId: 'e' };
  }),
}));

vi.mock('@/lib/server/member-temp-password', () => ({
  generateMemberTempPassword: vi.fn(() => 'temp-pw'),
}));
vi.mock('@/lib/server/lms-auth', () => ({ hashPassword: vi.fn(async () => 'hashed') }));
vi.mock('@/lib/server/transactional-email', () => ({
  sendYearlyMembershipEmail: vi.fn(async (p: { to: string; courseCount: number }) => {
    state.sentEmails.push({ to: p.to, courseCount: p.courseCount });
    return { sent: true };
  }),
}));

const { grantYearlyMembership } = await import('./admin-yearly-membership');

const grant = () =>
  grantYearlyMembership({
    email: 'member@example.com',
    fullName: 'A Member',
    priceAud: 0,
    appOrigin: 'https://carsi.test',
  });

/** Catalogue of `n` published courses, all enrolled and active unless overridden. */
function catalogue(slugs: string[], statuses: Record<string, string> = {}) {
  state.courses = slugs.map((slug) => ({ slug }));
  state.enrolments = slugs.map((slug) => ({
    status: statuses[slug] ?? 'active',
    course: { slug },
  }));
}

beforeEach(() => {
  // `listPublishedCourseSlugsForYearlyMembership` returns [] when DATABASE_URL is unset (a real
  // guard for build/CI), which would make every case here fail as NO_PUBLISHED_COURSES. The
  // prisma client itself is mocked above, so this value is never dialled.
  vi.stubEnv('DATABASE_URL', 'postgresql://test:test@127.0.0.1:5432/test');
  vi.clearAllMocks();
  state.courses = [];
  state.enrolments = [];
  state.user = null;
  state.failSlugs = new Set();
  state.existingSlugs = new Set();
  state.sentEmails = [];
  state.userUpdates = [];
});

describe('grantYearlyMembership — course count promised to the member', () => {
  it('promises every course when all are reachable', async () => {
    catalogue(['water', 'mould', 'fire']);
    const result = await grant();

    expect(result.reachableCourseCount).toBe(3);
    expect(result.deniedCourseSlugs).toEqual([]);
    expect(state.sentEmails[0].courseCount).toBe(3);
  });

  // REGRESSION: a revoked row is `already_enrolled`, so it counted as a success and the email
  // still promised the full published total.
  it('does not count a revoked enrolment as access, and does not promise it', async () => {
    catalogue(['water', 'mould', 'fire'], { fire: 'revoked' });
    state.existingSlugs = new Set(['fire']);

    const result = await grant();

    expect(result.alreadyEnrolled).toBe(1); // the revoked row still tallies as already-enrolled
    expect(result.coursesFailed).toBe(0); // ...and is not a failure
    expect(result.reachableCourseCount).toBe(2); // ...but the member can only open two
    expect(result.deniedCourseSlugs).toEqual(['fire']);
    expect(state.sentEmails[0].courseCount).toBe(2);
  });

  it.each(['refunded', 'disputed', 'cancelled', 'chargeback'])(
    'treats a %s enrolment as unreachable',
    async (status) => {
      catalogue(['water', 'mould'], { mould: status });
      state.existingSlugs = new Set(['mould']);

      const result = await grant();

      expect(result.reachableCourseCount).toBe(1);
      expect(result.deniedCourseSlugs).toEqual(['mould']);
      expect(state.sentEmails[0].courseCount).toBe(1);
    }
  );

  // REGRESSION: `courseCount: slugs.length` was the published total, so outright failures
  // did not reduce it either.
  it('does not promise a course whose grant threw', async () => {
    state.courses = [{ slug: 'water' }, { slug: 'mould' }, { slug: 'fire' }];
    state.enrolments = [
      { status: 'active', course: { slug: 'water' } },
      { status: 'active', course: { slug: 'mould' } },
      // 'fire' threw, so no row exists for it
    ];
    state.failSlugs = new Set(['fire']);

    const result = await grant();

    expect(result.coursesFailed).toBe(1);
    expect(result.publishedCourseCount).toBe(3);
    expect(result.reachableCourseCount).toBe(2);
    expect(state.sentEmails[0].courseCount).toBe(2);
  });

  it('counts a completed course as reachable — content and certificate remain available', async () => {
    catalogue(['water', 'mould'], { water: 'completed' });
    state.existingSlugs = new Set(['water']);

    const result = await grant();

    expect(result.reachableCourseCount).toBe(2);
    expect(result.deniedCourseSlugs).toEqual([]);
    expect(state.sentEmails[0].courseCount).toBe(2);
  });

  it('ignores enrolments on courses that are no longer published', async () => {
    state.courses = [{ slug: 'water' }];
    state.enrolments = [
      { status: 'active', course: { slug: 'water' } },
      { status: 'revoked', course: { slug: 'retired' } },
    ];

    const result = await grant();

    expect(result.reachableCourseCount).toBe(1);
    expect(result.deniedCourseSlugs).toEqual([]); // retired course is not this grant's problem
    expect(state.sentEmails[0].courseCount).toBe(1);
  });
});

describe('grantYearlyMembership — an existing member must not be locked out', () => {
  const existingMember = () => {
    state.user = {
      id: 'usr',
      email: 'member@example.com',
      fullName: 'A Member',
      isActive: true,
    };
  };

  // REGRESSION (CodeRabbit, PR #694): this function resets an existing member's password to a
  // fresh temporary one and only reveals it in the welcome email. Rotating it before a possible
  // throw changes the password to a value nobody receives — the member loses an account that
  // previously worked. Widening the throw to cover all-revoked made that reachable.
  it('does not touch the password when the grant reaches nothing and throws', async () => {
    existingMember();
    catalogue(['water', 'mould'], { water: 'revoked', mould: 'revoked' });
    state.existingSlugs = new Set(['water', 'mould']);

    await expect(grant()).rejects.toThrow('ENROLLMENT_FAILED');
    expect(state.userUpdates).toHaveLength(0);
    expect(state.sentEmails).toHaveLength(0);
  });

  it('does not touch the password when every grant throws', async () => {
    existingMember();
    state.courses = [{ slug: 'water' }];
    state.enrolments = [];
    state.failSlugs = new Set(['water']);

    await expect(grant()).rejects.toThrow('ENROLLMENT_FAILED');
    expect(state.userUpdates).toHaveLength(0);
  });

  it('rotates the password once the grant succeeds, alongside the email carrying it', async () => {
    existingMember();
    catalogue(['water', 'mould']);

    await grant();

    expect(state.userUpdates).toHaveLength(1);
    expect(state.userUpdates[0]).toMatchObject({ hashedPassword: 'hashed', isActive: true });
    expect(state.sentEmails).toHaveLength(1);
  });

  it('still rotates when only some courses are denied — the member keeps a usable login', async () => {
    existingMember();
    catalogue(['water', 'mould'], { mould: 'revoked' });
    state.existingSlugs = new Set(['mould']);

    await grant();

    expect(state.userUpdates).toHaveLength(1);
    expect(state.sentEmails[0].courseCount).toBe(1);
  });
});

describe('grantYearlyMembership — failing closed', () => {
  // The old guard was `coursesGranted === 0 && alreadyEnrolled === 0`, which passed when every
  // enrolment existed but was revoked: it welcomed a member to nothing.
  it('throws rather than welcoming a member who can reach nothing', async () => {
    catalogue(['water', 'mould'], { water: 'revoked', mould: 'revoked' });
    state.existingSlugs = new Set(['water', 'mould']);

    await expect(grant()).rejects.toThrow('ENROLLMENT_FAILED');
    expect(state.sentEmails).toHaveLength(0);
  });

  it('still throws when every grant fails outright', async () => {
    state.courses = [{ slug: 'water' }, { slug: 'mould' }];
    state.enrolments = [];
    state.failSlugs = new Set(['water', 'mould']);

    await expect(grant()).rejects.toThrow('ENROLLMENT_FAILED');
    expect(state.sentEmails).toHaveLength(0);
  });

  it('throws when there are no published courses at all', async () => {
    state.courses = [];
    await expect(grant()).rejects.toThrow('NO_PUBLISHED_COURSES');
  });

  it('does not block the membership when only some courses are denied', async () => {
    catalogue(['water', 'mould'], { mould: 'revoked' });
    state.existingSlugs = new Set(['mould']);

    const result = await grant();

    expect(result.reachableCourseCount).toBe(1);
    expect(state.sentEmails).toHaveLength(1);
  });
});
