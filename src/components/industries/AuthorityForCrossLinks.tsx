import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

import {
  LANDING_DISPLAY_H2_CLASS,
  LANDING_EYEBROW_CLASS,
  LANDING_LEAD_CLASS,
  PUBLIC_SHELL_INNER_CLASS,
} from '@/components/landing/public-shell-width';
import { authorityForNavItems, type AuthorityForNavItem } from '@/lib/marketing/authority-for-nav';
import type { AuthorityPageEntry } from '@/lib/marketing/authority-pages';
import { ROLE_GUIDES_HUB_PATH } from '@/lib/marketing/role-guides-path';

interface AuthorityForCrossLinksProps {
  currentSlug: AuthorityPageEntry['slug'];
}

export function AuthorityForCrossLinks({ currentSlug }: AuthorityForCrossLinksProps) {
  const links = authorityForNavItems.filter((item) => item.slug !== currentSlug);

  return (
    <section className="border-t border-slate-200/70 bg-[#fafbfc] py-16 md:py-24">
      <div className={PUBLIC_SHELL_INNER_CLASS}>
        <p className={LANDING_EYEBROW_CLASS}>Other roles</p>
        <h2 className={`mt-3 ${LANDING_DISPLAY_H2_CLASS}`}>Related training guides</h2>
        <p className={`mt-4 max-w-2xl ${LANDING_LEAD_CLASS}`}>
          Each guide links live courses and source-backed context for a different job on site. Pick
          the audience that matches your team.
        </p>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {links.map((item) => (
            <AuthorityForCard key={item.slug} item={item} />
          ))}
        </div>
        <p className="mt-10 text-sm text-slate-600">
          <Link
            href={ROLE_GUIDES_HUB_PATH}
            className="font-semibold text-[#146fc2] underline-offset-4 hover:underline"
          >
            View all role guides
          </Link>
        </p>
      </div>
    </section>
  );
}

function AuthorityForCard({ item }: { item: AuthorityForNavItem }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm transition hover:border-[#2490ed]/35 hover:shadow-[0_18px_40px_-24px_rgba(20,111,194,0.35)]"
    >
      {item.heroImage ? (
        <div className="relative aspect-[2/1] overflow-hidden bg-slate-100">
          {/* eslint-disable-next-line @next/next/no-img-element -- native img in a fixed-aspect box (GP-661 layout); next/image conversion is a GP-696 follow-up */}
          <img
            src={item.heroImage.src}
            alt={item.heroImage.alt}
            width={512}
            height={512}
            loading="lazy"
            decoding="async"
            className="size-full object-cover object-center"
          />
        </div>
      ) : (
        <div className="flex aspect-[2/1] items-center justify-center bg-[#eef4fb]">
          <Icon className="h-8 w-8 text-[#146fc2]/50" aria-hidden />
        </div>
      )}
      <div className="flex flex-1 flex-col p-6">
        <Icon className="h-5 w-5 text-[#146fc2]" aria-hidden />
        <p className="mt-4 text-[10px] font-semibold tracking-[0.14em] text-[#146fc2] uppercase">
          Role guide
        </p>
        <p className="mt-1 font-[family-name:var(--font-display)] text-lg font-semibold text-slate-950 group-hover:text-[#146fc2]">
          {item.audience}
        </p>
        <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-500">{item.summary}</p>
        <span className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-[#146fc2]">
          Open guide
          <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" aria-hidden />
        </span>
      </div>
    </Link>
  );
}
