/**
 * The route matrix for every course-review route (release-gate r10-r12), GENERATED from the one
 * rule table (review-access-rules.ts), so a route cannot drift from it.
 *
 * Each persona is a fixture with a token (what the JWT or cookie SAYS) and a database row (what is
 * TRUE now); its principal in the table is what the database makes it. Each route action names the
 * capability it needs on a published or a hidden review. For every persona x action the expected
 * outcome is read from the table: allowed → 200 (and the write or model call happens); denied → 401
 * without a session, 403 otherwise, with NO write, NO read of a review's private text and NO model
 * call. A separate test pins the table itself, so changing the policy is a deliberate, visible act.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { NextRequest } from 'next/server';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { REVIEW_ACCESS, type ReviewCapability, type ReviewPrincipal } from './review-access-rules';

const m = vi.hoisted(() => ({
  persona: 'noSession' as string,
  writes: [] as string[],
  /** The moderation events created, so the recorded actor can be checked per admin kind. */
  events: [] as Array<Record<string, unknown>>,
  /** Every text sent to the AI model (draftReviewReply). */
  modelCalls: [] as Array<Record<string, unknown>>,
  /** Reads of a single review's PRIVATE text (title/body) by id. */
  bodyReads: 0,
  /** Every reply write ATTEMPTED (matched or not): a denied caller must not even attempt one. */
  writeAttempts: 0,
  /** The flags the last GET advertised (can_manage, can_moderate). */
  lastGetFlags: null as null | { can_manage: boolean; can_moderate: boolean },
  /** Whether the review the action targets is hidden. */
  reviewHidden: false,
  /** Set to true to hide the review AFTER the visibility check, before the conditional write. */
  hiddenAtWrite: null as boolean | null,
  /** r13: commit a hide right after the visibility read (before the text read), as a second session would. */
  hideAfterVisibilityRead: false,
}));

type Fixture = {
  principal: ReviewPrincipal;
  lms?: { sub: string; email: string; tokenRole: string; dbRole: string; active?: boolean };
  cookie?: string;
};
// What the DATABASE makes each persona — the fixture's truth, independent of the code under test.
const PERSONAS: Record<string, Fixture> = {
  founder: {
    principal: 'admin',
    lms: {
      sub: 'u-founder',
      email: 'phill.m@carsi.com.au',
      tokenRole: 'student',
      dbRole: 'student',
    },
  },
  dbAdmin: {
    principal: 'admin',
    lms: { sub: 'u-admin', email: 'admin@carsi.com.au', tokenRole: 'admin', dbRole: 'admin' },
  },
  bootstrapCookie: { principal: 'admin', cookie: 'support@carsi.com.au' },
  adminUsersCookie: { principal: 'admin', cookie: 'ops@carsi.com.au' },
  instructor: {
    principal: 'instructor',
    lms: {
      sub: 'u-inst',
      email: 'inst@carsi.com.au',
      tokenRole: 'instructor',
      dbRole: 'instructor',
    },
  },
  demotedStaleJwt: {
    principal: 'anyone',
    lms: {
      sub: 'u-demoted',
      email: 'was.admin@carsi.com.au',
      tokenRole: 'admin',
      dbRole: 'student',
    },
  },
  demotedInstructorStaleJwt: {
    principal: 'anyone',
    lms: {
      sub: 'u-was-inst',
      email: 'was.inst@carsi.com.au',
      tokenRole: 'instructor',
      dbRole: 'student',
    },
  },
  deactivatedInstructor: {
    principal: 'anyone',
    lms: {
      sub: 'u-gone',
      email: 'gone@carsi.com.au',
      tokenRole: 'instructor',
      dbRole: 'instructor',
      active: false,
    },
  },
  student: {
    principal: 'anyone',
    lms: {
      sub: 'u-student',
      email: 'learner@example.com',
      tokenRole: 'student',
      dbRole: 'student',
    },
  },
  noSession: { principal: 'anyone' },
};

vi.mock('@/lib/server/auth-from-request', () => ({
  getSessionClaimsFromRequest: async () => {
    const lms = PERSONAS[m.persona]?.lms;
    return lms ? { sub: lms.sub, email: lms.email, role: lms.tokenRole, full_name: 'X' } : null;
  },
}));
vi.mock('@/lib/admin/admin-auth', () => ({
  ADMIN_COOKIE_NAME: 'admin_session',
  verifyAdminSessionToken: async (t: string) => {
    const cookie = PERSONAS[m.persona]?.cookie;
    return t === 'valid' && cookie ? { email: cookie } : null;
  },
}));
vi.mock('@/lib/server/review-summary', () => ({
  getReviewFunnelSummary: async () => ({ hides_by_reason_and_rating: [] }),
}));
// The AI model boundary: anything passed here would leave CARSI for a third-party model.
vi.mock('@/lib/server/review-reply-draft', () => ({
  draftReviewReply: async (input: Record<string, unknown>) => {
    m.modelCalls.push(input);
    return 'Thanks for the feedback.';
  },
}));

const PUBLISHED = {
  id: 'rev-pub',
  rating: 5,
  title: 'Great',
  body: 'public text',
  reply: null,
  repliedAt: null,
  createdAt: new Date('2026-10-02'),
  isPublished: true,
};
const HIDDEN = {
  ...PUBLISHED,
  id: 'rev-hidden',
  rating: 1,
  title: 'Hidden',
  body: 'private phone number',
  isPublished: false,
};
vi.mock('@/lib/prisma', () => {
  const target = () => (m.reviewHidden ? HIDDEN : PUBLISHED);
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
        const lms = Object.values(PERSONAS).find((p) => p.lms?.sub === String(values[0]))?.lms;
        return lms
          ? [{ id: lms.sub, email: lms.email, is_active: lms.active !== false, role: lms.dbRole }]
          : [];
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
      // Like Prisma, returns ONLY the selected fields; a read of private text is counted.
      // Honours a WHERE isPublished condition, as PostgreSQL does at the moment the query runs.
      findFirst: async ({
        where,
        select,
      }: {
        where: { isPublished?: boolean };
        select: Record<string, boolean>;
      }) => {
        const row = target() as Record<string, unknown>;
        const privateRead = Boolean(select.body || select.title);
        const result =
          where.isPublished !== undefined && where.isPublished !== row.isPublished
            ? null
            : Object.fromEntries(Object.entries(row).filter(([k]) => select[k]));
        if (privateRead && result) m.bodyReads += 1;
        // r13 reproduction: an admin's hide commits between the visibility read and the text read.
        if (!privateRead && m.hideAfterVisibilityRead) m.reviewHidden = true;
        return result;
      },
      findMany: async ({ where }: { where: { isPublished?: boolean } }) =>
        (where.isPublished === true ? [PUBLISHED] : [PUBLISHED, HIDDEN]).map((r) => ({
          ...r,
          student: { fullName: 'Sam Rivers', email: 's@example.com' },
          moderationEvents: [],
        })),
      update: async (args: { data: Record<string, unknown> }) => {
        m.writes.push(`review.update:${Object.keys(args.data).sort().join(',')}`);
        return {
          ...target(),
          moderationVersion: 3,
          course: { id: 'course-1', slug: 'water-damage', title: 'Water Damage Restoration' },
        };
      },
      // The conditional reply write: matches only if every WHERE condition holds for the row.
      updateMany: async (args: {
        where: { isPublished?: boolean };
        data: Record<string, unknown>;
      }) => {
        m.writeAttempts += 1;
        const publishedNow = m.hiddenAtWrite === null ? target().isPublished : !m.hiddenAtWrite;
        if (args.where.isPublished !== undefined && args.where.isPublished !== publishedNow)
          return { count: 0 };
        m.writes.push(`review.updateMany:${Object.keys(args.data).sort().join(',')}`);
        return { count: 1 };
      },
    },
    lmsCourseReviewModerationEvent: {
      create: async (args: { data: Record<string, unknown> }) => {
        m.writes.push('moderation_event.create');
        m.events.push(args.data);
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
const { POST: draftPOST } =
  await import('../../../app/api/lms/courses/[slug]/reviews/[id]/reply/draft/route');
const { GET: reviewsGET } = await import('../../../app/api/lms/courses/[slug]/reviews/route');
const { GET: summaryGET } = await import('../../../app/api/admin/reviews/summary/route');
const SAVED = {
  db: process.env.DATABASE_URL,
  admin: process.env.ADMIN_EMAIL,
  panel: process.env.ADMIN_PANEL_EMAILS,
};

function request(url: string, body?: unknown): NextRequest {
  const headers: Record<string, string> = {};
  if (PERSONAS[m.persona]?.cookie) headers.cookie = 'admin_session=valid';
  return new NextRequest(
    url,
    body === undefined ? { headers } : { method: 'POST', body: JSON.stringify(body), headers }
  );
}
const ctx = () => ({
  params: Promise.resolve({ slug: 'water-damage', id: m.reviewHidden ? HIDDEN.id : PUBLISHED.id }),
});
const base = 'http://localhost/api/lms/courses/water-damage/reviews';

type Action = {
  /** Every capability the action needs, as named in the rule table. */
  needs: ReviewCapability[];
  hidden: boolean;
  /** 'write' and 'model' actions must leave a trace when allowed; 'read' actions are GET views. */
  effect: 'write' | 'model' | 'read';
  run: () => Promise<{ status: number; allowed: boolean }>;
};
const status = (res: Response) => ({ status: res.status, allowed: res.status === 200 });
const ACTIONS: Record<string, Action> = {
  'moderate: hide a published review': {
    needs: ['moderate'],
    hidden: false,
    effect: 'write',
    run: async () =>
      status(
        await publishPOST(
          request(`${base}/x/publish`, { is_published: false, reason: 'offensive' }),
          ctx()
        )
      ),
  },
  'moderate: unhide a hidden review': {
    needs: ['moderate'],
    hidden: true,
    effect: 'write',
    run: async () =>
      status(await publishPOST(request(`${base}/x/publish`, { is_published: true }), ctx())),
  },
  'reply: publish on a published review': {
    needs: ['replyPublished'],
    hidden: false,
    effect: 'write',
    run: async () =>
      status(await replyPOST(request(`${base}/x/reply`, { reply: 'Official response' }), ctx())),
  },
  'reply: clear on a published review': {
    needs: ['replyPublished'],
    hidden: false,
    effect: 'write',
    run: async () => status(await replyPOST(request(`${base}/x/reply`, { reply: null }), ctx())),
  },
  'reply: publish on a hidden review': {
    needs: ['replyHidden'],
    hidden: true,
    effect: 'write',
    run: async () =>
      status(await replyPOST(request(`${base}/x/reply`, { reply: 'Official response' }), ctx())),
  },
  'reply: clear on a hidden review': {
    needs: ['replyHidden'],
    hidden: true,
    effect: 'write',
    run: async () => status(await replyPOST(request(`${base}/x/reply`, { reply: null }), ctx())),
  },
  'AI draft for a published review': {
    needs: ['replyPublished', 'readPublished'],
    hidden: false,
    effect: 'model',
    run: async () => status(await draftPOST(request(`${base}/x/reply/draft`, {}), ctx())),
  },
  'AI draft for a hidden review': {
    needs: ['replyHidden', 'readHidden'],
    hidden: true,
    effect: 'model',
    run: async () => status(await draftPOST(request(`${base}/x/reply/draft`, {}), ctx())),
  },
  'read hidden reviews (GET)': {
    needs: ['readHidden'],
    hidden: true,
    effect: 'read',
    run: async () => {
      const res = await reviewsGET(request(base), {
        params: Promise.resolve({ slug: 'water-damage' }),
      });
      const body = await res.json();
      m.lastGetFlags = { can_manage: body.can_manage, can_moderate: body.can_moderate };
      return {
        status: res.status,
        allowed: body.reviews.some((r: { id: string }) => r.id === HIDDEN.id),
      };
    },
  },
  'read published reviews (GET)': {
    needs: ['readPublished'],
    hidden: false,
    effect: 'read',
    run: async () => {
      const res = await reviewsGET(request(base), {
        params: Promise.resolve({ slug: 'water-damage' }),
      });
      const body = await res.json();
      m.lastGetFlags = { can_manage: body.can_manage, can_moderate: body.can_moderate };
      return {
        status: res.status,
        allowed: body.reviews.some((r: { id: string }) => r.id === PUBLISHED.id),
      };
    },
  },
  'moderation summary (GET)': {
    needs: ['moderate'],
    hidden: false,
    effect: 'read',
    run: async () =>
      status(await summaryGET(request('http://localhost/api/admin/reviews/summary'))),
  },
};

beforeEach(() => {
  process.env.DATABASE_URL = 'postgres://test';
  process.env.ADMIN_EMAIL = 'support@carsi.com.au';
  delete process.env.ADMIN_PANEL_EMAILS;
  m.writes = [];
  m.events = [];
  m.modelCalls = [];
  m.bodyReads = 0;
  m.writeAttempts = 0;
  m.lastGetFlags = null;
  m.reviewHidden = false;
  m.hiddenAtWrite = null;
  m.hideAfterVisibilityRead = false;
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

describe('the rule table is the policy (changing it must be deliberate)', () => {
  it('admin may do everything; an instructor reads and replies to published reviews only; anyone reads published only', () => {
    expect(REVIEW_ACCESS).toEqual({
      admin: {
        readPublished: true,
        readHidden: true,
        replyPublished: true,
        replyHidden: true,
        moderate: true,
      },
      instructor: {
        readPublished: true,
        readHidden: false,
        replyPublished: true,
        replyHidden: false,
        moderate: false,
      },
      anyone: {
        readPublished: true,
        readHidden: false,
        replyPublished: false,
        replyHidden: false,
        moderate: false,
      },
    });
  });
});

// Generated: every persona x every action, the expected outcome read from REVIEW_ACCESS.
const CASES = Object.entries(PERSONAS).flatMap(([persona, fx]) =>
  Object.entries(ACTIONS).map(([action, a]) => ({
    persona,
    action,
    principal: fx.principal,
    expected: a.needs.every((cap) => REVIEW_ACCESS[fx.principal][cap]),
  }))
);

describe.each(CASES)(
  '$persona → $action (allowed: $expected)',
  ({ persona, action, principal, expected }) => {
    it('matches the rule table', async () => {
      const a = ACTIONS[action]!;
      m.persona = persona;
      m.reviewHidden = a.hidden;
      const out = await a.run();
      expect(out.allowed).toBe(expected);
      if (a.effect === 'read' && action !== 'moderation summary (GET)') {
        expect(out.status).toBe(200); // GET always answers; denial means the data is absent
      } else if (expected) {
        expect(out.status).toBe(200);
      } else {
        expect(out.status).toBe(persona === 'noSession' ? 401 : 403);
      }
      if (expected && a.effect === 'write') expect(m.writes.length).toBeGreaterThan(0);
      if (expected && a.effect === 'model') expect(m.modelCalls).toHaveLength(1);
      if (m.lastGetFlags) {
        // The controls a GET advertises come from the same table.
        expect(m.lastGetFlags).toEqual({
          can_manage: REVIEW_ACCESS[principal].replyPublished,
          can_moderate: REVIEW_ACCESS[principal].moderate,
        });
      }
      if (!expected) {
        expect(m.writes).toEqual([]);
        expect(m.writeAttempts).toBe(0); // a denied caller never even attempts the write
        expect(m.modelCalls).toEqual([]);
        expect(m.bodyReads).toBe(0); // no private text read on any denial
      }
    });
  }
);

describe('what an allowed AI draft sends is exactly the review it was allowed to read', () => {
  it('a current instructor drafting for a published review sends that review only', async () => {
    m.persona = 'instructor';
    expect((await ACTIONS['AI draft for a published review']!.run()).status).toBe(200);
    expect(m.modelCalls).toEqual([
      { courseTitle: 'Water Damage Restoration', rating: 5, title: 'Great', body: 'public text' },
    ]);
  });
  it('an admin drafting for a hidden review sends it (admins may read hidden reviews)', async () => {
    m.persona = 'founder';
    m.reviewHidden = true;
    expect((await ACTIONS['AI draft for a hidden review']!.run()).status).toBe(200);
    expect(m.modelCalls[0]).toMatchObject({ body: 'private phone number' });
  });
});

describe('r12: a review hidden between the visibility check and the write is never replied to by an instructor', () => {
  it.each(['reply: publish on a published review', 'reply: clear on a published review'] as const)(
    '%s, hidden mid-transaction → 403, no write',
    async (action) => {
      m.persona = 'instructor';
      m.reviewHidden = false; // the visibility check sees it published...
      m.hiddenAtWrite = true; // ...and it is hidden before the conditional write
      expect((await ACTIONS[action]!.run()).status).toBe(403);
      expect(m.writes).toEqual([]);
    }
  );
  it('an admin may still reply to it (admins may reply to hidden reviews)', async () => {
    m.persona = 'dbAdmin';
    m.hiddenAtWrite = true;
    expect((await ACTIONS['reply: publish on a published review']!.run()).status).toBe(200);
    expect(m.writes).toHaveLength(1);
  });
});

describe('r13 reviewer reproduction: a hide committed between the visibility check and the text read', () => {
  it("an instructor's AI draft is refused and NOTHING is sent to the model", async () => {
    m.persona = 'instructor';
    m.reviewHidden = false; // published at the visibility check...
    m.hideAfterVisibilityRead = true; // ...an admin hides it before the text is read
    const out = await ACTIONS['AI draft for a published review']!.run();
    expect(out).toEqual({ status: 403, allowed: false });
    expect(m.modelCalls).toEqual([]);
    expect(m.bodyReads).toBe(0); // the conditional read returned no row: no hidden text read
  });

  it('an admin, who may read hidden reviews, still gets the draft', async () => {
    m.persona = 'dbAdmin';
    m.hideAfterVisibilityRead = true;
    expect((await ACTIONS['AI draft for a published review']!.run()).status).toBe(200);
    expect(m.modelCalls).toHaveLength(1);
  });
});

describe('the moderation audit records the verified admin, by kind', () => {
  it.each([
    [
      'founder',
      {
        actorKind: 'lms_admin',
        actorRef: 'u-founder',
        actorId: 'u-founder',
        actorEmail: 'phill.m@carsi.com.au',
      },
    ],
    [
      'dbAdmin',
      {
        actorKind: 'lms_admin',
        actorRef: 'u-admin',
        actorId: 'u-admin',
        actorEmail: 'admin@carsi.com.au',
      },
    ],
    [
      'bootstrapCookie',
      {
        actorKind: 'bootstrap_admin',
        actorRef: null,
        actorId: null,
        actorEmail: 'support@carsi.com.au',
      },
    ],
    [
      'adminUsersCookie',
      { actorKind: 'admin_user', actorRef: 'adm-7', actorId: null, actorEmail: 'ops@carsi.com.au' },
    ],
  ] as const)('%s', async (persona, actor) => {
    m.persona = persona;
    expect((await ACTIONS['moderate: hide a published review']!.run()).status).toBe(200);
    expect(m.events).toHaveLength(1);
    expect(m.events[0]).toMatchObject(actor);
  });
});

describe('r11/r12 sweep: every review route decides access from the database and the rule table, none from the token role', () => {
  const ROOT = join(process.cwd(), 'app/api/lms/courses/[slug]/reviews');
  const routes = (dir: string): string[] =>
    readdirSync(dir).flatMap((name) => {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) return routes(full);
      return name === 'route.ts' ? [full] : [];
    });
  const ADMIN_ROUTES = [
    '[id]/publish/route.ts',
    '[id]/reply/route.ts',
    '[id]/reply/draft/route.ts',
  ];
  const LEARNER_ROUTE = 'route.ts';

  it('the route list is complete (a new sibling route must be added here deliberately)', () => {
    const found = routes(ROOT)
      .map((f) => f.slice(ROOT.length + 1))
      .sort();
    expect(found).toEqual([...ADMIN_ROUTES, LEARNER_ROUTE].sort());
  });

  it.each([
    ...ADMIN_ROUTES.map((r) => join(ROOT, r)),
    join(process.cwd(), 'app/api/admin/reviews/summary/route.ts'),
  ])('%s: the one session reader, a database decision, no token role', (file) => {
    const src = readFileSync(file, 'utf8');
    expect(src).toContain('readReviewAdminSession(request)');
    expect(src).toMatch(/resolveCurrentAdmin\(|resolveCurrentReviewManager\(/);
    expect(src).not.toMatch(/getSessionClaimsFromRequest/);
    expect(src).not.toMatch(/claims\??\.role|canManageReviews|canModerateReviews/);
  });

  it('the draft and learner routes take their visibility decisions from the rule table', () => {
    for (const r of ['[id]/reply/draft/route.ts', LEARNER_ROUTE]) {
      expect(readFileSync(join(ROOT, r), 'utf8')).toContain(
        "from '@/lib/server/review-access-rules'"
      );
    }
    expect(readFileSync(join(process.cwd(), 'src/lib/server/course-reviews.ts'), 'utf8')).toContain(
      "from '@/lib/server/review-access-rules'"
    );
  });

  it('the learner route reads admin access only through the database rule (never claims.role)', () => {
    const src = readFileSync(join(ROOT, LEARNER_ROUTE), 'utf8');
    expect(src).toContain('readReviewAdminSession(request)');
    expect(src).toContain('resolveCurrentReviewManager(tx, adminSession)');
    expect(src).not.toMatch(/claims\??\.role|canManageReviews|canModerateReviews/);
  });
});
