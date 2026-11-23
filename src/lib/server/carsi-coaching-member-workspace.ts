import {
  DEFAULT_COACHING_CHAPTER_SLUG,
  DEFAULT_COACHING_COACH,
} from '@/lib/coaching-portal/coach-routing';
import { getCoachingChapter } from '@/lib/coaching-portal/coaching-chapters';
import {
  parseCoachBriefJson,
  type OnboardingCoachBrief,
} from '@/lib/coaching-portal/onboarding-coach-brief';
import { parseOnboardingSnapshotJson } from '@/lib/coaching-portal/onboarding-snapshot';
import { prisma } from '@/lib/prisma';
import { isCoachingMember } from '@/lib/server/carsi-coaching-learning-path';
import {
  generateAndStoreOnboardingCoachBrief,
  getOnboardingCoachBriefForCoach,
} from '@/lib/server/carsi-coaching-onboarding-brief';

const CHAPTER_SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export type MemberChapterInput = {
  chapterSlug?: string | null;
  coachUserId?: string | null;
};

export function normalizeChapterSlug(slug: string | null | undefined): string | null {
  const t = slug?.trim().toLowerCase() ?? '';
  if (!t) return null;
  if (!CHAPTER_SLUG_RE.test(t) || t.length > 120) return null;
  return t;
}

export async function getCoachingMemberWorkspace(userId: string) {
  const [profile, plan, sub] = await Promise.all([
    prisma.carsiCoachingBusinessProfile.findUnique({
      where: { userId },
      select: {
        businessName: true,
        chapterSlug: true,
        coachUserId: true,
        onboardingSubmittedAt: true,
        onboardingCoachBriefAt: true,
        onboardingSnapshotJson: true,
      },
    }),
    prisma.carsiCoachingGrowthPlan.findUnique({
      where: { userId },
      select: { status: true, focusTitle: true, focusDescription: true, approvedAt: true },
    }),
    prisma.carsiCoachingMonthlySubscription.findUnique({
      where: { userId },
      select: { status: true, createdAt: true },
    }),
  ]);

  const brief = await getOnboardingCoachBriefForCoach(userId);
  const chapterSlug = profile?.chapterSlug ?? DEFAULT_COACHING_CHAPTER_SLUG;
  const chapter = getCoachingChapter(chapterSlug);

  return {
    businessName: profile?.businessName ?? null,
    chapterSlug,
    coachUserId: profile?.coachUserId ?? chapter?.coachUserId ?? DEFAULT_COACHING_COACH.id,
    onboardingSubmittedAt: profile?.onboardingSubmittedAt?.toISOString() ?? null,
    briefGeneratedAt: profile?.onboardingCoachBriefAt?.toISOString() ?? null,
    brief,
    growthPlan: plan
      ? {
          status: plan.status,
          focusTitle: plan.focusTitle,
          focusDescription: plan.focusDescription,
          approvedAt: plan.approvedAt?.toISOString() ?? null,
        }
      : null,
    subscription: sub ? { status: sub.status, startedAt: sub.createdAt.toISOString() } : null,
    hasOnboardingSnapshot: Boolean(profile?.onboardingSnapshotJson),
  };
}

export async function saveCoachingMemberChapter(
  userId: string,
  input: MemberChapterInput
): Promise<{ ok: true } | { ok: false; detail: string }> {
  if (!(await isCoachingMember(userId))) {
    return { ok: false, detail: 'Not a coaching member.' };
  }

  const chapterSlug =
    input.chapterSlug === undefined ? undefined : normalizeChapterSlug(input.chapterSlug);
  if (input.chapterSlug !== undefined && input.chapterSlug?.trim() && !chapterSlug) {
    return {
      ok: false,
      detail: 'Invalid chapter slug (use lowercase letters, numbers and hyphens).',
    };
  }
  if (chapterSlug && !getCoachingChapter(chapterSlug)) {
    return { ok: false, detail: 'Unknown chapter slug — pick a chapter from the registry.' };
  }

  const coachUserId = input.coachUserId?.trim() || null;
  if (coachUserId && chapterSlug) {
    const def = getCoachingChapter(chapterSlug);
    if (def && def.coachUserId !== coachUserId) {
      return {
        ok: false,
        detail: `Coach id does not match chapter ${chapterSlug} (${def.coachUserId}).`,
      };
    }
  }
  if (coachUserId && coachUserId.length > 64) {
    return { ok: false, detail: 'coachUserId too long.' };
  }

  await prisma.carsiCoachingBusinessProfile.upsert({
    where: { userId },
    create: {
      userId,
      chapterSlug: chapterSlug ?? DEFAULT_COACHING_CHAPTER_SLUG,
      coachUserId,
    },
    update: {
      ...(chapterSlug !== undefined ? { chapterSlug } : {}),
      ...(input.coachUserId !== undefined ? { coachUserId } : {}),
    },
  });

  return { ok: true };
}

export async function regenerateCoachingMemberBrief(
  userId: string
): Promise<{ ok: true; brief: OnboardingCoachBrief } | { ok: false; detail: string }> {
  if (!(await isCoachingMember(userId))) {
    return { ok: false, detail: 'Not a coaching member.' };
  }
  const profile = await prisma.carsiCoachingBusinessProfile.findUnique({
    where: { userId },
    select: { onboardingSnapshotJson: true },
  });
  const snapshot = parseOnboardingSnapshotJson(profile?.onboardingSnapshotJson);
  if (!snapshot) return { ok: false, detail: 'No onboarding snapshot.' };
  const brief = await generateAndStoreOnboardingCoachBrief(userId, snapshot);
  return { ok: true, brief };
}

/** Copy A1 suggested focus into a draft growth plan — never overwrites an approved plan. */
export async function applyCoachBriefToDraftPlan(
  userId: string
): Promise<{ ok: true } | { ok: false; detail: string }> {
  if (!(await isCoachingMember(userId))) {
    return { ok: false, detail: 'Not a coaching member.' };
  }
  const brief = await getOnboardingCoachBriefForCoach(userId);
  if (!brief) return { ok: false, detail: 'Generate a coach brief first.' };

  const existing = await prisma.carsiCoachingGrowthPlan.findUnique({
    where: { userId },
    select: { status: true, approvedAt: true },
  });
  if (existing?.approvedAt || existing?.status === 'approved') {
    return {
      ok: false,
      detail: 'Growth plan is already approved — edit in the admin review flow.',
    };
  }

  await prisma.carsiCoachingGrowthPlan.upsert({
    where: { userId },
    create: {
      userId,
      status: 'draft',
      focusTitle: brief.suggestedFocusTitle.slice(0, 500),
      focusDescription: brief.suggestedFocusDescription.slice(0, 4000),
    },
    update: {
      status: 'draft',
      focusTitle: brief.suggestedFocusTitle.slice(0, 500),
      focusDescription: brief.suggestedFocusDescription.slice(0, 4000),
    },
  });

  return { ok: true };
}

export function parseStoredCoachBrief(raw: string | null): OnboardingCoachBrief | null {
  return parseCoachBriefJson(raw);
}
