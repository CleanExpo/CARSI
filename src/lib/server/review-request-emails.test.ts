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
type Ledger = {
  status: string;
  attempts: number;
  claimToken: string | null;
  sendAttemptedAt: Date | null;
  updatedAt: Date;
  failureReason: string | null;
  providerMessageId: string | null;
  sentAt: Date | null;
};
type LedgerWhere = {
  enrollmentId: string;
  status?: string;
  attempts?: { lt: number };
  claimToken?: string | null;
  sendAttemptedAt?: null;
  updatedAt?: { lt: Date };
};

const db = vi.hoisted(() => ({
  enrolments: [] as Enrolment[],
  users: new Map<string, { email: string; fullName: string | null; emailOptOut: boolean; isActive: boolean }>(),
  reviews: new Set<string>(),
  ledger: new Map<string, Ledger>(),
  /** Wall-clock the fake stamps on writes (Prisma's @updatedAt). */
  clock: new Date('2026-10-18T00:00:00.000Z'),
  failUserReadOnce: false,
}));
const mail = vi.hoisted(() => ({ send: vi.fn(), configured: vi.fn(() => true) }));
const unsub = vi.hoisted(() => ({ setOptOut: vi.fn(async (_id: string, optedOut: boolean) => ({ email_opt_out: optedOut })) }));

vi.mock('@/lib/server/email', () => ({ sendEmail: mail.send, isEmailConfigured: mail.configured }));
vi.mock('@/lib/auth/session-jwt', () => ({
  signEmailUnsubscribeToken: async (id: string) => `tok-${id}`,
  verifyEmailUnsubscribeToken: async (token: string) => (token.startsWith('tok-') ? token.slice(4) : null),
}));
vi.mock('@/lib/server/email-preferences', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/server/email-preferences')>()),
  setEmailOptOut: unsub.setOptOut,
}));
vi.mock('@/lib/server/app-url', () => ({ getAppOrigin: () => 'https://carsi.com.au' }));

function ledgerMatches(l: Ledger | undefined, where: LedgerWhere): l is Ledger {
  if (!l) return false;
  if (where.status !== undefined && l.status !== where.status) return false;
  if (where.attempts && !(l.attempts < where.attempts.lt)) return false;
  if ('claimToken' in where && l.claimToken !== where.claimToken) return false;
  if ('sendAttemptedAt' in where && l.sendAttemptedAt !== null) return false;
  if (where.updatedAt && !(l.updatedAt < where.updatedAt.lt)) return false;
  return true;
}

type FindWhere = {
  status: string;
  completedAt: { gte: Date; lte: Date };
  OR: Array<{ reviewRequestEmail: { is: null | { status: string; attempts?: { lt: number }; updatedAt?: { lt: Date } } } }>;
  AND?: Array<{ OR: [{ completedAt: { gt: Date } }, { completedAt: Date; id: { gt: string } }] }>;
};

vi.mock('@/lib/prisma', () => ({
  prisma: {
    lmsEnrollment: {
      findMany: async ({ where, take }: { where: FindWhere; take: number }) => {
        const after = where.AND?.[0]?.OR;
        return db.enrolments
          .filter((e) => {
            if (e.status !== where.status || e.completedAt === null) return false;
            if (e.completedAt < where.completedAt.gte || e.completedAt > where.completedAt.lte) return false;
            const l = db.ledger.get(e.id);
            const ledgerOk = where.OR.some(({ reviewRequestEmail: { is } }) =>
              is === null
                ? !l
                : ledgerMatches(l, { enrollmentId: e.id, status: is.status, attempts: is.attempts, updatedAt: is.updatedAt })
            );
            if (!ledgerOk) return false;
            if (after) {
              const t = e.completedAt.getTime();
              const gt = after[0].completedAt.gt.getTime();
              if (!(t > gt || (t === after[1].completedAt.getTime() && e.id > after[1].id.gt))) return false;
            }
            return true;
          })
          .sort((a, b) => a.completedAt!.getTime() - b.completedAt!.getTime() || a.id.localeCompare(b.id))
          .slice(0, take)
          // Snapshot at read time, like a real query result.
          .map((e) => {
            const l = db.ledger.get(e.id);
            return {
              ...e,
              reviewRequestEmail: l
                ? { status: l.status, attempts: l.attempts, claimToken: l.claimToken, sendAttemptedAt: l.sendAttemptedAt, updatedAt: l.updatedAt }
                : null,
            };
          });
      },
    },
    lmsReviewRequestEmail: {
      create: async ({ data }: { data: { enrollmentId: string; status: string; claimToken?: string; failureReason?: string } }) => {
        if (db.ledger.has(data.enrollmentId)) throw Object.assign(new Error('Unique constraint failed'), { code: 'P2002' });
        db.ledger.set(data.enrollmentId, {
          status: data.status,
          attempts: 0,
          claimToken: data.claimToken ?? null,
          sendAttemptedAt: null,
          updatedAt: db.clock,
          failureReason: data.failureReason ?? null,
          providerMessageId: null,
          sentAt: null,
        });
        return {};
      },
      updateMany: async ({ where, data }: { where: LedgerWhere; data: Partial<Ledger> & { attempts?: { increment: number } } }) => {
        const l = db.ledger.get(where.enrollmentId);
        if (!ledgerMatches(l, where)) return { count: 0 };
        const { attempts, ...rest } = data;
        Object.assign(l, rest, { updatedAt: db.clock });
        if (attempts) l.attempts += attempts.increment;
        return { count: 1 };
      },
    },
    lmsUser: {
      findUnique: async ({ where }: { where: { id: string } }) => {
        if (db.failUserReadOnce) {
          db.failUserReadOnce = false;
          throw new Error('connection reset');
        }
        return db.users.get(where.id) ?? null;
      },
    },
    lmsCourseReview: {
      findUnique: async ({ where }: { where: { courseId_studentId: { courseId: string; studentId: string } } }) =>
        db.reviews.has(`${where.courseId_studentId.courseId}:${where.courseId_studentId.studentId}`) ? { id: 'r' } : null,
    },
  },
}));

const {
  isDefiniteNonDelivery,
  parseStrictSince,
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
  db.failUserReadOnce = false;
  unsub.setOptOut.mockClear();
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

  it.each([
    '2026-02-31', // JavaScript would roll this to 3 March
    '2026-02-29', // 2026 is not a leap year
    '2026-04-31',
    '2026-13-01',
    '2026-00-10',
    '2026-09-00',
    '2026-09-01T24:00Z',
    '2026-09-01T10:60Z',
    '2026-09-01T10:00:61Z',
    '2026-09-01T10:00+15:00',
    '2026-9-1',
  ])('an impossible SINCE date (%s) never enables sending', async (since) => {
    addCompleter('e1', 5 * D);
    expect(readReviewRequestConfig({ REVIEW_REQUEST_EMAILS_ENABLED: 'true', REVIEW_REQUEST_EMAILS_SINCE: since })).toEqual({
      enabled: false,
      reason: 'since_invalid',
    });
    expect((await run({ REVIEW_REQUEST_EMAILS_ENABLED: 'true', REVIEW_REQUEST_EMAILS_SINCE: since })).sent).toBe(0);
    expect(mail.send).not.toHaveBeenCalled();
  });

  it.each([
    ['2028-02-29', '2028-02-29T00:00:00.000Z'],
    ['2026-09-01T10:30Z', '2026-09-01T10:30:00.000Z'],
    ['2026-09-01T10:30:15.5+10:00', '2026-09-01T00:30:15.500Z'],
  ])('a real SINCE date (%s) parses exactly', (since, iso) => {
    expect(parseStrictSince(since)?.toISOString()).toBe(iso);
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

  it('an onboarding programme flagged only by its meta brand is not asked either', async () => {
    const { ONBOARDING_BRAND } = await import('@/lib/onboarding/enterprise');
    addCompleter('e1', 5 * D, {
      course: { slug: 'acme-induction', title: 'Acme induction', category: 'Cleaning', meta: { brand: ONBOARDING_BRAND } } as Enrolment['course'],
    });
    const res = await run();
    expect(res.sent).toBe(0);
    expect(res.skipped.onboarding_course).toBe(1);
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
    // A sent row is terminal: the query no longer returns it at all.
    expect(again.candidates).toBe(0);
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
  it('a 4xx rejection (definite non-delivery) → failed and the run is not ok; the next run retries and sends', async () => {
    addCompleter('e1', 5 * D);
    mail.send.mockResolvedValueOnce({ sent: false, reason: 'provider_error', httpStatus: 422 });
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

  it('a thrown send is ambiguous: counted as a failure, never resent', async () => {
    addCompleter('e1', 5 * D);
    mail.send.mockRejectedValueOnce(new Error('network'));
    const first = await run();
    expect(first).toMatchObject({ ok: false, failed: 1, ambiguous: 1 });
    expect(db.ledger.get('e1')?.status).toBe('ambiguous');
    await run();
    expect(mail.send).toHaveBeenCalledTimes(1);
  });

  it('send_failed (network error or timeout: Mailtrap may have accepted it) is never retried', async () => {
    addCompleter('e1', 5 * D);
    mail.send.mockResolvedValueOnce({ sent: false, reason: 'send_failed' });
    expect(await run()).toMatchObject({ failed: 1, ambiguous: 1 });
    expect(db.ledger.get('e1')).toMatchObject({ status: 'ambiguous', failureReason: 'send_failed' });
    expect((await run()).candidates).toBe(0);
    expect(mail.send).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['HTTP 500', { sent: false, reason: 'provider_error', httpStatus: 500 }],
    ['HTTP 503', { sent: false, reason: 'provider_error', httpStatus: 503 }],
    ['provider error with no status', { sent: false, reason: 'provider_error' }],
    ['2xx reply that still reported failure', { sent: false, reason: 'provider_error', httpStatus: 200 }],
    ['dev console after a 5xx', { sent: true, reason: 'dev_console', httpStatus: 502 }],
  ])('%s is ambiguous (Mailtrap may have delivered it): never resent on a later run', async (_label, outcome) => {
    addCompleter('e1', 5 * D);
    mail.send.mockResolvedValueOnce(outcome);
    expect(await run()).toMatchObject({ ok: false, failed: 1, ambiguous: 1 });
    expect(db.ledger.get('e1')?.status).toBe('ambiguous');
    const second = await run();
    expect(second.candidates).toBe(0);
    expect(mail.send).toHaveBeenCalledTimes(1);
  });

  it('classifies only 4xx, not-configured and plain dev-console as definite non-delivery', () => {
    expect(isDefiniteNonDelivery({ sent: false, reason: 'provider_error', httpStatus: 400 })).toBe(true);
    expect(isDefiniteNonDelivery({ sent: false, reason: 'provider_error', httpStatus: 429 })).toBe(true);
    expect(isDefiniteNonDelivery({ sent: false, reason: 'provider_error', httpStatus: 499 })).toBe(true);
    expect(isDefiniteNonDelivery({ sent: false, reason: 'provider_error', httpStatus: 500 })).toBe(false);
    expect(isDefiniteNonDelivery({ sent: false, reason: 'not_configured' })).toBe(true);
    expect(isDefiniteNonDelivery({ sent: true, reason: 'dev_console' })).toBe(true);
    expect(isDefiniteNonDelivery({ sent: false, reason: 'send_failed' })).toBe(false);
  });

  it('stops after 3 attempts', async () => {
    addCompleter('e1', 5 * D);
    mail.send.mockResolvedValue({ sent: false, reason: 'provider_error', httpStatus: 422 });
    for (let i = 0; i < 3; i++) await run();
    const fourth = await run();
    expect(fourth.candidates).toBe(0);
    expect(mail.send).toHaveBeenCalledTimes(3);
    expect(db.ledger.get('e1')).toMatchObject({ status: 'failed', attempts: 3 });
  });
});

describe('interrupted claims are recovered safely (independent review findings 2-3)', () => {
  function seedPending(id: string, opts: { minutesAgo: number; sendAttempted: boolean }) {
    db.ledger.set(id, {
      status: 'pending',
      attempts: 0,
      claimToken: 'old-run',
      sendAttemptedAt: opts.sendAttempted ? new Date(NOW.getTime() - opts.minutesAgo * 60_000) : null,
      updatedAt: new Date(NOW.getTime() - opts.minutesAgo * 60_000),
      failureReason: null,
      providerMessageId: null,
      sentAt: null,
    });
  }

  it('a claim abandoned before any send attempt is recovered after the lease and sent once', async () => {
    addCompleter('e1', 5 * D);
    seedPending('e1', { minutesAgo: 120, sendAttempted: false });
    const res = await run();
    expect(res.sent).toBe(1);
    expect(db.ledger.get('e1')).toMatchObject({ status: 'sent', claimToken: null });
  });

  it('a fresh claim (another run is still working) is left alone', async () => {
    addCompleter('e1', 5 * D);
    seedPending('e1', { minutesAgo: 5, sendAttempted: false });
    expect((await run()).sent).toBe(0);
    expect(mail.send).not.toHaveBeenCalled();
    expect(db.ledger.get('e1')?.claimToken).toBe('old-run');
  });

  it('a claim interrupted AFTER the send attempt becomes ambiguous and is never resent', async () => {
    addCompleter('e1', 5 * D);
    seedPending('e1', { minutesAgo: 120, sendAttempted: true });
    const res = await run();
    expect(res).toMatchObject({ sent: 0, ambiguous: 1, ok: false });
    expect(db.ledger.get('e1')).toMatchObject({ status: 'ambiguous', failureReason: 'interrupted_after_send_attempt' });
    await run();
    expect(mail.send).not.toHaveBeenCalled();
  });

  it('a read error after claiming releases the slot (no attempt used) and the next run sends', async () => {
    addCompleter('e1', 5 * D);
    db.failUserReadOnce = true;
    const first = await run();
    expect(first).toMatchObject({ ok: false, failed: 1, sent: 0 });
    expect(db.ledger.get('e1')).toMatchObject({ status: 'failed', attempts: 0, failureReason: 'pre_send_error', claimToken: null });
    expect((await run()).sent).toBe(1);
  });

  it('the send attempt is marked before the provider is called', async () => {
    addCompleter('e1', 5 * D);
    mail.send.mockImplementationOnce(async () => {
      expect(db.ledger.get('e1')?.sendAttemptedAt).toEqual(NOW);
      return { sent: true, messageId: 'm-2' };
    });
    expect((await run()).sent).toBe(1);
  });
});

describe('handled rows never crowd out later learners (independent review finding 4)', () => {
  it('600 already-sent older completions do not hide one newer eligible completion', async () => {
    for (let i = 0; i < 600; i++) {
      const id = `old${String(i).padStart(3, '0')}`;
      addCompleter(id, 13 * D - i * 1000);
      db.ledger.set(id, {
        status: 'sent', attempts: 1, claimToken: null, sendAttemptedAt: null, updatedAt: NOW,
        failureReason: null, providerMessageId: 'x', sentAt: NOW,
      });
    }
    addCompleter('new1', 4 * D);
    const res = await run();
    expect(res.sent).toBe(1);
    expect(db.ledger.get('new1')?.status).toBe('sent');
  });

  it('pages past more than one page of same-learner deferrals to reach other learners', async () => {
    for (let i = 0; i < 250; i++) addCompleter(`sam${String(i).padStart(3, '0')}`, 10 * D - i * 1000, { studentId: 'sam' });
    addCompleter('jo1', 4 * D, { studentId: 'jo' });
    const res = await run();
    expect(res.sent).toBe(2); // one for sam, one for jo
    expect(db.ledger.get('jo1')?.status).toBe('sent');
  });

  it('onboarding enrolments are recorded as skipped so they leave the queue', async () => {
    addCompleter('ob1', 5 * D, { course: { slug: 'floor-care-onboarding-operational-readiness', title: 'Onboarding', category: null } });
    await run();
    expect(db.ledger.get('ob1')).toMatchObject({ status: 'skipped', failureReason: 'onboarding_course' });
  });
});

describe('one-click unsubscribe really unsubscribes (independent review finding 1)', () => {
  it('the List-Unsubscribe URL accepts an RFC 8058 one-click POST and opts the learner out', async () => {
    addCompleter('e1', 5 * D);
    await run();
    const header: string = mail.send.mock.calls[0]![0].headers['List-Unsubscribe'];
    const url = header.slice(1, -1);
    const { POST } = await import('../../../app/api/unsubscribe/route');
    const { NextRequest } = await import('next/server');
    const prev = process.env.DATABASE_URL;
    process.env.DATABASE_URL = 'postgres://test';
    try {
      const res = await POST(
        new NextRequest(url, {
          method: 'POST',
          headers: { 'content-type': 'application/x-www-form-urlencoded' },
          body: 'List-Unsubscribe=One-Click',
        })
      );
      expect(res.status).toBe(200);
    } finally {
      if (prev === undefined) delete process.env.DATABASE_URL;
      else process.env.DATABASE_URL = prev;
    }
    expect(unsub.setOptOut).toHaveBeenCalledWith('student-e1', true);
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
    // The header points at the POST handler mail clients call; the footer at the browser page.
    expect(params.headers).toEqual({
      'List-Unsubscribe': '<https://carsi.com.au/api/unsubscribe?token=tok-student-e1>',
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

  it('dry run counts only real recipients, without writing or sending', async () => {
    addCompleter('e1', 5 * D);
    addCompleter('e2', 6 * D);
    addCompleter('e3', 6 * D); // opted out
    db.users.get('student-e3')!.emailOptOut = true;
    addCompleter('e4', 6 * D); // already reviewed
    db.reviews.add('course-e4:student-e4');
    const res = await run(ON, { dryRun: true });
    expect(res.would_send).toBe(2);
    expect(res.skipped).toMatchObject({ opted_out: 1, already_reviewed: 1 });
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
    // An empty DATABASE_URL in `env` means "no database configured".
    if (env.DATABASE_URL === '') delete process.env.DATABASE_URL;
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

  it('flag on but no database → 503, never a silent success', async () => {
    const r = await callRoute({ DATABASE_URL: '', REVIEW_REQUEST_EMAILS_ENABLED: 'true', REVIEW_REQUEST_EMAILS_SINCE: '2026-09-01' });
    expect(r.status).toBe(503);
    expect(r.body).toMatchObject({ ok: false, reason: 'no_database' });
  });

  it('flag off and no database → 200 with reason "disabled"', async () => {
    const r = await callRoute({ DATABASE_URL: '' });
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ ok: true, reason: 'disabled' });
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
