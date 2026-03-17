'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { OnboardingWizard } from './OnboardingWizard';

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
        const res = await fetch('/api/lms/auth/me', { credentials: 'include' });
        if (!res.ok) return; // not authenticated — let middleware handle it
        const profile: UserProfile = await res.json();
        if (!cancelled && !profile.onboarding_completed) {
          setShowWizard(true);
        }
      } catch {
        // network error — silently skip onboarding check
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
