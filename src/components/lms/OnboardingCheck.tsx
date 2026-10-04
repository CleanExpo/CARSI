'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { OnboardingWizard } from './OnboardingWizard';
import { apiClient } from '@/lib/api/client';
import {
  readSkipped,
  rememberSkipped,
  shouldShowOnboardingWizard,
} from '@/lib/onboarding/wizard-gate';

interface UserProfile {
  onboarding_completed: boolean;
  recommended_pathway: string | null;
}

export function OnboardingCheck() {
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [skipped, setSkipped] = useState(false);
  const [checked, setChecked] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    let cancelled = false;

    async function checkOnboarding() {
      try {
        const profile = await apiClient.get<UserProfile>('/api/lms/auth/me');
        if (!cancelled && !profile.onboarding_completed) {
          setNeedsOnboarding(true);
        }
      } catch {
        // not authenticated or network error — silently skip onboarding check
      } finally {
        if (!cancelled) {
          setSkipped(readSkipped());
          setChecked(true);
        }
      }
    }

    checkOnboarding();
    return () => {
      cancelled = true;
    };
  }, []);

  // GP-593: never over a lesson, and not again once skipped this session.
  const show =
    checked &&
    shouldShowOnboardingWizard({
      onboardingCompleted: !needsOnboarding,
      pathname,
      skippedThisSession: skipped,
    });

  if (!show) return null;

  return (
    <OnboardingWizard
      isOpen
      onSkip={() => {
        rememberSkipped();
        setSkipped(true);
      }}
      onComplete={(destination) => {
        setNeedsOnboarding(false);
        router.push(destination);
      }}
    />
  );
}
