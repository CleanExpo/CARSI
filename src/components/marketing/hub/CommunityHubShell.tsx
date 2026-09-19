'use client';

import Link from 'next/link';

import { HomeFinalCtaSection } from '@/components/landing/HomeFinalCtaSection';
import { HomeTrustStrip } from '@/components/landing/HomeTrustStrip';
import {
  LANDING_EYEBROW_CLASS,
  LANDING_LEAD_CLASS,
  PUBLIC_SHELL_INNER_CLASS,
} from '@/components/landing/public-shell-width';
import { COMMUNITY_NAV } from '@/components/marketing/hub/community-nav';

export { COMMUNITY_NAV };

export const COMMUNITY_CARD_CLASS =
  'rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm transition hover:border-[#2490ed]/35 hover:shadow-[0_18px_40px_-24px_rgba(20,111,194,0.35)]';

export function CommunityHubShell({
  eyebrow,
  title,
  description,
  stats,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  stats?: { value: string; label: string }[];
  children: React.ReactNode;
}) {
  return (
    <>
      <section className="relative overflow-hidden border-b border-slate-200/70 bg-white">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_55%_at_20%_0%,rgba(36,144,237,0.11),transparent_58%)]"
          aria-hidden
        />
        <div className={`relative ${PUBLIC_SHELL_INNER_CLASS} py-16 md:py-24`}>
          <p className={LANDING_EYEBROW_CLASS}>{eyebrow}</p>
          <h1 className="mt-3 max-w-3xl font-[family-name:var(--font-display)] text-[2.15rem] leading-[1.1] font-semibold tracking-[-0.02em] text-slate-950 md:text-[3.1rem] md:leading-[1.06]">
            {title}
          </h1>
          <p className={`mt-5 max-w-2xl text-pretty ${LANDING_LEAD_CLASS}`}>{description}</p>
          <nav className="mt-8 flex flex-wrap gap-2" aria-label="Community and resources">
            {COMMUNITY_NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-medium text-slate-600 transition hover:border-[#2490ed]/40 hover:text-[#146fc2]"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </section>

      {stats && stats.length > 0 ? <HomeTrustStrip stats={stats} /> : null}

      <section className="border-t border-slate-200/70 bg-[#fafbfc] py-16 md:py-24">
        <div className={PUBLIC_SHELL_INNER_CLASS}>{children}</div>
      </section>

      <HomeFinalCtaSection />
    </>
  );
}
