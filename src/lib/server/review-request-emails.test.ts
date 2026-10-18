/**
 * AC-4 (spec 2026-10-18 D9-D11, D17; header amendment 6): the review-request email is off by
 * default, goes only to enrolments the database marked eligible AT COMPLETION while the switch was
 * on, is sent at most once per enrolment, is retried only after a definite non-delivery, never goes
 * to opted-out learners, is bounded to 3-14 day old completions with a per-run cap, and carries
 * unsubscribe headers. The completion-time trigger itself is proven against real PostgreSQL in
 * review-audit-retention.test.ts; here `addCompleter` stands in for it.
 *
 * The ledger fake models the conditional claims exactly (a claim is an updateMany that one run
 * wins), because a mocked update that always succeeds cannot prove "no second email".
 */
import { beforeEach, describe, expect, expectTypeOf, it, vi } from 'vitest';

type Enrolment = {
  id: string;
  studentId: string;
  courseId: string;
  status: string;
  completedAt: Date | null;
  course: { slug: string; title: string; category: string | null; meta?: unknown };
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
  /** lms_review_request_settings row; null = row missing. */
  settings: { enabled: true } as { enabled: boolean } | null,
  clock: new Date('2026-10-18T00:00:00.000Z'),
  failUserReadOnce: false,
  /** When set, the first `parties` candidate queries wait for each other, so concurrent runs hold the same snapshot. */
  barrier: null as null | { parties: number; arrived: number; release: () => void; ready: Promise<void> },
  /** When set, the SECOND candidate query (its snapshot already taken) waits for this before returning. */
  holdSecondQuery: null as null | { calls: number; until: Promise<void> },
  /** SQL of every raw query (the locked switch reads). */
  rawSql: [] as string[],
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
  OR: Array<{ reviewRequestEmail: { is: { status: string; attempts?: { lt: number }; updatedAt?: { lt: Date } } } }>;
  AND?: Array<{ OR: [{ completedAt: { gt: Date } }, { completedAt: Date; id: { gt: string } }] }>;
};

vi.mock('@/lib/prisma', () => ({
  prisma: {
    lmsReviewRequestSettings: {
      findUnique: async () => (db.settings ? { enabled: db.settings.enabled } : null),
    },
    // The locked switch read: SELECT "enabled" ... FOR SHARE (the fake records the SQL).
    $queryRaw: async (strings: TemplateStringsArray) => {
      db.rawSql.push(strings.join('?'));
      return db.settings ? [{ enabled: db.settings.enabled }] : [];
    },
    // Interactive transaction: the callback gets the same client (method call binds `this`).
    $transaction: async function (this: unknown, fn: (tx: unknown) => unknown) {
      return fn(this);
    },
    lmsEnrollment: {
      findMany: async ({ where, take }: { where: FindWhere; take: number }) => {
        const after = where.AND?.[0]?.OR;
        // Build the whole result first: a real query returns a snapshot taken when it ran.
        const rows = db.enrolments
          .filter((e) => {
            if (e.status !== where.status || e.completedAt === null) return false;
            if (e.completedAt < where.completedAt.gte || e.completedAt > where.completedAt.lte) return false;
            const l = db.ledger.get(e.id);
            if (!where.OR.some(({ reviewRequestEmail: { is } }) => ledgerMatches(l, { enrollmentId: e.id, ...is }))) return false;
            if (after) {
              const t = e.completedAt.getTime();
              if (!(t > after[0].completedAt.gt.getTime() || (t === after[1].completedAt.getTime() && e.id > after[1].id.gt))) return false;
            }
            return true;
          })
          .sort((a, b) => a.completedAt!.getTime() - b.completedAt!.getTime() || a.id.localeCompare(b.id))
          .slice(0, take)
          .map((e) => {
            const l = db.ledger.get(e.id);
            return {
              ...e,
              reviewRequestEmail: l
                ? { status: l.status, attempts: l.attempts, claimToken: l.claimToken, sendAttemptedAt: l.sendAttemptedAt, updatedAt: l.updatedAt }
                : null,
            };
          });
        const hold = db.holdSecondQuery;
        if (hold) {
          hold.calls += 1;
          if (hold.calls === 2) await hold.until;
        }
        const b = db.barrier;
        if (b && b.arrived < b.parties) {
          b.arrived += 1;
          if (b.arrived === b.parties) b.release();
          await b.ready;
        }
        return rows;
      },
    },
    lmsReviewRequestEmail: {
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
  renderReviewRequestEmail,
  REVIEW_REQUEST_MAX_SENDS_PER_RUN,
  reviewRequestWindow,
  runReviewRequestEmails,
  wasReallySent,
} = await import('./review-request-email');

const NOW = new Date('2026-10-18T00:00:00.000Z');
const H = 3_600_000;
const D = 24 * H;

function eligibleRow(): Ledger {
  return { status: 'eligible', attempts: 0, claimToken: null, sendAttemptedAt: null, updatedAt: NOW, failureReason: null, providerMessageId: null, sentAt: null };
}

/**
 * A completion `completedAgoMs` before NOW. By default the switch was on at completion, so the
 * database marked it eligible (what the trigger does); `markedEligible: false` = switched off then.
 */
function addCompleter(
  id: string,
  completedAgoMs: number,
  opts: Partial<Enrolment> & { studentId?: string; markedEligible?: boolean } = {}
) {
  const studentId = opts.studentId ?? `student-${id}`;
  db.enrolments.push({
    id,
    studentId,
    courseId: opts.courseId ?? `course-${id}`,
    status: opts.status ?? 'completed',
    completedAt: new Date(NOW.getTime() - completedAgoMs),
    course: opts.course ?? { slug: 'water-damage', title: 'Water Damage Restoration', category: 'restoration' },
  });
  if (opts.markedEligible !== false) db.ledger.set(id, eligibleRow());
  if (!db.users.has(studentId)) {
    db.users.set(studentId, { email: `${studentId}@example.com`, fullName: 'Sam Rivers', emailOptOut: false, isActive: true });
  }
}
const run = (extra: { dryRun?: boolean; now?: Date } = {}) => runReviewRequestEmails({ now: extra.now ?? NOW, dryRun: extra.dryRun });

beforeEach(() => {
  db.enrolments.length = 0;
  db.users.clear();
  db.reviews.clear();
  db.ledger.clear();
  db.settings = { enabled: true };
  db.failUserReadOnce = false;
  db.barrier = null;
  db.holdSecondQuery = null;
  db.rawSql = [];
  unsub.setOptOut.mockClear();
  mail.send.mockReset().mockResolvedValue({ sent: true, messageId: 'm-1' });
  mail.configured.mockReset().mockReturnValue(true);
});

describe('off by default; one switch (D10d)', () => {
  it('switch off → disabled, nothing sent and nothing claimed, even for rows marked eligible earlier', async () => {
    db.settings = { enabled: false };
    addCompleter('e1', 5 * D);
    const res = await run();
    expect(res).toMatchObject({ ok: true, reason: 'disabled', sent: 0 });
    expect(mail.send).not.toHaveBeenCalled();
    expect(db.ledger.get('e1')?.status).toBe('eligible');
  });

  it('a missing settings row fails closed and loudly (never treated as on)', async () => {
    db.settings = null;
    addCompleter('e1', 5 * D);
    expect(await run()).toMatchObject({ ok: false, reason: 'settings_missing', sent: 0 });
    expect(mail.send).not.toHaveBeenCalled();
  });

  it('switch on but email not configured → not ok (the scheduler goes red)', async () => {
    mail.configured.mockReturnValue(false);
    expect(await run()).toMatchObject({ ok: false, reason: 'email_not_configured' });
  });
});

describe('eligibility is decided at completion: off periods can never be backfilled (r4)', () => {
  it('a completion recorded while the switch was off has no eligible row and is never emailed, whatever happens later', async () => {
    addCompleter('while-off', 5 * D, { markedEligible: false });
    // Switch on now, run every day for a fortnight: nothing.
    for (let d = 0; d < 14; d++) await run({ now: new Date(NOW.getTime() + d * D) });
    expect(mail.send).not.toHaveBeenCalled();
  });

  it('r4 reviewer scenario (unobserved off -> on, no cron run while off): only the completion made while on is emailed', async () => {
    addCompleter('while-on', 5 * D); // marked eligible at completion
    addCompleter('while-off', 4 * D, { markedEligible: false }); // switched off 1 h, completed, back on 10 h later
    for (let d = 0; d < 6; d++) await run({ now: new Date(NOW.getTime() + d * D) });
    expect(mail.send.mock.calls.map((c) => c[0].to)).toEqual(['student-while-on@example.com']);
    expect(db.ledger.has('while-off')).toBe(false);
  });
});

describe('window: 3 to 14 days after completion (D10)', () => {
  it.each([
    ['71h59m old', 71 * H + 59 * 60_000, false],
    ['exactly 72h old', 72 * H, true],
    ['14 days old', 14 * D, true],
    ['14 days and a minute old', 14 * D + 60_000, false],
    ['30 days old', 30 * D, false],
  ])('%s → emailed: %s', async (_label, age, expected) => {
    addCompleter('e1', age as number);
    expect((await run()).sent).toBe(expected ? 1 : 0);
  });

  it('the window is exactly 14 to 3 days before the run', () => {
    const w = reviewRequestWindow(NOW);
    expect(w.from.toISOString()).toBe('2026-10-04T00:00:00.000Z');
    expect(w.to.toISOString()).toBe('2026-10-15T00:00:00.000Z');
  });

  it('a non-completed or revoked enrolment is never emailed', async () => {
    addCompleter('e1', 5 * D, { status: 'active' });
    addCompleter('e2', 5 * D, { status: 'revoked' });
    expect((await run()).sent).toBe(0);
  });

  it('an onboarding programme flagged only by its meta brand is not asked either', async () => {
    const { ONBOARDING_BRAND } = await import('@/lib/onboarding/enterprise');
    addCompleter('e1', 5 * D, { course: { slug: 'acme-induction', title: 'Acme induction', category: 'Cleaning', meta: { brand: ONBOARDING_BRAND } } });
    const res = await run();
    expect(res.sent).toBe(0);
    expect(res.skipped.onboarding_course).toBe(1);
  });

  it('internal onboarding programmes are skipped and recorded, so they leave the queue', async () => {
    addCompleter('ob1', 5 * D, { course: { slug: 'floor-care-onboarding-operational-readiness', title: 'Onboarding', category: null } });
    const res = await run();
    expect(res.sent).toBe(0);
    expect(db.ledger.get('ob1')).toMatchObject({ status: 'skipped', failureReason: 'onboarding_course' });
  });
});

describe('at most once per enrolment (D9)', () => {
  it('a re-run sends no second email', async () => {
    addCompleter('e1', 5 * D);
    expect((await run()).sent).toBe(1);
    const again = await run();
    expect(again).toMatchObject({ sent: 0, candidates: 0 });
    expect(mail.send).toHaveBeenCalledTimes(1);
    expect(db.ledger.get('e1')).toMatchObject({ status: 'sent', attempts: 1, providerMessageId: 'm-1' });
  });

  it('a run that already reached the provider cannot have its row re-claimed by a run with an older snapshot', async () => {
    addCompleter('e1', 5 * D);
    // Run B takes its snapshot ('eligible') before run A claims, but only acts once run A is
    // inside the provider call. A claim that is not conditional on 'eligible' would win here
    // and send a second email; the claim-owner token alone cannot stop that.
    let inSend!: () => void;
    db.holdSecondQuery = { calls: 0, until: new Promise<void>((r) => (inSend = r)) };
    mail.send.mockImplementationOnce(() => {
      inSend();
      return new Promise((resolve) => setTimeout(() => resolve({ sent: true, messageId: 'slow' }), 30));
    });
    const [a, b] = await Promise.all([run(), run()]);
    db.holdSecondQuery = null;
    expect(a.candidates + b.candidates).toBe(2); // both really saw it as eligible
    expect(mail.send).toHaveBeenCalledTimes(1);
    expect(a.sent + b.sent).toBe(1);
  });

  it('two runs holding the SAME eligible snapshot send one email: only one conditional claim can win', async () => {
    addCompleter('e1', 5 * D);
    let release!: () => void;
    const ready = new Promise<void>((r) => (release = r));
    db.barrier = { parties: 2, arrived: 0, release, ready };
    const [a, b] = await Promise.all([run(), run()]);
    db.barrier = null;
    expect(a.candidates).toBe(1);
    expect(b.candidates).toBe(1); // both really saw it as eligible
    expect(a.sent + b.sent).toBe(1);
    expect((a.skipped.claimed_elsewhere ?? 0) + (b.skipped.claimed_elsewhere ?? 0)).toBe(1);
    expect(mail.send).toHaveBeenCalledTimes(1);
  });

  it('two overlapping runs send one email: only one run can win the claim', async () => {
    addCompleter('e1', 5 * D);
    const [a, b] = await Promise.all([run(), run()]);
    expect(a.sent + b.sent).toBe(1);
    expect((a.skipped.claimed_elsewhere ?? 0) + (b.skipped.claimed_elsewhere ?? 0)).toBe(1);
    expect(mail.send).toHaveBeenCalledTimes(1);
  });
});

describe('switching OFF stops a run that is already going (release-gate r5)', () => {
  it('an OFF committed between two sends stops the second send; its row goes back to eligible', async () => {
    addCompleter('first', 6 * D);
    addCompleter('second', 5 * D);
    // The admin switches off while the first email is with the provider.
    mail.send.mockImplementationOnce(async () => {
      db.settings = { enabled: false };
      return { sent: true, messageId: 'm-first' };
    });
    const res = await run();
    expect(res).toMatchObject({ sent: 1, stopped_by_switch: true });
    expect(mail.send).toHaveBeenCalledTimes(1);
    expect(db.ledger.get('first')?.status).toBe('sent');
    expect(db.ledger.get('second')).toMatchObject({ status: 'eligible', attempts: 0, claimToken: null, sendAttemptedAt: null });
  });

  it('the switch is re-read under a shared row lock immediately before each individual send', async () => {
    addCompleter('a1', 6 * D);
    addCompleter('a2', 5 * D);
    await run();
    expect(mail.send).toHaveBeenCalledTimes(2);
    const locked = db.rawSql.filter((q) => /FROM "lms_review_request_settings" WHERE "id" = 1 FOR SHARE/.test(q));
    expect(locked).toHaveLength(2);
  });
});

describe('only a definite non-delivery is retried (D9, D9b)', () => {
  it('a 4xx rejection → failed and not ok; the next run retries and sends', async () => {
    addCompleter('e1', 5 * D);
    mail.send.mockResolvedValueOnce({ sent: false, reason: 'provider_error', httpStatus: 422 });
    expect(await run()).toMatchObject({ ok: false, sent: 0, failed: 1, failed_enrollment_ids: ['e1'] });
    expect(db.ledger.get('e1')).toMatchObject({ status: 'failed', attempts: 1, failureReason: 'provider_error' });
    expect(await run()).toMatchObject({ ok: true, sent: 1, failed: 0 });
    expect(db.ledger.get('e1')).toMatchObject({ status: 'sent', attempts: 2 });
  });

  it('dev_console (printed, not sent) counts as a failure', async () => {
    addCompleter('e1', 5 * D);
    mail.send.mockResolvedValueOnce({ sent: true, reason: 'dev_console' });
    expect((await run()).failed).toBe(1);
    expect(db.ledger.get('e1')?.status).toBe('failed');
    expect(wasReallySent({ sent: true, reason: 'dev_console' })).toBe(false);
  });

  it.each([
    ['HTTP 500', { sent: false, reason: 'provider_error', httpStatus: 500 }],
    ['HTTP 503', { sent: false, reason: 'provider_error', httpStatus: 503 }],
    ['provider error with no status', { sent: false, reason: 'provider_error' }],
    ['2xx reply that still reported failure', { sent: false, reason: 'provider_error', httpStatus: 200 }],
    ['dev console after a 5xx', { sent: true, reason: 'dev_console', httpStatus: 502 }],
    ['network error or timeout', { sent: false, reason: 'send_failed' }],
  ])('%s is ambiguous (may have been delivered): never resent', async (_label, outcome) => {
    addCompleter('e1', 5 * D);
    mail.send.mockResolvedValueOnce(outcome);
    expect(await run()).toMatchObject({ ok: false, failed: 1, ambiguous: 1 });
    expect(db.ledger.get('e1')?.status).toBe('ambiguous');
    expect((await run()).candidates).toBe(0);
    expect(mail.send).toHaveBeenCalledTimes(1);
  });

  it('a thrown send is ambiguous', async () => {
    addCompleter('e1', 5 * D);
    mail.send.mockRejectedValueOnce(new Error('network'));
    expect(await run()).toMatchObject({ ok: false, failed: 1, ambiguous: 1 });
    await run();
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
    expect((await run()).candidates).toBe(0);
    expect(mail.send).toHaveBeenCalledTimes(3);
    expect(db.ledger.get('e1')).toMatchObject({ status: 'failed', attempts: 3 });
  });
});

describe('interrupted claims are recovered safely', () => {
  function seedPending(id: string, opts: { minutesAgo: number; sendAttempted: boolean }) {
    db.ledger.set(id, {
      ...eligibleRow(),
      status: 'pending',
      claimToken: 'old-run',
      sendAttemptedAt: opts.sendAttempted ? new Date(NOW.getTime() - opts.minutesAgo * 60_000) : null,
      updatedAt: new Date(NOW.getTime() - opts.minutesAgo * 60_000),
    });
  }

  it('a claim abandoned before any send attempt is recovered after the lease and sent once', async () => {
    addCompleter('e1', 5 * D);
    seedPending('e1', { minutesAgo: 120, sendAttempted: false });
    expect((await run()).sent).toBe(1);
    expect(db.ledger.get('e1')).toMatchObject({ status: 'sent', claimToken: null });
  });

  it('a fresh claim (another run is still working) is left alone', async () => {
    addCompleter('e1', 5 * D);
    seedPending('e1', { minutesAgo: 5, sendAttempted: false });
    expect((await run()).sent).toBe(0);
    expect(db.ledger.get('e1')?.claimToken).toBe('old-run');
  });

  it('a claim interrupted AFTER the send attempt becomes ambiguous and is never resent', async () => {
    addCompleter('e1', 5 * D);
    seedPending('e1', { minutesAgo: 120, sendAttempted: true });
    expect(await run()).toMatchObject({ sent: 0, ambiguous: 1, ok: false });
    expect(db.ledger.get('e1')).toMatchObject({ status: 'ambiguous', failureReason: 'interrupted_after_send_attempt' });
    await run();
    expect(mail.send).not.toHaveBeenCalled();
  });

  it('a read error after claiming releases the slot (no attempt used) and the next run sends', async () => {
    addCompleter('e1', 5 * D);
    db.failUserReadOnce = true;
    expect(await run()).toMatchObject({ ok: false, failed: 1, sent: 0 });
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

describe('handled rows never crowd out later learners', () => {
  it('600 already-sent older completions do not hide one newer eligible completion', async () => {
    for (let i = 0; i < 600; i++) {
      const id = `old${String(i).padStart(3, '0')}`;
      addCompleter(id, 13 * D - i * 1000);
      db.ledger.set(id, { ...eligibleRow(), status: 'sent', attempts: 1, providerMessageId: 'x', sentAt: NOW });
    }
    addCompleter('new1', 4 * D);
    expect((await run()).sent).toBe(1);
    expect(db.ledger.get('new1')?.status).toBe('sent');
  });

  it('pages past more than one page of same-learner deferrals to reach other learners', async () => {
    for (let i = 0; i < 250; i++) addCompleter(`sam${String(i).padStart(3, '0')}`, 10 * D - i * 1000, { studentId: 'sam' });
    addCompleter('jo1', 4 * D, { studentId: 'jo' });
    expect((await run()).sent).toBe(2); // one for sam, one for jo
    expect(db.ledger.get('jo1')?.status).toBe('sent');
  });
});

describe('one-click unsubscribe really unsubscribes', () => {
  async function oneClickPost(url: string, databaseUrl: string | undefined) {
    const { POST } = await import('../../../app/api/unsubscribe/route');
    const { NextRequest } = await import('next/server');
    const prev = process.env.DATABASE_URL;
    if (databaseUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = databaseUrl;
    try {
      const res = await POST(
        new NextRequest(url, {
          method: 'POST',
          headers: { 'content-type': 'application/x-www-form-urlencoded' },
          body: 'List-Unsubscribe=One-Click',
        })
      );
      return { status: res.status, body: await res.json() };
    } finally {
      if (prev === undefined) delete process.env.DATABASE_URL;
      else process.env.DATABASE_URL = prev;
    }
  }

  it('the List-Unsubscribe URL accepts an RFC 8058 one-click POST and opts the learner out', async () => {
    addCompleter('e1', 5 * D);
    await run();
    const header: string = mail.send.mock.calls[0]![0].headers['List-Unsubscribe'];
    const r = await oneClickPost(header.slice(1, -1), 'postgres://test');
    expect(r.status).toBe(200);
    expect(unsub.setOptOut).toHaveBeenCalledWith('student-e1', true);
  });

  it('with no database it fails visibly (503) and never claims the opt-out worked', async () => {
    const r = await oneClickPost('https://carsi.com.au/api/unsubscribe?token=tok-student-e1', undefined);
    expect(r.status).toBe(503);
    expect(r.body).not.toHaveProperty('ok');
    expect(r.body).not.toHaveProperty('email_opt_out');
    expect(unsub.setOptOut).not.toHaveBeenCalled();
  });

  it('confirms only when the stored preference matches the request', async () => {
    unsub.setOptOut.mockResolvedValueOnce({ email_opt_out: false }); // write did not stick
    const r = await oneClickPost('https://carsi.com.au/api/unsubscribe?token=tok-student-e1', 'postgres://test');
    expect(r.status).toBe(500);
    expect(r.body).not.toHaveProperty('ok');
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
    expect((await run()).skipped.already_reviewed).toBe(1);
    expect(mail.send).not.toHaveBeenCalled();
  });

  it('every send carries one-click unsubscribe headers, a visible unsubscribe link and the Bulk Stream', async () => {
    addCompleter('e1', 5 * D);
    await run();
    const params = mail.send.mock.calls[0]![0];
    expect(params.to).toBe('student-e1@example.com');
    expect(params.stream).toBe('bulk');
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
    expect((await run()).sent).toBe(REVIEW_REQUEST_MAX_SENDS_PER_RUN);
    expect(db.ledger.get('e149')?.status).toBe('sent'); // oldest went first
    expect(db.ledger.get('e000')?.status).toBe('eligible');
    expect((await run()).sent).toBe(REVIEW_REQUEST_MAX_SENDS_PER_RUN);
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
    addCompleter('e3', 6 * D);
    db.users.get('student-e3')!.emailOptOut = true;
    addCompleter('e4', 6 * D);
    db.reviews.add('course-e4:student-e4');
    const before = JSON.stringify([...db.ledger]);
    const res = await run({ dryRun: true });
    expect(res.would_send).toBe(2);
    expect(res.skipped).toMatchObject({ opted_out: 1, already_reviewed: 1 });
    expect(mail.send).not.toHaveBeenCalled();
    expect(JSON.stringify([...db.ledger])).toBe(before);
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

  it('a non-restoration course (truckmount) gets an email with no IICRC or CEC wording at all', () => {
    const e = renderReviewRequestEmail({
      appOrigin: 'https://carsi.com.au',
      name: 'Sam',
      courseTitle: 'CCW CARSI Truckmount Operations',
      reviewUrl: 'https://carsi.com.au/dashboard/courses/ccw-truckmount#reviews',
      unsubscribeUrl: 'https://carsi.com.au/unsubscribe?token=t',
    });
    expect(e.html).toContain('CCW CARSI Truckmount Operations');
    for (const part of [e.subject, e.html, e.text]) {
      expect(part).not.toMatch(/IICRC|\bCECs?\b|Continuing Education|Accredited/i);
    }
  });
});

describe('cron route makes failures visible to the scheduler (D9, D13)', () => {
  const ENV_KEYS = ['CRON_SECRET', 'DATABASE_URL'] as const;
  async function callRoute(opts: { database?: boolean; query?: string } = {}) {
    const saved = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));
    process.env.CRON_SECRET = 'test-cron-value';
    if (opts.database === false) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = 'postgres://test';
    try {
      const { GET } = await import('../../../app/api/cron/review-requests/route');
      const res = await GET(
        new Request(`https://carsi.com.au/api/cron/review-requests${opts.query ?? ''}`, {
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

  it('switch off → 200 with reason "disabled" (distinct from nobody eligible)', async () => {
    db.settings = { enabled: false };
    addCompleter('e1', 5 * D);
    const r = await callRoute();
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ reason: 'disabled', sent: 0 });
  });

  it('no database → 503, never a silent success (the switch cannot even be read)', async () => {
    const r = await callRoute({ database: false });
    expect(r.status).toBe(503);
    expect(r.body).toMatchObject({ ok: false, reason: 'no_database' });
  });

  it('a failed send → 500, so `curl -fsS` fails the scheduled job', async () => {
    addCompleter('e1', 5 * D);
    mail.send.mockResolvedValueOnce({ sent: false, reason: 'provider_error', httpStatus: 422 });
    const r = await callRoute();
    expect(r.status).toBe(500);
    expect(r.body).toMatchObject({ failed: 1, failed_enrollment_ids: ['e1'] });
    expect(JSON.stringify(r.body)).not.toContain('@example.com');
  });

  it('dry_run=1 → counts only', async () => {
    addCompleter('e1', 5 * D);
    const r = await callRoute({ query: '?dry_run=1' });
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ dry_run: true, would_send: 1, sent: 0 });
    expect(mail.send).not.toHaveBeenCalled();
  });
});
