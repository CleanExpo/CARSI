import Link from 'next/link';
import { notFound } from 'next/navigation';

import { DesignationPathway } from '@/components/designations/DesignationPathway';
import { getDesignationDefinition } from '@/lib/designations/registry';
import { getDesignationDetail } from '@/lib/server/designations';
import { designationsEnabled } from '@/lib/server/designations-flag';
import { getServerSessionClaims } from '@/lib/server/session-server';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const def = getDesignationDefinition(slug);
  if (!def) return { title: 'CARSI Designation' };
  return { title: `${def.name} — CARSI Designation`, description: def.summary };
}

export default async function DesignationDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  if (!designationsEnabled()) notFound();

  const { slug } = await params;
  const claims = await getServerSessionClaims();
  const detail = await getDesignationDetail(slug, claims?.sub ?? null);
  if (!detail) notFound();

  const { definition, progress } = detail;

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
      <Link href="/designations" className="text-sm font-medium text-[#0f5fa8] hover:underline">
        ← All designations
      </Link>

      <p className="mt-6 text-sm font-semibold tracking-wide text-[#0f5fa8] uppercase">
        CARSI Southern Hemisphere Designation
      </p>
      <h1 className="font-display mt-2 text-3xl font-bold text-slate-900 sm:text-4xl">
        {definition.name}
      </h1>
      <p className="mt-4 text-base leading-relaxed text-slate-600">{definition.summary}</p>
      {definition.alsoEarnsCec && (
        <p className="mt-3 text-sm font-medium text-slate-500">
          Completing this pathway also earns IICRC Continuing Education Credits (CECs).
        </p>
      )}

      {progress?.earned ? (
        <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">
          You hold the {definition.name} designation.
        </div>
      ) : progress && progress.requiredComplete > 0 ? (
        <div className="mt-6 rounded-xl border border-[#2490ed]/30 bg-[#2490ed]/[0.04] p-4 text-sm font-medium text-slate-700">
          {progress.requiredComplete} of {progress.requiredTotal} required course
          {progress.requiredTotal === 1 ? '' : 's'} complete ({progress.percentComplete}%).
        </div>
      ) : null}

      <h2 className="font-display mt-10 mb-4 text-xl font-bold text-slate-900">Your pathway</h2>
      <DesignationPathway detail={detail} />
    </div>
  );
}
