'use client';

import { ArrowRight, Building2, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { OnboardingSpotlight, type OnboardingSpotlightProgram } from '@/components/onboarding/OnboardingSpotlight';
import { apiClient } from '@/lib/api/client';
import { dash } from '@/lib/dashboard-light-ui';

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
      <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-6 text-sm text-slate-500">
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
      className={`${dash.btnSecondary} gap-2 border-[#2490ed]/25 bg-[#eef7ff]/50 text-[#146fc2] hover:bg-[#eef7ff]`}
    >
      <Building2 className="h-4 w-4" aria-hidden />
      Organisation onboarding
      <ArrowRight className="h-3.5 w-3.5 opacity-80" aria-hidden />
    </Link>
  );
}
