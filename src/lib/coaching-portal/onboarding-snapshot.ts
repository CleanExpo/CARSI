import type { CoachingBusinessProfileForm } from '@/lib/coaching-portal/business-profile';
import type { OnboardingSubmitStatements } from '@/lib/coaching-portal/onboarding-report';

export type CoachingOnboardingSnapshot = {
  version: 1;
  submittedAtIso: string;
  member: { fullName: string; email: string };
  profile: CoachingBusinessProfileForm;
  assessmentResponses: Record<string, string>;
  statements: OnboardingSubmitStatements;
};

export function serializeOnboardingSnapshot(snapshot: CoachingOnboardingSnapshot): string {
  return JSON.stringify(snapshot);
}

export function parseOnboardingSnapshotJson(
  raw: string | null | undefined
): CoachingOnboardingSnapshot | null {
  if (!raw?.trim()) return null;
  try {
    const parsed = JSON.parse(raw) as CoachingOnboardingSnapshot;
    if (parsed?.version !== 1 || !parsed.submittedAtIso) return null;
    return parsed;
  } catch {
    return null;
  }
}
