'use client';

import Link from 'next/link';

import {
  COACHING_OFFER_CADENCE_DEFAULT,
  COACHING_RECORDS_DEFAULT,
} from '@/lib/coaching-portal/coaching-ai-governance';
import {
  COACHING_CHAPTERS,
  formatChapterPriceLabel,
} from '@/lib/coaching-portal/coaching-chapters';

const surface =
  'rounded-2xl border border-white/10 bg-white/[0.04] shadow-[0_1px_0_rgba(255,255,255,0.04)_inset]';
const th = 'px-4 py-3 text-left text-xs font-semibold tracking-wide text-white/45 uppercase';
const td = 'px-4 py-3 text-sm text-white/80';

export function AdminCoachingChaptersClient() {
  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6 text-white">
      <header>
        <p className="text-xs font-semibold tracking-[0.2em] text-sky-400/90 uppercase">
          Coaching admin
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Coach chapters</h1>
        <p className="mt-2 max-w-2xl text-sm text-white/55">
          GP-632 registry — currency, pricing labels, and checkout eligibility. Assign members on{' '}
          <Link
            href="/admin/coaching-members"
            className="text-sky-300 underline underline-offset-2"
          >
            Coaching members
          </Link>
          .
        </p>
      </header>

      <div className={`${surface} overflow-x-auto`}>
        <table className="w-full min-w-[640px]" data-testid="admin-coaching-chapters-table">
          <thead>
            <tr className="border-b border-white/10">
              <th className={th}>Chapter</th>
              <th className={th}>Coach</th>
              <th className={th}>Price</th>
              <th className={th}>Checkout</th>
            </tr>
          </thead>
          <tbody>
            {COACHING_CHAPTERS.map((c) => (
              <tr key={c.slug} className="border-b border-white/5 last:border-0">
                <td className={td}>
                  <p className="font-medium text-white">{c.title}</p>
                  <p className="font-mono text-xs text-white/45">{c.slug}</p>
                </td>
                <td className={td}>
                  {c.coachDisplayName}
                  <p className="font-mono text-xs text-white/45">{c.coachUserId}</p>
                </td>
                <td className={td}>
                  {formatChapterPriceLabel(c)} · {c.currency}
                </td>
                <td className={td}>
                  {c.allowCheckout ? 'Live (AUD global checkout)' : 'Disabled (demo)'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section className={`${surface} space-y-3 p-5 text-sm text-white/75`}>
        <h2 className="text-lg font-semibold text-white">Round 2 defaults (engineering)</h2>
        <p>{COACHING_RECORDS_DEFAULT.systemOfRecord}</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>{COACHING_OFFER_CADENCE_DEFAULT.monthlySessionMinimum}</li>
          <li>{COACHING_OFFER_CADENCE_DEFAULT.asyncChannel}</li>
          <li>{COACHING_OFFER_CADENCE_DEFAULT.planRefresh}</li>
        </ul>
      </section>
    </div>
  );
}
