import type { SessionClaims } from '@/lib/auth/session-jwt';
import type { CoachingActionStatus } from '@/lib/coaching-portal/types';
import { prisma } from '@/lib/prisma';
import {
  importLegacyActionsFromSubscriptionJson,
  listCoachingActionsForUser,
} from '@/lib/server/carsi-coaching-actions-store';
import { getCoachingPortalAccess } from '@/lib/server/carsi-coaching-portal-access';
import { getCoachingPortalRowForUser } from '@/lib/server/carsi-coaching-subscription-store';

export type CoachingHomeState = 'locked' | 'onboarding' | 'assessment_pending' | 'active';

export type CoachingOnboardingStepId = 'profile' | 'assessment' | 'submit' | 'session';

export type CoachingPortalUser = {
  firstName: string;
  fullName: string;
  email: string;
  /** Sidebar display — prefers business name, then a proper name over bare email local-part. */
  displayName: string;
};

export type CoachingPortalDashboard = {
  user: CoachingPortalUser;
  access: Awaited<ReturnType<typeof getCoachingPortalAccess>>;
  homeState: CoachingHomeState;
  welcomeMessage: string;
  onboarding: {
    steps: Array<{
      id: CoachingOnboardingStepId;
      title: string;
      description: string;
      complete: boolean;
      href: string;
    }>;
    completedCount: number;
  };
  profile: {
    complete: boolean;
    businessName: string | null;
  };
  onboardingSubmit: {
    complete: boolean;
    submittedAt: string | null;
  };
  assessment: {
    status: 'none' | 'draft' | 'submitted' | 'reviewed';
    submittedAt: string | null;
    reviewedAt: string | null;
    customerFeedback: string | null;
    canEdit: boolean;
  };
  plan: {
    hasApprovedPlan: boolean;
    focusTitle: string | null;
    focusDescription: string | null;
    focusTargetDate: string | null;
    latestGuidance: string | null;
  };
  actions: {
    items: Array<{
      id: string;
      title: string;
      description: string | null;
      status: CoachingActionStatus;
      dueDate: string | null;
      priority: string | null;
    }>;
    completedThisMonth: number;
    totalThisMonth: number;
    nextAction: {
      id: string;
      title: string;
      status: CoachingActionStatus;
      dueDate: string | null;
    } | null;
  };
  sessions: {
    upcoming: {
      id: string;
      scheduledAt: string;
      durationMinutes: number;
      coachName: string;
      meetingUrl: string | null;
      status: string;
    } | null;
    hasBookedAny: boolean;
  };
  bookingUrl: string | null;
};

function firstNameFromClaims(claims: SessionClaims): string {
  const fromName = claims.full_name?.trim().split(/\s+/)[0];
  if (fromName) return fromName;
  const fromEmail = claims.email?.split('@')[0];
  return fromEmail || 'there';
}

function isProfileComplete(
  profile: {
    businessName: string | null;
    industry: string | null;
    location: string | null;
    mainServices: string | null;
    challenges: string | null;
    shortTermGoals: string | null;
    completedAt: Date | null;
  } | null
): boolean {
  if (!profile) return false;
  if (profile.completedAt) return true;
  return Boolean(
    profile.businessName?.trim() &&
    profile.industry?.trim() &&
    profile.location?.trim() &&
    profile.mainServices?.trim() &&
    profile.challenges?.trim() &&
    profile.shortTermGoals?.trim()
  );
}

export async function loadCoachingPortalDashboard(
  claims: SessionClaims
): Promise<CoachingPortalDashboard> {
  const access = await getCoachingPortalAccess(claims);
  const userId = claims.sub;

  const subRow = await getCoachingPortalRowForUser(userId);
  if (subRow?.monthlyActionsJson) {
    await importLegacyActionsFromSubscriptionJson(userId, subRow.monthlyActionsJson);
  }

  const [profile, draftAssessment, latestSubmitted, growthPlan, actions, sessions] =
    await Promise.all([
      prisma.carsiCoachingBusinessProfile.findUnique({ where: { userId } }),
      prisma.carsiCoachingAssessment.findFirst({
        where: { userId, status: 'draft' },
        orderBy: { updatedAt: 'desc' },
      }),
      prisma.carsiCoachingAssessment.findFirst({
        where: { userId, status: { in: ['submitted', 'reviewed'] } },
        orderBy: { submittedAt: 'desc' },
      }),
      prisma.carsiCoachingGrowthPlan.findUnique({ where: { userId } }),
      listCoachingActionsForUser(userId),
      prisma.carsiCoachingSession.findMany({
        where: { userId },
        orderBy: { scheduledAt: 'desc' },
        take: 20,
      }),
    ]);

  const profileComplete = isProfileComplete(profile);
  const onboardingSubmitComplete = Boolean(profile?.onboardingSubmittedAt);
  const assessmentStatus =
    latestSubmitted?.status === 'reviewed'
      ? 'reviewed'
      : latestSubmitted
        ? 'submitted'
        : draftAssessment
          ? 'draft'
          : 'none';
  const assessmentSubmitted = assessmentStatus === 'submitted' || assessmentStatus === 'reviewed';

  const now = new Date();
  const upcoming =
    sessions.find(
      (s) =>
        s.status === 'scheduled' && s.scheduledAt >= now && !Number.isNaN(s.scheduledAt.getTime())
    ) ?? null;
  const hasBookedAny = sessions.some((s) => s.status !== 'cancelled');

  const hasApprovedPlan =
    growthPlan?.status === 'approved' &&
    Boolean(growthPlan.focusTitle?.trim() || growthPlan.businessDirection?.trim());

  let homeState: CoachingHomeState = 'locked';
  if (access.mode === 'locked') {
    homeState = 'locked';
  } else if (
    !profileComplete ||
    !assessmentSubmitted ||
    !onboardingSubmitComplete ||
    !hasBookedAny
  ) {
    homeState = 'onboarding';
  } else if (assessmentSubmitted && !hasApprovedPlan) {
    homeState = 'assessment_pending';
  } else {
    homeState = 'active';
  }

  let welcomeMessage = 'Here is what needs your attention this week.';
  if (access.mode === 'locked') {
    welcomeMessage = 'Subscribe to unlock your coaching workspace.';
  } else if (homeState === 'onboarding') {
    welcomeMessage = "Let's get to know your business and prepare for your first coaching session.";
  } else if (homeState === 'assessment_pending') {
    welcomeMessage = 'Your assessment is with Phill. Here is what happens next.';
  }

  const bookingUrl =
    process.env.CARSI_COACHING_BOOKING_URL?.trim() ||
    `mailto:support@carsi.com.au?subject=${encodeURIComponent('Book my Business Coaching session')}`;

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthActions = actions.filter((a) => a.createdAt >= monthStart);
  const completedThisMonth = monthActions.filter((a) => a.status === 'done').length;
  const nextAction = actions.find((a) => a.status === 'todo' || a.status === 'in_progress') ?? null;

  const steps = [
    {
      id: 'profile' as const,
      title: 'Complete your business profile',
      description: 'Tell us about your business, your experience, and what you want to achieve.',
      complete: profileComplete,
      href: '/coaching/onboarding/profile',
    },
    {
      id: 'assessment' as const,
      title: 'Complete your business assessment',
      description: 'Help Phill understand your biggest challenges and opportunities.',
      complete: assessmentSubmitted,
      href: '/coaching/onboarding/assessment',
    },
    {
      id: 'submit' as const,
      title: 'Send your details to Phill',
      description:
        'Confirm your problem, your goal, and we will email Phill your full profile and assessment.',
      complete: onboardingSubmitComplete,
      href: '/coaching/onboarding/submit',
    },
    {
      id: 'session' as const,
      title: 'Book your first coaching session',
      description: 'Choose a suitable time for your first 60-minute consultation.',
      complete: hasBookedAny,
      href: '/coaching/sessions',
    },
  ];

  const firstName = firstNameFromClaims(claims);
  const fullName = claims.full_name?.trim() || claims.email;
  const emailLocal = claims.email.split('@')[0]?.toLowerCase() ?? '';
  const nameLooksLikeEmailLocal =
    !claims.full_name?.trim() || claims.full_name.trim().toLowerCase() === emailLocal;
  const emailLower = claims.email.trim().toLowerCase();
  let displayName =
    profile?.businessName?.trim() || (nameLooksLikeEmailLocal ? firstName : fullName) || firstName;
  if (
    emailLower === 'support@carsi.com.au' ||
    (emailLower.startsWith('support@') && displayName.toLowerCase() === 'support')
  ) {
    displayName = 'Support team';
  }

  return {
    user: {
      firstName,
      fullName,
      email: claims.email,
      displayName,
    },
    access,
    homeState,
    welcomeMessage,
    onboarding: {
      steps,
      completedCount: steps.filter((s) => s.complete).length,
    },
    profile: {
      complete: profileComplete,
      businessName: profile?.businessName ?? null,
    },
    onboardingSubmit: {
      complete: onboardingSubmitComplete,
      submittedAt: profile?.onboardingSubmittedAt?.toISOString() ?? null,
    },
    assessment: {
      status: assessmentStatus,
      submittedAt: latestSubmitted?.submittedAt?.toISOString() ?? null,
      reviewedAt: latestSubmitted?.reviewedAt?.toISOString() ?? null,
      customerFeedback: latestSubmitted?.customerVisibleFeedback ?? null,
      canEdit: access.canEdit && !assessmentSubmitted,
    },
    plan: {
      hasApprovedPlan,
      focusTitle: growthPlan?.focusTitle ?? null,
      focusDescription: growthPlan?.focusDescription ?? null,
      focusTargetDate: growthPlan?.focusTargetDate?.toISOString() ?? null,
      latestGuidance: growthPlan?.latestGuidance ?? null,
    },
    actions: {
      items: actions.map((a) => ({
        id: a.id,
        title: a.title,
        description: a.description,
        status: a.status,
        dueDate: a.dueDate?.toISOString() ?? null,
        priority: a.priority,
      })),
      completedThisMonth,
      totalThisMonth: monthActions.length,
      nextAction: nextAction
        ? {
            id: nextAction.id,
            title: nextAction.title,
            status: nextAction.status,
            dueDate: nextAction.dueDate?.toISOString() ?? null,
          }
        : null,
    },
    sessions: {
      upcoming: upcoming
        ? {
            id: upcoming.id,
            scheduledAt: upcoming.scheduledAt.toISOString(),
            durationMinutes: upcoming.durationMinutes,
            coachName: upcoming.coachName,
            meetingUrl: upcoming.meetingUrl,
            status: upcoming.status,
          }
        : null,
      hasBookedAny,
    },
    bookingUrl,
  };
}
