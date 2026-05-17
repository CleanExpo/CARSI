'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

export interface CampusBreadcrumb {
  label: string;
  href?: string;
}

/** Shared campus chrome for learn + catalogue (Phase 2). */
export function CampusTopBar({
  section,
  breadcrumbs = [],
}: {
  section: string;
  breadcrumbs?: CampusBreadcrumb[];
}) {
  return (
    <div className="mb-6 flex flex-col gap-2 border-b border-white/8 pb-4">
      <p className="text-[10px] font-semibold tracking-[0.2em] text-[#2490ed]/75 uppercase">
        {section}
      </p>
      {breadcrumbs.length > 0 ? (
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-sm">
          {breadcrumbs.map((crumb, i) => (
            <span key={`${crumb.label}-${i}`} className="flex items-center gap-1.5">
              {i > 0 ? (
                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-white/25" aria-hidden />
              ) : null}
              {crumb.href ? (
                <Link href={crumb.href} className="font-medium text-[#7ec5ff] hover:underline">
                  {crumb.label}
                </Link>
              ) : (
                <span className="font-medium text-white/85">{crumb.label}</span>
              )}
            </span>
          ))}
        </nav>
      ) : null}
    </div>
  );
}
