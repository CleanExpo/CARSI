import type { SessionClaims } from '@/lib/auth/session-jwt';
import { isLmsClaimsAllowedAdminPanel } from '@/lib/admin/admin-panel-access';
import { DEFAULT_COACHING_COACH } from '@/lib/coaching-portal/coach-routing';
import {
  CoachPriceMissingError,
  coachNotifyRecipients,
  coachPriceLabel,
  countActions,
  isMemberOfChapter,
  memberOnboardingStatus,
  nextSessionAt,
  type CoachRecord,
  type MemberOnboardingStatus,
  type NewCoachInput,
  validateNewCoachInput,
} from '@/lib/coaching-portal/coaches';
import { prisma } from '@/lib/prisma';
import { getCarsiCoachingMonthlyNotifyRecipients } from '@/lib/server/carsi-coaching-monthly-notify';

const COACH_SELECT = {
  id: true,
  userId: true,
  displayName: true,
  chapterSlug: true,
  chapterName: true,
  currency: true,
  monthlyPriceCents: true,
  stripePriceId: true,
  notificationEmail: true,
  brandColour: true,
  logoUrl: true,
  isDefault: true,
  isDemo: true,
} as const;

/**
 * True only for "this table or column does not exist yet" (Prisma P2021 / P2022), i.e.
 * the chapters migration has not been applied. Then no partner coach can exist, so the
 * founder routing is correct. Any other error is unknown and must not be guessed past.
 */
export function isChaptersSchemaMissing(error: unknown): boolean {
  const code = (error as { code?: unknown } | null)?.code;
  return code === 'P2021' || code === 'P2022';
}

export async function getDefaultCoach(): Promise<CoachRecord | null> {
  try {
    return await prisma.carsiCoachingCoach.findFirst({
      where: { isDefault: true },
      select: COACH_SELECT,
    });
  } catch (error) {
    if (isChaptersSchemaMissing(error)) return null;
    throw error;
  }
}

/**
 * The member's coach; members with no assigned coach belong to the default coach.
 * Fails closed: an unknown lookup error throws, so a partner member's data and price
 * never fall back to the default chapter.
 */
export async function getCoachForMember(userId: string): Promise<CoachRecord | null> {
  try {
    const profile = await prisma.carsiCoachingBusinessProfile.findUnique({
      where: { userId },
      select: { coach: { select: COACH_SELECT } },
    });
    if (profile?.coach) return profile.coach;
  } catch (error) {
    if (isChaptersSchemaMissing(error)) return null;
    throw error;
  }
  return getDefaultCoach();
}

/** Coach name for member-facing copy: the partner coach, else the default coach's first name. */
export function coachNameForCopy(coach: CoachRecord | null): string {
  return coach && !coach.isDefault
    ? coach.displayName
    : DEFAULT_COACHING_COACH.displayName.split(/\s+/)[0];
}

/** The member's coach as portal copy needs it: name and monthly price (null if unpriced). */
export async function getPortalCoachForMember(
  userId: string
): Promise<{ name: string; priceLabel: string | null }> {
  const coach = await getCoachForMember(userId);
  let priceLabel: string | null;
  try {
    priceLabel = coachPriceLabel(coach);
  } catch (error) {
    if (!(error instanceof CoachPriceMissingError)) throw error;
    priceLabel = null;
  }
  return { name: coachNameForCopy(coach), priceLabel };
}

/**
 * Who receives a member's coach emails and the coach name the member is told, both from ONE
 * coach lookup, so a reassignment can never send data to one coach while naming another.
 */
export async function getCoachRoutingForMember(
  userId: string
): Promise<{ recipients: string[]; coachName: string }> {
  const coach = await getCoachForMember(userId);
  return {
    recipients: coachNotifyRecipients(coach, getCarsiCoachingMonthlyNotifyRecipients()),
    coachName: coachNameForCopy(coach),
  };
}

/**
 * The coach whose dashboard this viewer may see: their own coach record, or the default
 * coach for a CARSI admin. Returns null for everyone else.
 */
export async function getCoachForViewer(claims: SessionClaims): Promise<CoachRecord | null> {
  const own = await prisma.carsiCoachingCoach.findFirst({
    where: { userId: claims.sub },
    select: COACH_SELECT,
    orderBy: { createdAt: 'asc' },
  });
  if (own) return own;
  if (isLmsClaimsAllowedAdminPanel(claims)) return getDefaultCoach();
  return null;
}

function memberWhere(coach: CoachRecord) {
  return coach.isDefault
    ? { OR: [{ coachId: coach.id }, { coachId: null }] }
    : { coachId: coach.id };
}

export type CoachDashboardMember = {
  userId: string;
  memberName: string;
  memberEmail: string;
  businessName: string;
  onboardingStatus: MemberOnboardingStatus;
  nextSessionAt: string | null;
  openActions: number;
  blockedActions: number;
  plan: { status: string; focusTitle: string | null; goalCount: number } | null;
};

function goalCount(goalsJson: string | null): number {
  if (!goalsJson) return 0;
  try {
    const parsed: unknown = JSON.parse(goalsJson);
    return Array.isArray(parsed) ? parsed.length : 0;
  } catch {
    return 0;
  }
}

export async function listCoachMembers(coach: CoachRecord): Promise<CoachDashboardMember[]> {
  const profiles = await prisma.carsiCoachingBusinessProfile.findMany({
    where: memberWhere(coach),
    select: {
      userId: true,
      businessName: true,
      completedAt: true,
      onboardingSubmittedAt: true,
      user: { select: { email: true, fullName: true } },
    },
    orderBy: { updatedAt: 'desc' },
    take: 200,
  });
  const userIds = profiles.map((p) => p.userId);
  if (userIds.length === 0) return [];

  const [assessments, sessions, actions, plans] = await Promise.all([
    prisma.carsiCoachingAssessment.findMany({
      where: { userId: { in: userIds } },
      select: { userId: true, status: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.carsiCoachingSession.findMany({
      where: { userId: { in: userIds }, status: 'scheduled' },
      select: { userId: true, scheduledAt: true, status: true },
    }),
    prisma.carsiCoachingAction.findMany({
      where: { userId: { in: userIds } },
      select: { userId: true, status: true },
    }),
    prisma.carsiCoachingGrowthPlan.findMany({
      where: { userId: { in: userIds } },
      select: { userId: true, status: true, focusTitle: true, goalsJson: true },
    }),
  ]);

  const now = new Date();
  return profiles.map((p) => {
    const latestAssessment = assessments.find((a) => a.userId === p.userId) ?? null;
    const next = nextSessionAt(
      sessions.filter((s) => s.userId === p.userId),
      now
    );
    const counts = countActions(actions.filter((a) => a.userId === p.userId).map((a) => a.status));
    const plan = plans.find((pl) => pl.userId === p.userId) ?? null;
    const memberName = p.user.fullName?.trim() || p.user.email;
    return {
      userId: p.userId,
      memberName,
      memberEmail: p.user.email,
      businessName: p.businessName?.trim() || memberName,
      onboardingStatus: memberOnboardingStatus({
        profileCompletedAt: p.completedAt,
        assessmentStatus: latestAssessment?.status ?? null,
        onboardingSubmittedAt: p.onboardingSubmittedAt,
      }),
      nextSessionAt: next ? next.toISOString() : null,
      openActions: counts.open,
      blockedActions: counts.blocked,
      plan: plan
        ? { status: plan.status, focusTitle: plan.focusTitle, goalCount: goalCount(plan.goalsJson) }
        : null,
    };
  });
}

type ApproveResult = { ok: true } | { ok: false; status: 403 | 404 | 409; detail: string };

/**
 * Approve a member's draft plan. Only the member's own coach (or an admin acting as the
 * default coach) may. The member's profile row is locked for the whole transaction, so a
 * reassignment to another chapter cannot land between the membership check and the write.
 */
export async function approveMemberDraftPlan(
  coach: CoachRecord,
  memberUserId: string
): Promise<ApproveResult> {
  return prisma.$transaction(async (tx): Promise<ApproveResult> => {
    const rows = await tx.$queryRaw<{ coach_id: string | null }[]>`
      SELECT "coach_id" FROM "carsi_coaching_business_profiles"
      WHERE "user_id" = ${memberUserId}::uuid
      FOR UPDATE`;
    if (rows.length === 0 || !isMemberOfChapter(coach, rows[0].coach_id)) {
      return { ok: false, status: 403, detail: 'This member is not in your chapter.' };
    }

    const plan = await tx.carsiCoachingGrowthPlan.findUnique({
      where: { userId: memberUserId },
      select: { status: true },
    });
    if (!plan) return { ok: false, status: 404, detail: 'No plan to approve.' };
    if (plan.status !== 'draft') return { ok: false, status: 409, detail: 'Plan is not a draft.' };

    // Conditional on status so two clicks (or a concurrent edit) cannot approve twice.
    const updated = await tx.carsiCoachingGrowthPlan.updateMany({
      where: { userId: memberUserId, status: 'draft' },
      data: { status: 'approved', approvedAt: new Date() },
    });
    if (updated.count === 0) return { ok: false, status: 409, detail: 'Plan is not a draft.' };
    return { ok: true };
  });
}

/** Every chapter, default first, for the admin coach list. */
export async function listCoachingCoaches(): Promise<(CoachRecord & { memberCount: number })[]> {
  const coaches = await prisma.carsiCoachingCoach.findMany({
    select: { ...COACH_SELECT, _count: { select: { members: true } } },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
  });
  return coaches.map(({ _count, ...coach }) => ({ ...coach, memberCount: _count.members }));
}

type CreateCoachResult = { ok: true; coach: CoachRecord } | { ok: false; detail: string };

/**
 * Admin opens a partner chapter. Never creates a default coach (the migration seeds the one
 * default) and holds no revenue-share terms: those need Phill's sign-off and are not built.
 */
export async function createCoachingCoach(input: NewCoachInput): Promise<CreateCoachResult> {
  const checked = validateNewCoachInput(input);
  if (!checked.ok) return checked;
  const value = checked.value;

  const existing = await prisma.carsiCoachingCoach.findUnique({
    where: { chapterSlug: value.chapterSlug },
    select: { id: true },
  });
  if (existing) return { ok: false, detail: 'That chapter slug is already in use.' };

  try {
    const coach = await prisma.carsiCoachingCoach.create({
      data: { ...value, isDefault: false, isDemo: false },
      select: COACH_SELECT,
    });
    return { ok: true, coach };
  } catch (error) {
    // P2002: a concurrent create took the slug between the check and the insert.
    if ((error as { code?: unknown } | null)?.code === 'P2002') {
      return { ok: false, detail: 'That chapter slug is already in use.' };
    }
    throw error;
  }
}

type AssignResult = { ok: true } | { ok: false; status: 404; detail: string };

/**
 * Admin assigns a member to a chapter; null returns them to the default coach. A member with
 * no coaching profile yet gets one, so routing is fixed before their first email.
 */
export async function assignMemberToCoach(
  memberUserId: string,
  coachId: string | null
): Promise<AssignResult> {
  let targetCoachId: string | null = null;
  if (coachId) {
    const coach = await prisma.carsiCoachingCoach.findUnique({
      where: { id: coachId },
      select: { id: true, isDefault: true },
    });
    if (!coach) return { ok: false, status: 404, detail: 'Coach not found.' };
    // The default chapter is stored as null, so "Phill's members" stays one query.
    targetCoachId = coach.isDefault ? null : coach.id;
  }

  const member = await prisma.lmsUser.findUnique({ where: { id: memberUserId }, select: { id: true } });
  if (!member) return { ok: false, status: 404, detail: 'Member not found.' };

  await prisma.carsiCoachingBusinessProfile.upsert({
    where: { userId: memberUserId },
    create: { userId: memberUserId, coachId: targetCoachId },
    update: { coachId: targetCoachId },
  });
  return { ok: true };
}
