'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { OnboardingWizard } from './OnboardingWizard';
import { apiClient } from '@/lib/api/client';

interface UserProfile {
  onboarding_completed: boolean;
  recommended_pathway: string | null;
}

export function OnboardingCheck() {
  const [showWizard, setShowWizard] = useState(false);
  const [checked, setChecked] = useState(false);
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    async function checkOnboarding() {
      try {
        const profile = await apiClient.get<UserProfile>('/api/lms/auth/me');
        if (!cancelled && !profile.onboarding_completed) {
          setShowWizard(true);
        }
      } catch {
        // not authenticated or network error — silently skip onboarding check
      } finally {
        if (!cancelled) setChecked(true);
      }
    }

    checkOnboarding();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!checked || !showWizard) return null;

  return (
    <OnboardingWizard
      isOpen={showWizard}
      onComplete={(pathway) => {
        setShowWizard(false);
        router.push(`/pathways/${pathway.toLowerCase()}`);
      }}
    />
  );
}
