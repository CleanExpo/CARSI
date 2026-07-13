import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * AC#15(i)/(5) + §12/§10 (LOCKED) — async provisioning honours the P0-A guard AND
 * the confirm-before-attach security rule: an EXISTING established account is
 * NEVER silently attached/enrolled/CEC-credited from a door-typed sign-in. On
 * `exists` the row is quarantined (`needs_confirm`), NO studentId/enrollmentId is
 * linked, NO IICRC# is written, NO enrolment runs, NO welcome email is sent. A
 * brand-new (`created`) account is provisioned normally with NO password ever
 * surfaced and access delivered only via the fire-and-forget welcome email.
 */
const state = vi.hoisted(() => ({
  signIn: null as Record<string, unknown> | null,
  existingUserId: 'existing-user-1',
  guestOutcome: { status: 'exists' } as { status: string; claims?: { sub: string } },
}));

const findOrCreateGuestUser = vi.hoisted(() => vi.fn());
const enrollStudentInCourse = vi.hoisted(() => vi.fn());
const sendEnrollmentWelcomeEmail = vi.hoisted(() => vi.fn(async () => {}));
const sessionClaimsForUserId = vi.hoisted(() => vi.fn(async (id: string) => ({ sub: id, email: 'e@x.com', role: 'student' })));

vi.mock('@/lib/server/guest-checkout', () => ({ findOrCreateGuestUser }));
vi.mock('@/lib/server/enrollment-service', () => ({ enrollStudentInCourse }));
vi.mock('@/lib/server/enrollment-email', () => ({ sendEnrollmentWelcomeEmail }));
vi.mock('@/lib/server/lms-auth', () => ({ sessionClaimsForUserId }));
vi.mock('@/lib/server/app-url', () => ({ getAppOrigin: () => 'https://carsi.test' }));
vi.mock('@/lib/server/iicrc-cec-submission', () => ({ processIicrcCecSubmissionForEnrollment: vi.fn(async () => {}) }));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    ccwRoadshowSignIn: {
      updateMany: vi.fn(async (args: { where: { provisionStatus?: string }; data: Record<string, unknown> }) => {
        if (state.signIn && (!args.where.provisionStatus || state.signIn.provisionStatus === args.where.provisionStatus)) {
          Object.assign(state.signIn, args.data);
          return { count: 1 };
        }
        return { count: 0 };
      }),
      findUnique: vi.fn(async () => state.signIn),
      update: vi.fn(async (args: { data: Record<string, unknown> }) => {
        Object.assign(state.signIn as object, args.data);
        return state.signIn;
      }),
    },
    lmsUser: {
      findUnique: vi.fn(async () => ({ id: state.existingUserId })),
      updateMany: vi.fn(async () => ({ count: 1 })),
    },
    lmsCourse: { findUnique: vi.fn(async () => ({ id: 'course-1' })) },
    lmsEnrollment: { findUnique: vi.fn(async () => ({ id: 'enr-existing' })) },
  },
}));

const { provisionSignIn } = await import('./provision');

beforeEach(() => {
  vi.clearAllMocks();
  state.signIn = {
    id: 'signin-1',
    email: 'existing@x.com',
    fullName: 'Ann Jones',
    iicrcRegNumber: null,
    provisionStatus: 'pending',
    studentId: null,
    enrollmentId: null,
  };
  findOrCreateGuestUser.mockResolvedValue(state.guestOutcome);
  enrollStudentInCourse.mockResolvedValue({ enrollmentId: 'enr-1', courseId: 'course-1' });
});

describe('provisionSignIn — P0-A guard on an existing account', () => {
  it('QUARANTINES an existing established account: no attach, no enrol, no email (§12/§10)', async () => {
    state.signIn = { ...(state.signIn as object), iicrcRegNumber: 'IICRC-VICTIM-1' } as Record<string, unknown>;
    findOrCreateGuestUser.mockResolvedValue({ status: 'exists' });

    const result = await provisionSignIn('signin-1');

    // Halted + quarantined — NOT provisioned. A stranger typing a victim's email
    // cannot bind/enrol/CEC-credit the victim's account.
    expect(result.status).toBe('needs_confirmation');
    expect(result.accountOutcome).toBe('exists');
    expect(result.studentId).toBeUndefined();
    expect(result.enrollmentId).toBeUndefined();

    // P0-A: findOrCreateGuestUser was called WITHOUT any password / claim-allow field.
    const callArg = findOrCreateGuestUser.mock.calls[0][0] as Record<string, unknown>;
    expect(Object.keys(callArg).sort()).toEqual(['email', 'fullName']);
    expect(callArg).not.toHaveProperty('password');

    // NO enrolment, NO IICRC# write onto the victim, NO welcome email.
    expect(enrollStudentInCourse).not.toHaveBeenCalled();
    expect(sendEnrollmentWelcomeEmail).not.toHaveBeenCalled();

    // The sign-in is NOT linked and is quarantined for owner-confirmation.
    expect(state.signIn?.studentId).toBeNull();
    expect(state.signIn?.enrollmentId).toBeNull();
    expect(state.signIn?.provisionStatus).toBe('needs_confirm');
  });

  it('a brand-new account uses the outcome claims (random password never surfaced)', async () => {
    findOrCreateGuestUser.mockResolvedValue({ status: 'created', claims: { sub: 'new-user-9' } });

    const result = await provisionSignIn('signin-1');
    expect(result.status).toBe('provisioned');
    expect(result.accountOutcome).toBe('created');
    expect(result.studentId).toBe('new-user-9');
    // The result object never carries a password field.
    expect(JSON.stringify(result)).not.toMatch(/password/i);
  });

  it('is self-guarding: a row not in `pending` is skipped (no double provision)', async () => {
    state.signIn = { ...(state.signIn as object), provisionStatus: 'provisioned' } as Record<string, unknown>;
    const result = await provisionSignIn('signin-1');
    expect(result.status).toBe('skipped');
    expect(findOrCreateGuestUser).not.toHaveBeenCalled();
  });
});
