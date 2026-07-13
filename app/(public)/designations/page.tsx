import { notFound } from 'next/navigation';

import { DesignationCard } from '@/components/designations/DesignationCard';
import { getDesignationRegistry } from '@/lib/designations/registry';
import { listDesignationSummaries } from '@/lib/server/designations';
import { designationsEnabled } from '@/lib/server/designations-flag';

export const revalidate = 300;

export const metadata = {
  title: 'CARSI Designations — Southern Hemisphere Restoration Credentials',
  description:
    'CARSI Southern Hemisphere Restoration Designations complement the IICRC — Australian-produced credentials for training the IICRC does not offer, that also earn IICRC Continuing Education Credits (CECs). Not an IICRC certification.',
};

export default function DesignationsIndexPage() {
  // Ships dark: the whole surface 404s until DESIGNATIONS_ENABLED is set.
  if (!designationsEnabled()) notFound();

  const registry = getDesignationRegistry();
  const summaries = listDesignationSummaries();

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
      <p className="text-sm font-semibold tracking-wide text-[#0f5fa8] uppercase">CARSI credentials</p>
      <h1 className="font-display mt-2 text-3xl font-bold text-slate-900 sm:text-4xl">
        {registry.program}
      </h1>
      <p className="mt-4 max-w-3xl text-base leading-relaxed text-slate-600">
        {registry.programSummary}
      </p>

      {registry.positioning && (
        <p className="mt-5 max-w-3xl rounded-xl border border-[#2490ed]/20 bg-[#2490ed]/[0.05] px-4 py-3 text-sm font-medium text-[#0f5fa8]">
          {registry.positioning}
        </p>
      )}

      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {summaries.map((s) => (
          <DesignationCard
            key={s.definition.slug}
            designation={s.definition}
            totalSteps={s.totalSteps}
          />
        ))}
      </div>
    </div>
  );
}
