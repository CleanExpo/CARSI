'use client';

import { ArrowRight, Building2, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { OnboardingSpotlight, type OnboardingSpotlightProgram } from '@/components/onboarding/OnboardingSpotlight';
import { apiClient } from '@/lib/api/client';

export function OnboardingProgramsStrip() {
  const [programs, setPrograms] = useState<OnboardingSpotlightProgram[] | null>(null);

  useEffect(() => {
    apiClient
      .get<{ programs: OnboardingSpotlightProgram[] }>('/api/lms/onboarding/programs')
      .then((data) => setPrograms(data.programs))
      .catch(() => setPrograms([]));
  }, []);

  if (programs === null) {
    return (
      <div className="learner-home-surface flex items-center gap-2 rounded-[1.25rem] px-5 py-6 text-sm text-slate-300">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        Loading organisation programs…
      </div>
    );
  }

  if (programs.length === 0) return null;

  return <OnboardingSpotlight programs={programs} variant="compact" />;
}

export function OnboardingQuickLink() {
  return (
    <Link
      href="/dashboard/onboarding"
      className="inline-flex min-h-11 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-sky-300 hover:text-[#146fc2]"
    >
      <Building2 className="h-4 w-4" aria-hidden />
      Organisation onboarding
      <ArrowRight className="h-3.5 w-3.5 opacity-80" aria-hidden />
    </Link>
  );
}
