import Link from 'next/link';

import type { DesignationDefinition } from '@/lib/designations/registry';

/** Index card for a single CARSI designation. Presentational server component. */
export function DesignationCard({
  designation,
  totalSteps,
}: {
  designation: DesignationDefinition;
  totalSteps: number;
}) {
  return (
    <Link
      href={`/designations/${designation.slug}`}
      className="group flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-[#2490ed]/40 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2490ed]/40"
    >
      <span className="mb-2 text-xs font-semibold tracking-wide text-[#0f5fa8] uppercase">
        CARSI Southern Hemisphere Designation
      </span>
      <h3 className="font-display text-lg font-bold text-slate-900 group-hover:text-[#0f5fa8]">
        {designation.name}
      </h3>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-600">{designation.summary}</p>
      <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium text-slate-500">
        <span>
          {totalSteps} course{totalSteps === 1 ? '' : 's'} in the pathway
        </span>
        {designation.alsoEarnsCec && (
          <>
            <span aria-hidden>·</span>
            <span>Also earns IICRC CECs</span>
          </>
        )}
      </div>
    </Link>
  );
}
