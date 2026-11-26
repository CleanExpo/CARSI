'use client';

import { ArrowRight, CircleDollarSign, Globe2, UsersRound } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import {
  AdminCoachingPageHeader,
  AdminCoachingSecondaryBtn,
  AdminCoachingSection,
  AdminCoachingShortcutNav,
  AdminCoachingStatusPill,
  adminCoachingInset,
  adminCoachingLabel,
  adminCoachingPage,
  adminCoachingSurface,
} from '@/components/admin/admin-coaching-ui';
import {
  COACHING_OFFER_CADENCE_DEFAULT,
  COACHING_RECORDS_DEFAULT,
} from '@/lib/coaching-portal/coaching-ai-governance';
import {
  COACHING_CHAPTERS,
  formatChapterPriceLabel,
} from '@/lib/coaching-portal/coaching-chapters';

export function AdminCoachingChaptersClient() {
  const pathname = usePathname();
  return (
    <div className={adminCoachingPage}>
      <AdminCoachingPageHeader
        eyebrow="Coaching admin · GP-632"
        title="Coach chapters"
        description="Registry for chapter slugs, coach ids, currency, and checkout eligibility. Assign members on the workspace page."
        aside={
          <Link href="/admin/coaching-members" className={AdminCoachingSecondaryBtn}>
            Member workspace
            <ArrowRight className="h-4 w-4 shrink-0" aria-hidden />
          </Link>
        }
      />

      <AdminCoachingShortcutNav currentPath={pathname} />

      <div
        className="grid gap-4 md:grid-cols-2 lg:hidden"
        data-testid="admin-coaching-chapters-grid"
      >
        {COACHING_CHAPTERS.map((c) => (
          <article key={c.slug} className={`${adminCoachingInset} flex flex-col gap-4`}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="text-lg font-semibold text-white">{c.title}</h2>
                <p className="mt-1 font-mono text-xs text-slate-500">{c.slug}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {c.isDemo ? (
                  <AdminCoachingStatusPill tone="warn">Demo</AdminCoachingStatusPill>
                ) : null}
                <AdminCoachingStatusPill tone={c.allowCheckout ? 'good' : 'neutral'}>
                  {c.allowCheckout ? 'Checkout live' : 'Checkout off'}
                </AdminCoachingStatusPill>
              </div>
            </div>
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className={adminCoachingLabel}>
                  <UsersRound className="mr-1 inline h-3.5 w-3.5 align-text-bottom" aria-hidden />
                  Coach
                </dt>
                <dd className="mt-1 text-white">{c.coachDisplayName}</dd>
                <dd className="font-mono text-xs text-slate-500">{c.coachUserId}</dd>
              </div>
              <div>
                <dt className={adminCoachingLabel}>
                  <CircleDollarSign
                    className="mr-1 inline h-3.5 w-3.5 align-text-bottom"
                    aria-hidden
                  />
                  Price
                </dt>
                <dd className="mt-1 text-white">{formatChapterPriceLabel(c)}</dd>
                <dd className="text-xs text-slate-500">{c.currency}</dd>
              </div>
            </dl>
            <p className="text-sm leading-relaxed text-slate-400">{c.headline}</p>
          </article>
        ))}
      </div>

      <div className={`${adminCoachingSurface} hidden overflow-x-auto p-0 lg:block`}>
        <table className="w-full min-w-[640px]" data-testid="admin-coaching-chapters-table">
          <caption className="sr-only">Coach chapter registry</caption>
          <thead>
            <tr className="border-b border-white/10 text-left">
              <th className="px-4 py-3 text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
                Chapter
              </th>
              <th className="px-4 py-3 text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
                Coach
              </th>
              <th className="px-4 py-3 text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
                Price
              </th>
              <th className="px-4 py-3 text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
                Checkout
              </th>
            </tr>
          </thead>
          <tbody>
            {COACHING_CHAPTERS.map((c) => (
              <tr key={c.slug} className="border-b border-white/5 last:border-0">
                <td className="px-4 py-3 text-sm">
                  <p className="font-medium text-white">{c.title}</p>
                  <p className="font-mono text-xs text-slate-500">{c.slug}</p>
                </td>
                <td className="px-4 py-3 text-sm text-slate-300">
                  {c.coachDisplayName}
                  <p className="font-mono text-xs text-slate-500">{c.coachUserId}</p>
                </td>
                <td className="px-4 py-3 text-sm text-slate-300">
                  {formatChapterPriceLabel(c)} · {c.currency}
                </td>
                <td className="px-4 py-3 text-sm text-slate-300">
                  {c.allowCheckout ? 'Global AUD checkout' : 'Disabled (demo)'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AdminCoachingSection
        title="Round 2 defaults (engineering)"
        description="Founder can override — these keep product copy consistent until Round 2 is locked."
        testId="admin-coaching-round2"
      >
        <div className="flex gap-3 rounded-xl border border-white/[0.06] bg-[#0a101c]/60 p-4">
          <Globe2 className="mt-0.5 h-5 w-5 shrink-0 text-sky-400/80" aria-hidden />
          <div className="min-w-0 space-y-3 text-sm text-slate-300">
            <p>{COACHING_RECORDS_DEFAULT.systemOfRecord}</p>
            <ul className="list-disc space-y-1.5 pl-5 text-slate-400">
              <li>{COACHING_OFFER_CADENCE_DEFAULT.monthlySessionMinimum}</li>
              <li>{COACHING_OFFER_CADENCE_DEFAULT.asyncChannel}</li>
              <li>{COACHING_OFFER_CADENCE_DEFAULT.planRefresh}</li>
            </ul>
          </div>
        </div>
      </AdminCoachingSection>
    </div>
  );
}
