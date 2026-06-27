import { Suspense } from 'react';

import { OnboardingProgramClient } from '@/components/onboarding/OnboardingProgramClient';

export const metadata = {
  title: 'Onboarding Program | CARSI',
  description: 'Enterprise maintenance workforce onboarding — operational readiness and professional standards.',
};

export default async function OnboardingProgramPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center text-slate-500">
          Loading program…
        </div>
      }
    >
      <OnboardingProgramClient slug={slug} />
    </Suspense>
  );
}
