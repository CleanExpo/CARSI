import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * AC#15 (6)/(7)/(d)/(e) — both-days → enrolment completed → EXISTING CEC pipeline
 * fed, idempotent (no double CEC); no IICRC# → completed for the cert but NO CEC;
 * cecHours:0 → CEC correctly refused; a revoked enrolment is never resurrected.
 */
const state = vi.hoisted(() => ({
  signIn: null as Record<string, unknown> | null,
  enrollment: null as { id: string; status: string; completedAt: Date | null; course: { cecHours: number | null } } | null,
  cecSent: false,
  cecSendCount: 0,
}));

const processIicrcCecSubmissionForEnrollment = vi.hoisted(() =>
  vi.fn(async () => {
    // Simulate the real pipeline's idempotency guard (guards on status 'sent').
    if (!state.cecSent) {
      state.cecSent = true;
      state.cecSendCount += 1;
    }
  }),
);

vi.mock('@/lib/server/iicrc-cec-submission', () => ({ processIicrcCecSubmissionForEnrollment }));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    ccwRoadshowSignIn: { findUnique: vi.fn(async () => state.signIn) },
    lmsEnrollment: {
      findUnique: vi.fn(async () => state.enrollment),
      updateMany: vi.fn(async (args: { where: { status?: string }; data: { status: string; completedAt: Date } }) => {
        if (state.enrollment && (!args.where.status || state.enrollment.status === args.where.status)) {
          state.enrollment.status = args.data.status;
          state.enrollment.completedAt = args.data.completedAt;
          return { count: 1 };
        }
        return { count: 0 };
      }),
    },
  },
}));

const { finalizeCecForSignIn } = await import('./cec');

function seed(opts: { iicrc: string | null; cecHours: number | null; both?: boolean; status?: string }): void {
  const day = new Date('2026-07-22T09:00:00Z');
  state.signIn = {
    id: 'signin-1',
    day1CheckedInAt: day,
    day2CheckedInAt: opts.both === false ? null : day,
    iicrcRegNumber: opts.iicrc,
    studentId: 'stu-1',
    enrollmentId: 'enr-1',
    provisionStatus: 'provisioned',
  };
  state.enrollment = { id: 'enr-1', status: opts.status ?? 'active', completedAt: null, course: { cecHours: opts.cecHours } };
  state.cecSent = false;
  state.cecSendCount = 0;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('finalizeCecForSignIn', () => {
  it('both days + IICRC# + cecHours>0 → completes and feeds the CEC pipeline (AC 6)', async () => {
    seed({ iicrc: 'IICRC-1', cecHours: 4 });
    const r = await finalizeCecForSignIn('signin-1');
    expect(r.status).toBe('cec_queued');
    expect(r.cecEligible).toBe(true);
    expect(state.enrollment?.status).toBe('completed');
    expect(processIicrcCecSubmissionForEnrollment).toHaveBeenCalledTimes(1);
  });

  it('is idempotent — a re-run submits NO second CEC (AC d)', async () => {
    seed({ iicrc: 'IICRC-1', cecHours: 4 });
    await finalizeCecForSignIn('signin-1');
    await finalizeCecForSignIn('signin-1'); // re-tap
    // enrolment completed exactly once; pipeline dedupes the actual send.
    expect(state.cecSendCount).toBe(1);
  });

  it('no IICRC# → completed for the certificate, but NO CEC (AC e/6)', async () => {
    seed({ iicrc: null, cecHours: 4 });
    const r = await finalizeCecForSignIn('signin-1');
    expect(r.status).toBe('completed_no_cec');
    expect(state.enrollment?.status).toBe('completed'); // cert of attendance still issued
    expect(processIicrcCecSubmissionForEnrollment).not.toHaveBeenCalled();
  });

  it('cecHours:0 (not CEC-approved) → CEC refused even with IICRC# (AC 7)', async () => {
    seed({ iicrc: 'IICRC-1', cecHours: 0 });
    const r = await finalizeCecForSignIn('signin-1');
    expect(r.status).toBe('completed_no_cec');
    expect(processIicrcCecSubmissionForEnrollment).not.toHaveBeenCalled();
  });

  it('only one day → not_ready', async () => {
    seed({ iicrc: 'IICRC-1', cecHours: 4, both: false });
    const r = await finalizeCecForSignIn('signin-1');
    expect(r.status).toBe('not_ready');
  });

  it('a revoked enrolment is never resurrected to completed', async () => {
    seed({ iicrc: 'IICRC-1', cecHours: 4, status: 'revoked' });
    const r = await finalizeCecForSignIn('signin-1');
    expect(r.status).toBe('skipped_revoked');
    expect(state.enrollment?.status).toBe('revoked');
    expect(processIicrcCecSubmissionForEnrollment).not.toHaveBeenCalled();
  });
});
