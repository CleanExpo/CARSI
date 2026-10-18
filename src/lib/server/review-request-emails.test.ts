/**
 * AC-4 (spec 2026-10-18 D9-D11, D17): the review-request email is off by default, sent at most
 * once per enrolment, retried after a failed send, never sent to opted-out learners, bounded to
 * 3-14 day old completions with a per-run cap, and carries unsubscribe headers.
 *
 * The ledger fake ENFORCES the UNIQUE enrollment_id (throws P2002 like Postgres), because a
 * mocked `create` that always succeeds cannot prove "a re-run sends no second email".
 */
import { beforeEach, describe, expect, expectTypeOf, it, vi } from 'vitest';

type Enrolment = {
  id: string;
  studentId: string;
  courseId: string;
  status: string;
  completedAt: Date | null;
  course: { slug: string; title: string; category: string | null };
};
type Ledger = { status: string; attempts: number; failureReason: string | null; providerMessageId: string | null; sentAt: Date | null };

const db = vi.hoisted(() => ({
  enrolments: [] as Enrolment[],
  users: new Map<string, { email: string; fullName: string | null; emailOptOut: boolean; isActive: boolean }>(),
  reviews: new Set<string>(),
  ledger: new Map<string, Ledger>(),
}));
const mail = vi.hoisted(() => ({ send: vi.fn(), configured: vi.fn(() => true) }));

vi.mock('@/lib/server/email', () => ({ sendEmail: mail.send, isEmailConfigured: mail.configured }));
vi.mock('@/lib/auth/session-jwt', () => ({ signEmailUnsubscribeToken: async (id: string) => `tok-${id}` }));
vi.mock('@/lib/server/app-url', () => ({ getAppOrigin: () => 'https://carsi.com.au' }));
vi.mock('@/lib/prisma', () => ({
  prisma: {
    lmsEnrollment: {
      findMany: async ({ where, take }: { where: { status: string; completedAt: { gte: Date; lte: Date } }; take: number }) =>
        db.enrolments
          .filter(
            (e) =>
              e.status === where.status &&
              e.completedAt !== null &&
              e.completedAt >= where.completedAt.gte &&
              e.completedAt <= where.completedAt.lte
          )
          .sort((a, b) => a.completedAt!.getTime() - b.completedAt!.getTime())
          .slice(0, take)
          // Snapshot at read time, like a real query result.
          .map((e) => {
            const l = db.ledger.get(e.id);
            return { ...e, reviewRequestEmail: l ? { status: l.status, attempts: l.attempts } : null };
          }),
    },
    lmsReviewRequestEmail: {
      create: async ({ data }: { data: { enrollmentId: string; status: string } }) => {
        if (db.ledger.has(data.enrollmentId)) throw Object.assign(new Error('Unique constraint failed'), { code: 'P2002' });
        db.ledger.set(data.enrollmentId, { status: data.status, attempts: 0, failureReason: null, providerMessageId: null, sentAt: null });
        return {};
      },
      updateMany: async ({ where, data }: { where: { enrollmentId: string; status: string; attempts: { lt: number } }; data: { status: string } }) => {
        const l = db.ledger.get(where.enrollmentId);
        if (!l || l.status !== where.status || !(l.attempts < where.attempts.lt)) return { count: 0 };
        l.status = data.status;
        return { count: 1 };
      },
      update: async ({ where, data }: { where: { enrollmentId: string }; data: Partial<Ledger> & { attempts?: { increment: number } } }) => {
        const l = db.ledger.get(where.enrollmentId);
        if (!l) throw new Error('no ledger row');
        const { attempts, ...rest } = data;
        Object.assign(l, rest);
        if (attempts) l.attempts += attempts.increment;
        return {};
      },
    },
    lmsUser: { findUnique: async ({ where }: { where: { id: string } }) => db.users.get(where.id) ?? null },
    lmsCourseReview: {
      findUnique: async ({ where }: { where: { courseId_studentId: { courseId: string; studentId: string } } }) =>
        db.reviews.has(`${where.courseId_studentId.courseId}:${where.courseId_studentId.studentId}`) ? { id: 'r' } : null,
    },
  },
}));

const {
  readReviewRequestConfig,
  renderReviewRequestEmail,
  REVIEW_REQUEST_MAX_SENDS_PER_RUN,
  runReviewRequestEmails,
  wasReallySent,
} = await import('./review-request-email');

const NOW = new Date('2026-10-18T00:00:00.000Z');
const H = 3_600_000;
const D = 24 * H;
const ON = { REVIEW_REQUEST_EMAILS_ENABLED: 'true', REVIEW_REQUEST_EMAILS_SINCE: '2026-09-01' };

function addCompleter(id: string, completedAgoMs: number, opts: Partial<Enrolment> & { studentId?: string } = {}) {
  const studentId = opts.studentId ?? `student-${id}`;
  db.enrolments.push({
    id,
    studentId,
    courseId: opts.courseId ?? `course-${id}`,
    status: opts.status ?? 'completed',
    completedAt: new Date(NOW.getTime() - completedAgoMs),
    course: opts.course ?? { slug: 'water-damage', title: 'Water Damage Restoration', category: 'restoration' },
  });
  if (!db.users.has(studentId)) {
    db.users.set(studentId, { email: `${studentId}@example.com`, fullName: 'Sam Rivers', emailOptOut: false, isActive: true });
  }
}
const run = (env: Record<string, string | undefined> = ON, extra: { dryRun?: boolean; now?: Date } = {}) =>
  runReviewRequestEmails({ now: extra.now ?? NOW, env, dryRun: extra.dryRun });

beforeEach(() => {
  db.enrolments.length = 0;
  db.users.clear();
  db.reviews.clear();
  db.ledger.clear();
  mail.send.mockReset().mockResolvedValue({ sent: true, messageId: 'm-1' });
  mail.configured.mockReset().mockReturnValue(true);
});

describe('off by default (D10)', () => {
  it.each([
    ['unset', {}],
    ['empty', { REVIEW_REQUEST_EMAILS_ENABLED: '' }],
    ['"false"', { REVIEW_REQUEST_EMAILS_ENABLED: 'false' }],
    ['"0"', { REVIEW_REQUEST_EMAILS_ENABLED: '0' }],
    ['"1"', { REVIEW_REQUEST_EMAILS_ENABLED: '1' }],
    ['"TRUE"', { REVIEW_REQUEST_EMAILS_ENABLED: 'TRUE' }],
    ['" true"', { REVIEW_REQUEST_EMAILS_ENABLED: ' true' }],
  ])('flag %s → disabled, nothing sent', async (_label, env) => {
    addCompleter('e1', 4 * D);
    const res = await run({ ...env, REVIEW_REQUEST_EMAILS_SINCE: '2026-09-01' });
    expect(res.reason).toBe('disabled');
    expect(mail.send).not.toHaveBeenCalled();
    expect(db.ledger.size).toBe(0);
  });

  it('flag on without a send-from date sends nothing (no back-catalogue mass send)', async () => {
    addCompleter('e1', 4 * D);
    expect((await run({ REVIEW_REQUEST_EMAILS_ENABLED: 'true' })).reason).toBe('since_missing');
    expect((await run({ REVIEW_REQUEST_EMAILS_ENABLED: 'true', REVIEW_REQUEST_EMAILS_SINCE: 'soon' })).reason).toBe('since_invalid');
    expect(mail.send).not.toHaveBeenCalled();
  });

  it('flag on but email not configured → not ok (the scheduler goes red)', async () => {
    mail.configured.mockReturnValue(false);
    const res = await run();
    expect(res).toMatchObject({ ok: false, reason: 'email_not_configured' });
  });

  it('only the exact value "true" enables sending', () => {
    expect(readReviewRequestConfig(ON)).toEqual({ enabled: true, since: new Date('2026-09-01') });
  });
});

describe('window: 3 to 14 days after completion, never before SINCE (D10)', () => {
  it.each([
    ['71h59m old', 71 * H + 59 * 60_000, false],
    ['exactly 72h old', 72 * H, true],
    ['14 days old', 14 * D, true],
    ['14 days and a minute old', 14 * D + 60_000, false],
    ['30 days old', 30 * D, false],
  ])('%s → emailed: %s', async (_label, age, expected) => {
    addCompleter('e1', age as number);
    const res = await run({ ...ON, REVIEW_REQUEST_EMAILS_SINCE: '2026-01-01' });
    expect(res.sent).toBe(expected ? 1 : 0);
  });

  it('completions before SINCE are never emailed', async () => {
    addCompleter('e1', 10 * D); // 2026-10-08
    expect((await run({ ...ON, REVIEW_REQUEST_EMAILS_SINCE: '2026-10-10' })).sent).toBe(0);
  });

  it('a non-completed or revoked enrolment is never emailed', async () => {
    addCompleter('e1', 5 * D, { status: 'active' });
    addCompleter('e2', 5 * D, { status: 'revoked' });
    expect((await run()).sent).toBe(0);
  });

  it('internal onboarding programmes are not asked', async () => {
    addCompleter('e1', 5 * D, { course: { slug: 'floor-care-onboarding-operational-readiness', title: 'Onboarding', category: null } });
    const res = await run();
    expect(res.sent).toBe(0);
    expect(res.skipped.onboarding_course).toBe(1);
  });
});

describe('at most once per enrolment (D9)', () => {
  it('a re-run sends no second email', async () => {
    addCompleter('e1', 5 * D);
    expect((await run()).sent).toBe(1);
    const again = await run();
    expect(again.sent).toBe(0);
    expect(again.skipped.already_handled).toBe(1);
    expect(mail.send).toHaveBeenCalledTimes(1);
    expect(db.ledger.get('e1')).toMatchObject({ status: 'sent', attempts: 1, providerMessageId: 'm-1' });
  });

  it('two overlapping runs send one email: the UNIQUE key stops the second claim', async () => {
    addCompleter('e1', 5 * D);
    const [a, b] = await Promise.all([run(), run()]);
    expect(a.sent + b.sent).toBe(1);
    expect((a.skipped.claimed_elsewhere ?? 0) + (b.skipped.claimed_elsewhere ?? 0)).toBe(1);
    expect(mail.send).toHaveBeenCalledTimes(1);
  });
});

describe('a failed send is retried, never silently used up (D9)', () => {
  it('provider_error → failed and the run is not ok; the next run retries and sends', async () => {
    addCompleter('e1', 5 * D);
    mail.send.mockResolvedValueOnce({ sent: false, reason: 'provider_error' });
    const first = await run();
    expect(first).toMatchObject({ ok: false, sent: 0, failed: 1, failed_enrollment_ids: ['e1'] });
    expect(db.ledger.get('e1')).toMatchObject({ status: 'failed', attempts: 1, failureReason: 'provider_error' });
    const second = await run();
    expect(second).toMatchObject({ ok: true, sent: 1, failed: 0 });
    expect(db.ledger.get('e1')).toMatchObject({ status: 'sent', attempts: 2 });
  });

  it('dev_console (printed, not sent) counts as a failure', async () => {
    addCompleter('e1', 5 * D);
    mail.send.mockResolvedValueOnce({ sent: true, reason: 'dev_console' });
    const res = await run();
    expect(res.failed).toBe(1);
    expect(db.ledger.get('e1')?.status).toBe('failed');
    expect(wasReallySent({ sent: true, reason: 'dev_console' })).toBe(false);
  });

  it('a thrown send is recorded as failed', async () => {
    addCompleter('e1', 5 * D);
    mail.send.mockRejectedValueOnce(new Error('network'));
    expect((await run()).failed).toBe(1);
  });

  it('stops after 3 attempts', async () => {
    addCompleter('e1', 5 * D);
    mail.send.mockResolvedValue({ sent: false, reason: 'provider_error' });
    for (let i = 0; i < 3; i++) await run();
    const fourth = await run();
    expect(fourth.skipped.attempts_exhausted).toBe(1);
    expect(mail.send).toHaveBeenCalledTimes(3);
  });
});

describe('consent and ask-once are re-checked right before sending (D11)', () => {
  it('an opted-out learner gets no email', async () => {
    addCompleter('e1', 5 * D);
    db.users.get('student-e1')!.emailOptOut = true;
    const res = await run();
    expect(mail.send).not.toHaveBeenCalled();
    expect(res.skipped.opted_out).toBe(1);
    expect(db.ledger.get('e1')).toMatchObject({ status: 'skipped', failureReason: 'opted_out' });
  });

  it('a learner who already reviewed (published or hidden) gets no email', async () => {
    addCompleter('e1', 5 * D);
    db.reviews.add('course-e1:student-e1');
    const res = await run();
    expect(mail.send).not.toHaveBeenCalled();
    expect(res.skipped.already_reviewed).toBe(1);
  });

  it('every send carries one-click unsubscribe headers and a visible unsubscribe link', async () => {
    addCompleter('e1', 5 * D);
    await run();
    const params = mail.send.mock.calls[0]![0];
    expect(params.to).toBe('student-e1@example.com');
    expect(params.headers).toEqual({
      'List-Unsubscribe': '<https://carsi.com.au/unsubscribe?token=tok-student-e1>',
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    });
    expect(params.html).toContain('https://carsi.com.au/unsubscribe?token=tok-student-e1');
    expect(params.text).toContain('Unsubscribe: https://carsi.com.au/unsubscribe?token=tok-student-e1');
    expect(params.text).toContain('support@carsi.com.au');
    expect(params.html).toContain('https://carsi.com.au/dashboard/courses/water-damage#reviews');
  });
});

describe('volume limits (D10, D17)', () => {
  it(`sends at most ${REVIEW_REQUEST_MAX_SENDS_PER_RUN} per run, oldest first; the next run continues`, async () => {
    for (let i = 0; i < 150; i++) addCompleter(`e${String(i).padStart(3, '0')}`, 4 * D + i * 60_000);
    const first = await run();
    expect(first.sent).toBe(REVIEW_REQUEST_MAX_SENDS_PER_RUN);
    // Oldest first: the largest ages (highest i) went first.
    expect(db.ledger.has('e149')).toBe(true);
    expect(db.ledger.has('e000')).toBe(false);
    const second = await run();
    expect(second.sent).toBe(REVIEW_REQUEST_MAX_SENDS_PER_RUN);
    expect(mail.send).toHaveBeenCalledTimes(100);
  });

  it('one email per learner per run, even with several eligible enrolments', async () => {
    addCompleter('e1', 6 * D, { studentId: 'sam' });
    addCompleter('e2', 5 * D, { studentId: 'sam' });
    const first = await run();
    expect(first.sent).toBe(1);
    expect(first.skipped.same_learner_this_run).toBe(1);
    expect((await run()).sent).toBe(1);
  });

  it('dry run counts without writing or sending', async () => {
    addCompleter('e1', 5 * D);
    addCompleter('e2', 6 * D);
    const res = await run(ON, { dryRun: true });
    expect(res.would_send).toBe(2);
    expect(mail.send).not.toHaveBeenCalled();
    expect(db.ledger.size).toBe(0);
  });
});

describe('the email asks everyone the same way (D11)', () => {
  it('takes no rating or score — the same words for every learner', () => {
    type P = Parameters<typeof renderReviewRequestEmail>[0];
    expectTypeOf<keyof P>().toEqualTypeOf<'appOrigin' | 'name' | 'courseTitle' | 'reviewUrl' | 'unsubscribeUrl'>();
    const e = renderReviewRequestEmail({
      appOrigin: 'https://carsi.com.au',
      name: 'Sam',
      courseTitle: 'Water Damage Restoration',
      reviewUrl: 'https://carsi.com.au/dashboard/courses/water-damage#reviews',
      unsubscribeUrl: 'https://carsi.com.au/unsubscribe?token=t',
    });
    expect(e.subject).toBe('How was Water Damage Restoration?');
    expect(e.text).toContain('in your own words');
    expect(e.text).toContain('We ask everyone who completes a course, once.');
  });
});

describe('cron route makes failures visible to the scheduler (D9, D13)', () => {
  const ENV_KEYS = ['CRON_SECRET', 'DATABASE_URL', 'REVIEW_REQUEST_EMAILS_ENABLED', 'REVIEW_REQUEST_EMAILS_SINCE'] as const;
  async function callRoute(env: Partial<Record<(typeof ENV_KEYS)[number], string>>, query = '') {
    const saved = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));
    for (const k of ENV_KEYS) delete process.env[k];
    Object.assign(process.env, { CRON_SECRET: 'test-cron-value', DATABASE_URL: 'postgres://test' }, env);
    try {
      const { GET } = await import('../../../app/api/cron/review-requests/route');
      const res = await GET(
        new Request(`https://carsi.com.au/api/cron/review-requests${query}`, {
          headers: { authorization: 'Bearer test-cron-value' },
        })
      );
      return { status: res.status, body: await res.json() };
    } finally {
      for (const k of ENV_KEYS) {
        if (saved[k] === undefined) delete process.env[k];
        else process.env[k] = saved[k];
      }
    }
  }

  it('flag off → 200 with reason "disabled" (distinct from nobody eligible)', async () => {
    addCompleter('e1', 5 * D);
    const r = await callRoute({});
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ reason: 'disabled', sent: 0 });
  });

  it('a failed send → 500, so `curl -fsS` fails the scheduled job', async () => {
    addCompleter('e1', 5 * D);
    mail.send.mockResolvedValueOnce({ sent: false, reason: 'provider_error' });
    const r = await callRoute({ REVIEW_REQUEST_EMAILS_ENABLED: 'true', REVIEW_REQUEST_EMAILS_SINCE: '2026-09-01' });
    expect(r.status).toBe(500);
    expect(r.body).toMatchObject({ failed: 1, failed_enrollment_ids: ['e1'] });
    expect(JSON.stringify(r.body)).not.toContain('@example.com');
  });

  it('dry_run=1 → counts only', async () => {
    addCompleter('e1', 5 * D);
    const r = await callRoute({ REVIEW_REQUEST_EMAILS_ENABLED: 'true', REVIEW_REQUEST_EMAILS_SINCE: '2026-09-01' }, '?dry_run=1');
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ dry_run: true, would_send: 1, sent: 0 });
    expect(mail.send).not.toHaveBeenCalled();
  });
});
