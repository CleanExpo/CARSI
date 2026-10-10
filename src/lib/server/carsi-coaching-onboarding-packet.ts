import { parseAssessmentResponsesJson } from '@/lib/coaching-portal/assessment-schema';
import { profileFromApiRow } from '@/lib/coaching-portal/business-profile';
import type { OnboardingSubmitStatements } from '@/lib/coaching-portal/onboarding-report';
import {
  parseOnboardingSnapshotJson,
  type CoachingOnboardingSnapshot,
} from '@/lib/coaching-portal/onboarding-snapshot';
import { prisma } from '@/lib/prisma';

export async function getCoachingOnboardingPacketForUser(
  userId: string
): Promise<{
  available: boolean;
  submittedAt: string | null;
  snapshot: CoachingOnboardingSnapshot | null;
}> {
  const profile = await prisma.carsiCoachingBusinessProfile.findUnique({ where: { userId } });
  if (!profile?.onboardingSubmittedAt) {
    return { available: false, submittedAt: null, snapshot: null };
  }

  const fromJson = parseOnboardingSnapshotJson(profile.onboardingSnapshotJson);
  if (fromJson) {
    return {
      available: true,
      submittedAt: profile.onboardingSubmittedAt.toISOString(),
      snapshot: fromJson,
    };
  }

  const assessment = await prisma.carsiCoachingAssessment.findFirst({
    where: { userId, status: { in: ['submitted', 'reviewed'] } },
    orderBy: { submittedAt: 'desc' },
  });

  const statements: OnboardingSubmitStatements = {
    problemStatement: profile.onboardingProblemStatement?.trim() ?? '',
    goalStatement: profile.onboardingGoalStatement?.trim() ?? '',
    extraNotes: profile.onboardingExtraNotes?.trim() ?? '',
  };

  const user = await prisma.lmsUser.findUnique({
    where: { id: userId },
    select: { email: true, fullName: true },
  });

  const snapshot: CoachingOnboardingSnapshot = {
    version: 1,
    submittedAtIso: profile.onboardingSubmittedAt.toISOString(),
    member: {
      fullName: user?.fullName?.trim() || user?.email || 'Member',
      email: user?.email ?? '',
    },
    profile: profileFromApiRow(profile as unknown as Record<string, string | null>),
    assessmentResponses: assessment ? parseAssessmentResponsesJson(assessment.responsesJson) : {},
    statements,
  };

  return {
    available: true,
    submittedAt: profile.onboardingSubmittedAt.toISOString(),
    snapshot,
  };
}
