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
import {
  isDashboardPageReady,
  onDashboardPageReady,
  PAGE_READY_FALLBACK_MS,
} from '@/lib/onboarding/page-ready';

interface UserProfile {
  onboarding_completed: boolean;
  recommended_pathway: string | null;
}

export function OnboardingCheck() {
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [skipped, setSkipped] = useState(false);
  const [checked, setChecked] = useState(false);
  // GP-627: wait for the page's first loaded view (or the fallback) before opening the modal.
  const [pageReady, setPageReady] = useState(isDashboardPageReady);
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

  useEffect(() => {
    if (pageReady) return;
    const timer = window.setTimeout(() => setPageReady(true), PAGE_READY_FALLBACK_MS);
    const stop = onDashboardPageReady(() => setPageReady(true));
    return () => {
      window.clearTimeout(timer);
      stop();
    };
  }, [pageReady]);

  // GP-593: never over a lesson, and not again once skipped this session.
  const show =
    checked &&
    shouldShowOnboardingWizard({
      onboardingCompleted: !needsOnboarding,
      pathname,
      skippedThisSession: skipped,
      pageReady,
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
