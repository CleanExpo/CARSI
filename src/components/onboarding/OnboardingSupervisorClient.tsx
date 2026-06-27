'use client';

import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import {
  OnboardingSupervisorDashboard,
  type SupervisorMemberProgress,
} from '@/components/onboarding/OnboardingSupervisorDashboard';
import { apiClient } from '@/lib/api/client';
import { dash } from '@/lib/dashboard-light-ui';

export function OnboardingSupervisorClient({ slug }: { slug: string }) {
  const [data, setData] = useState<{
    programTitle: string;
    programSlug: string;
    isOwner: boolean;
    members: SupervisorMemberProgress[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiClient
      .get<{
        programTitle: string;
        programSlug: string;
        isOwner: boolean;
        members: SupervisorMemberProgress[];
      }>(`/api/lms/onboarding/${encodeURIComponent(slug)}/supervisor`)
      .then(setData)
      .catch(() => setError('Could not load supervisor insights.'));
  }, [slug]);

  if (!data && !error) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center gap-2 text-slate-500">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="px-4 py-16 text-center">
        <p className="text-red-600">{error}</p>
        <Link
          href={`/dashboard/onboarding/${slug}`}
          className={`${dash.btnSecondary} mt-4 inline-flex`}
        >
          Back to program
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full px-4 py-8 sm:px-6 lg:py-10">
      <nav className="mb-8 text-sm text-slate-500">
        <Link href="/dashboard/onboarding" className="hover:text-[#146fc2]">
          Onboarding
        </Link>
        <span className="mx-2">/</span>
        <Link href={`/dashboard/onboarding/${slug}`} className="hover:text-[#146fc2]">
          Program
        </Link>
        <span className="mx-2">/</span>
        <span className="text-slate-800">Supervisor</span>
      </nav>
      <OnboardingSupervisorDashboard
        programTitle={data.programTitle}
        programSlug={data.programSlug}
        members={data.members}
        isOwner={data.isOwner}
      />
    </div>
  );
}
