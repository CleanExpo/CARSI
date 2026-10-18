/**
 * ONE route-level table for every review-admin route (release-gate r10): who is allowed is decided
 * only by the database (resolveCurrentAdmin, plus current instructors for replies), never the
 * token's role. For each route: the founder and a database admin are allowed; a demoted admin
 * holding a stale admin JWT, a student and no session are denied — and a denial writes nothing.
 * Extra rows: the admin-cookie principals (bootstrap ADMIN_EMAIL, an admin_users admin) are
 * allowed everywhere; an instructor may reply but not moderate or read hidden reviews.
 */
import { NextRequest } from 'next/server';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

type Persona =
  | 'founder'
  | 'dbAdmin'
  | 'demotedStaleJwt'
  | 'student'
  | 'noSession'
  | 'bootstrapCookie'
  | 'adminUsersCookie'
  | 'instructor';

const m = vi.hoisted(() => ({
  persona: 'noSession' as string,
  writes: [] as string[],
}));

// Each persona's token (what the JWT or cookie SAYS) and database row (what is TRUE now).
const LMS: Record<
  string,
  { sub: string; email: string; tokenRole: string; dbRole: string | null }
> = {
  founder: {
    sub: 'u-founder',
    email: 'phill.m@carsi.com.au',
    tokenRole: 'student',
    dbRole: 'student',
  },
  dbAdmin: { sub: 'u-admin', email: 'admin@carsi.com.au', tokenRole: 'admin', dbRole: 'admin' },
  demotedStaleJwt: {
    sub: 'u-demoted',
    email: 'was.admin@carsi.com.au',
    tokenRole: 'admin',
    dbRole: 'student',
  },
  student: {
    sub: 'u-student',
    email: 'learner@example.com',
    tokenRole: 'student',
    dbRole: 'student',
  },
  instructor: {
    sub: 'u-inst',
    email: 'inst@carsi.com.au',
    tokenRole: 'instructor',
    dbRole: 'instructor',
  },
};
const COOKIE: Record<string, string> = {
  bootstrapCookie: 'support@carsi.com.au',
  adminUsersCookie: 'ops@carsi.com.au',
};

vi.mock('@/lib/server/auth-from-request', () => ({
  getSessionClaimsFromRequest: async () => {
    const p = LMS[m.persona];
    return p ? { sub: p.sub, email: p.email, role: p.tokenRole, full_name: 'X' } : null;
  },
}));
vi.mock('@/lib/admin/admin-auth', () => ({
  ADMIN_COOKIE_NAME: 'admin_session',
  verifyAdminSessionToken: async (t: string) =>
    t === 'valid' && COOKIE[m.persona] ? { email: COOKIE[m.persona] } : null,
}));
vi.mock('@/lib/server/review-summary', () => ({
  getReviewFunnelSummary: async () => ({ hides_by_reason_and_rating: [] }),
}));

const REVIEW = {
  id: 'rev-1',
  rating: 1,
  title: 'Too basic',
  body: 'x',
  reply: null,
  repliedAt: null,
  createdAt: new Date('2026-10-02'),
};
vi.mock('@/lib/prisma', () => {
  const client = {
    $queryRaw: async (strings: TemplateStringsArray, ...values: unknown[]) => {
      const sql = strings.join('?');
      if (sql.includes('"admin_users"')) {
        return String(values[0]) === 'ops@carsi.com.au'
          ? [{ id: 'adm-7', is_active: true, role: 'admin' }]
          : [];
      }
      if (sql.includes('"lms_user_roles"')) return [];
      if (sql.includes('"lms_users"')) {
        const p = Object.values(LMS).find((x) => x.sub === String(values[0]));
        return p ? [{ id: p.sub, email: p.email, is_active: true, role: p.dbRole }] : [];
      }
      throw new Error(`unexpected SQL ${sql}`);
    },
    $transaction: async (fn: (tx: unknown) => unknown) => fn(client),
    lmsCourse: {
      findUnique: async () => ({
        id: 'course-1',
        title: 'Water Damage Restoration',
        slug: 'water-damage',
        category: 'restoration',
        meta: null,
      }),
    },
    lmsEnrollment: { findUnique: async () => null },
    lmsUser: { findUnique: async () => null },
    lmsCourseReview: {
      findFirst: async () => ({ id: 'rev-1', rating: 1, title: 'Too basic', body: 'x' }),
      findMany: async ({ where }: { where: { isPublished?: boolean } }) =>
        where.isPublished === true
          ? []
          : [
              {
                ...REVIEW,
                isPublished: false,
                student: { fullName: 'Sam Rivers', email: 's@example.com' },
                moderationEvents: [],
              },
            ],
      update: async (args: { data: Record<string, unknown> }) => {
        m.writes.push(`review.update:${Object.keys(args.data).sort().join(',')}`);
        return {
          ...REVIEW,
          moderationVersion: 3,
          course: { id: 'course-1', slug: 'water-damage', title: 'Water Damage Restoration' },
        };
      },
    },
    lmsCourseReviewModerationEvent: {
      create: async () => {
        m.writes.push('moderation_event.create');
        return {};
      },
    },
  };
  return { prisma: client };
});

const { POST: publishPOST } =
  await import('../../../app/api/lms/courses/[slug]/reviews/[id]/publish/route');
const { POST: replyPOST } =
  await import('../../../app/api/lms/courses/[slug]/reviews/[id]/reply/route');
const { GET: reviewsGET } = await import('../../../app/api/lms/courses/[slug]/reviews/route');
const { GET: summaryGET } = await import('../../../app/api/admin/reviews/summary/route');
const SAVED = {
  db: process.env.DATABASE_URL,
  admin: process.env.ADMIN_EMAIL,
  panel: process.env.ADMIN_PANEL_EMAILS,
};

function request(url: string, body?: unknown): NextRequest {
  const headers: Record<string, string> = {};
  if (COOKIE[m.persona]) headers.cookie = 'admin_session=valid';
  return new NextRequest(
    url,
    body === undefined ? { headers } : { method: 'POST', body: JSON.stringify(body), headers }
  );
}
const params = { params: Promise.resolve({ slug: 'water-damage', id: 'rev-1' }) };

type Outcome = { status: number; allowed: boolean };
const ROUTES: Record<string, () => Promise<Outcome>> = {
  'moderation: hide': async () => {
    const res = await publishPOST(
      request('http://localhost/api/lms/courses/water-damage/reviews/rev-1/publish', {
        is_published: false,
        reason: 'offensive',
      }),
      params
    );
    return { status: res.status, allowed: res.status === 200 };
  },
  'moderation: unhide': async () => {
    const res = await publishPOST(
      request('http://localhost/api/lms/courses/water-damage/reviews/rev-1/publish', {
        is_published: true,
      }),
      params
    );
    return { status: res.status, allowed: res.status === 200 };
  },
  'reply: publish': async () => {
    const res = await replyPOST(
      request('http://localhost/api/lms/courses/water-damage/reviews/rev-1/reply', {
        reply: 'Official response',
      }),
      params
    );
    return { status: res.status, allowed: res.status === 200 };
  },
  'reply: clear': async () => {
    const res = await replyPOST(
      request('http://localhost/api/lms/courses/water-damage/reviews/rev-1/reply', { reply: null }),
      params
    );
    return { status: res.status, allowed: res.status === 200 };
  },
  'private read: hidden reviews on GET': async () => {
    const res = await reviewsGET(request('http://localhost/api/lms/courses/water-damage/reviews'), {
      params: Promise.resolve({ slug: 'water-damage' }),
    });
    const body = await res.json();
    const sawHidden = body.reviews.some((r: { id: string }) => r.id === 'rev-1');
    expect(sawHidden).toBe(body.can_moderate); // hidden data and the moderation controls always agree
    return { status: res.status, allowed: body.can_moderate === true };
  },
  'moderation summary': async () => {
    const res = await summaryGET(request('http://localhost/api/admin/reviews/summary'));
    return { status: res.status, allowed: res.status === 200 };
  },
};

const ALLOW: Persona[] = ['founder', 'dbAdmin', 'bootstrapCookie', 'adminUsersCookie'];
const DENY: Persona[] = ['demotedStaleJwt', 'student', 'noSession'];
const WRITES = new Set([
  'moderation: hide',
  'moderation: unhide',
  'reply: publish',
  'reply: clear',
]);

beforeEach(() => {
  process.env.DATABASE_URL = 'postgres://test';
  process.env.ADMIN_EMAIL = 'support@carsi.com.au';
  delete process.env.ADMIN_PANEL_EMAILS;
  m.writes = [];
});
afterAll(() => {
  for (const [k, v] of [
    ['DATABASE_URL', SAVED.db],
    ['ADMIN_EMAIL', SAVED.admin],
    ['ADMIN_PANEL_EMAILS', SAVED.panel],
  ] as const) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
});

describe.each(Object.keys(ROUTES))('%s', (route) => {
  it.each(ALLOW)('allows %s', async (persona) => {
    m.persona = persona;
    const out = await ROUTES[route]!();
    expect(out).toEqual({ status: 200, allowed: true });
    if (WRITES.has(route)) expect(m.writes.length).toBeGreaterThan(0);
  });

  it.each(DENY)('denies %s, and writes nothing', async (persona) => {
    m.persona = persona;
    const out = await ROUTES[route]!();
    expect(out.allowed).toBe(false);
    if (route === 'private read: hidden reviews on GET')
      expect(out.status).toBe(200); // public view only
    else expect(out.status).toBe(persona === 'noSession' ? 401 : 403);
    expect(m.writes).toEqual([]);
  });
});

describe('an instructor may reply but not moderate or read hidden reviews', () => {
  it.each([
    ['moderation: hide', false],
    ['moderation: unhide', false],
    ['reply: publish', true],
    ['reply: clear', true],
    ['private read: hidden reviews on GET', false],
    ['moderation summary', false],
  ] as const)('%s → allowed: %s', async (route, allowed) => {
    m.persona = 'instructor';
    const out = await ROUTES[route]!();
    expect(out.allowed).toBe(allowed);
    if (!allowed && WRITES.has(route)) expect(m.writes).toEqual([]);
  });
});
