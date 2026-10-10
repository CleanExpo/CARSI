import type { SessionClaims } from '@/lib/auth/session-jwt';
import { parseAssessmentResponsesJson } from '@/lib/coaching-portal/assessment-schema';
import { profileFromApiRow } from '@/lib/coaching-portal/business-profile';
import {
  buildOnboardingReportHtml,
  buildOnboardingReportPlainText,
  type OnboardingSubmitStatements,
} from '@/lib/coaching-portal/onboarding-report';
import {
  serializeOnboardingSnapshot,
  type CoachingOnboardingSnapshot,
} from '@/lib/coaching-portal/onboarding-snapshot';
import { carsiCoachingPortalPath } from '@/lib/marketing/carsi-coaching-program';
import { prisma } from '@/lib/prisma';
import { getAppOrigin } from '@/lib/server/app-url';
import { getCarsiCoachingMonthlyNotifyRecipients } from '@/lib/server/carsi-coaching-monthly-notify';
import { sendEmail } from '@/lib/server/email';
import {
  renderCoachingOnboardingSubmittedCoachEmail,
  renderCoachingOnboardingSubmittedMemberEmail,
} from '@/lib/server/email-templates';

const MIN_STATEMENT_LENGTH = 20;

export type OnboardingSubmitEligibility = {
  eligible: boolean;
  alreadySubmitted: boolean;
  submittedAt: string | null;
  profileComplete: boolean;
  assessmentSubmitted: boolean;
  prefill: {
    problemStatement: string;
    goalStatement: string;
  };
};

function isProfileCompleteForSubmit(
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

export async function getOnboardingSubmitEligibility(
  userId: string
): Promise<OnboardingSubmitEligibility> {
  const [profile, latestSubmitted] = await Promise.all([
    prisma.carsiCoachingBusinessProfile.findUnique({ where: { userId } }),
    prisma.carsiCoachingAssessment.findFirst({
      where: { userId, status: { in: ['submitted', 'reviewed'] } },
      orderBy: { submittedAt: 'desc' },
    }),
  ]);

  const profileComplete = isProfileCompleteForSubmit(profile);
  const assessmentSubmitted = Boolean(latestSubmitted);
  const alreadySubmitted = Boolean(profile?.onboardingSubmittedAt);

  return {
    eligible: profileComplete && assessmentSubmitted && !alreadySubmitted,
    alreadySubmitted,
    submittedAt: profile?.onboardingSubmittedAt?.toISOString() ?? null,
    profileComplete,
    assessmentSubmitted,
    prefill: {
      problemStatement: profile?.challenges?.trim() ?? '',
      goalStatement: profile?.shortTermGoals?.trim() ?? '',
    },
  };
}

export type SubmitOnboardingResult =
  | { ok: true; submittedAt: string }
  | {
      ok: false;
      code: 'already_submitted' | 'profile_incomplete' | 'assessment_missing' | 'validation';
      detail: string;
    };

export async function submitCoachingOnboardingToCoach(
  claims: SessionClaims,
  input: OnboardingSubmitStatements
): Promise<SubmitOnboardingResult> {
  const problemStatement = input.problemStatement.trim();
  const goalStatement = input.goalStatement.trim();
  const extraNotes = input.extraNotes.trim();

  if (
    problemStatement.length < MIN_STATEMENT_LENGTH ||
    goalStatement.length < MIN_STATEMENT_LENGTH
  ) {
    return {
      ok: false,
      code: 'validation',
      detail: `Please describe your problem and goal in at least ${MIN_STATEMENT_LENGTH} characters each.`,
    };
  }

  const userId = claims.sub;
  const eligibility = await getOnboardingSubmitEligibility(userId);
  if (eligibility.alreadySubmitted) {
    return { ok: false, code: 'already_submitted', detail: 'Onboarding already submitted.' };
  }
  if (!eligibility.profileComplete) {
    return {
      ok: false,
      code: 'profile_incomplete',
      detail: 'Complete your business profile first.',
    };
  }
  if (!eligibility.assessmentSubmitted) {
    return {
      ok: false,
      code: 'assessment_missing',
      detail: 'Submit your business assessment first.',
    };
  }

  const [profileRow, assessment] = await Promise.all([
    prisma.carsiCoachingBusinessProfile.findUnique({ where: { userId } }),
    prisma.carsiCoachingAssessment.findFirst({
      where: { userId, status: { in: ['submitted', 'reviewed'] } },
      orderBy: { submittedAt: 'desc' },
    }),
  ]);
  if (!profileRow || !assessment) {
    return { ok: false, code: 'validation', detail: 'Could not load onboarding data.' };
  }

  const submittedAt = new Date();
  const statements: OnboardingSubmitStatements = {
    problemStatement,
    goalStatement,
    extraNotes,
  };

  const profile = profileFromApiRow(profileRow as unknown as Record<string, string | null>);
  const assessmentResponses = parseAssessmentResponsesJson(assessment.responsesJson);
  const member = {
    fullName: claims.full_name?.trim() || claims.email,
    email: claims.email,
  };
  const submittedAtIso = submittedAt.toISOString();

  const snapshot: CoachingOnboardingSnapshot = {
    version: 1,
    submittedAtIso,
    member,
    profile,
    assessmentResponses,
    statements,
  };

  await prisma.carsiCoachingBusinessProfile.update({
    where: { userId },
    data: {
      onboardingProblemStatement: problemStatement,
      onboardingGoalStatement: goalStatement,
      onboardingExtraNotes: extraNotes || null,
      onboardingSubmittedAt: submittedAt,
      onboardingEmailsSentAt: submittedAt,
      onboardingSnapshotJson: serializeOnboardingSnapshot(snapshot),
    },
  });
  const appOrigin = getAppOrigin();
  const portalUrl = `${appOrigin.replace(/\/$/, '')}${carsiCoachingPortalPath}`;

  const reportHtml = buildOnboardingReportHtml({
    member,
    profile,
    assessmentResponses,
    statements,
    submittedAtIso,
  });
  const reportPlain = buildOnboardingReportPlainText({
    member,
    profile,
    assessmentResponses,
    statements,
    submittedAtIso,
  });

  const businessLabel = profile.businessName.trim() || member.fullName;
  const coachRecipients = getCarsiCoachingMonthlyNotifyRecipients();
  const coachEmail = renderCoachingOnboardingSubmittedCoachEmail({
    appOrigin,
    businessName: businessLabel,
    memberName: member.fullName,
    memberEmail: member.email,
    reportHtml,
    reportPlain,
    portalUrl,
  });

  await sendEmail({
    to: coachRecipients,
    subject: `[CARSI Coaching] Onboarding ready — ${businessLabel}`,
    html: coachEmail.html,
    text: coachEmail.text,
    replyTo: member.email,
  });

  const memberEmail = renderCoachingOnboardingSubmittedMemberEmail({
    appOrigin,
    name: member.fullName.split(/\s+/)[0] || 'there',
    businessName: businessLabel,
    problemStatement,
    goalStatement,
    portalUrl,
  });

  await sendEmail({
    to: [member.email],
    subject: 'We have your business details — CARSI Business Coaching',
    html: memberEmail.html,
    text: memberEmail.text,
  });

  return { ok: true, submittedAt: submittedAtIso };
}
