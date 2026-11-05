import type { LucideIcon } from 'lucide-react';
import Link from 'next/link';

import { coachingCard, coachingMuted } from '@/components/coaching-portal/coaching-ui';

export type CoachingQuickLink = {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
};

export function CoachingQuickLinks({
  links,
  testId = 'coaching-quick-links',
}: {
  links: CoachingQuickLink[];
  testId?: string;
}) {
  return (
    <nav
      className={`${coachingCard} mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4`}
      aria-label="Quick links"
      data-testid={testId}
    >
      {links.map((l) => {
        const Icon = l.icon;
        return (
          <Link
            key={l.href}
            href={l.href}
            className="group flex gap-3 rounded-lg border border-transparent p-2 transition-colors hover:border-white/10 hover:bg-white/[0.03]"
            data-testid={`${testId}-${l.label.replace(/\s+/g, '-').toLowerCase()}`}
          >
            <Icon
              className="mt-0.5 h-5 w-5 shrink-0 text-sky-400/80 group-hover:text-sky-300"
              aria-hidden
            />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white">{l.label}</p>
              <p className={`mt-0.5 text-xs ${coachingMuted}`}>{l.description}</p>
            </div>
          </Link>
        );
      })}
    </nav>
  );
}
