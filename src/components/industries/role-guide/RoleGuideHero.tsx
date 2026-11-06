import type { LucideIcon } from 'lucide-react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

import {
  LANDING_EYEBROW_CLASS,
  LANDING_LEAD_CLASS,
  PUBLIC_SHELL_INNER_CLASS,
} from '@/components/landing/public-shell-width';
import type { AuthorityHeroImage } from '@/lib/marketing/authority-pages';
import { ROLE_GUIDES_HUB_PATH } from '@/lib/marketing/role-guides-path';

interface RoleGuideHeroProps {
  icon: LucideIcon;
  audience: string;
  headline: string;
  headlineAccent: string;
  description: string;
  topics: string[];
  heroImage: AuthorityHeroImage | null;
  stats: { value: string; label: string }[];
  sourcesUpdatedLabel: string;
  approvalLabel?: string;
}

export function RoleGuideHero({
  icon: Icon,
  audience,
  headline,
  headlineAccent,
  description,
  topics,
  heroImage,
  stats,
  sourcesUpdatedLabel,
  approvalLabel,
}: RoleGuideHeroProps) {
  return (
    <section className="relative overflow-hidden border-b border-slate-200/80 bg-[#fafbfc]">
      <div
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(165deg,rgba(36,144,237,0.06)_0%,transparent_42%)]"
        aria-hidden
      />
      <div className={`relative ${PUBLIC_SHELL_INNER_CLASS} py-10 md:py-14 lg:py-16`}>
        <Link
          href={ROLE_GUIDES_HUB_PATH}
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#146fc2] hover:underline"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          All role guides
        </Link>

        <div className="mt-8 grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_min(100%,340px)] lg:gap-14 xl:grid-cols-[minmax(0,1fr)_380px]">
          <div className="min-w-0">
            <p className={`${LANDING_EYEBROW_CLASS} inline-flex items-center gap-2`}>
              <Icon className="h-3.5 w-3.5" aria-hidden />
              {audience}
            </p>
            <h1 className="mt-3 max-w-2xl font-[family-name:var(--font-display)] text-[2.05rem] leading-[1.1] font-semibold tracking-[-0.03em] text-slate-950 md:text-[2.85rem] md:leading-[1.06]">
              {headline}{' '}
              <span className="text-[#146fc2]">{headlineAccent}</span>
            </h1>
            <p className={`mt-5 max-w-xl text-pretty ${LANDING_LEAD_CLASS}`}>{description}</p>

            <ul className="mt-6 flex flex-wrap gap-2" aria-label="Topics on this guide">
              {topics.map((label) => (
                <li key={label}>
                  <span className="rounded-full border border-slate-200/90 bg-white px-3 py-1 text-[11px] font-medium text-slate-600">
                    {label}
                  </span>
                </li>
              ))}
            </ul>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link
                href="#industry-courses"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#146fc2] px-7 text-sm font-semibold text-white shadow-[0_12px_32px_-14px_rgba(20,111,194,0.55)] hover:bg-[#0f5fa8]"
              >
                View recommended courses
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              <Link
                href="/contact"
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-slate-200 bg-white px-7 text-sm font-semibold text-slate-800 hover:border-[#2490ed]/35 hover:text-[#146fc2]"
              >
                Ask about team training
              </Link>
            </div>

            <dl className="mt-10 grid grid-cols-2 gap-x-6 gap-y-5 border-t border-slate-200/80 pt-8 sm:grid-cols-3">
              {stats.map((stat) => (
                <div key={stat.label}>
                  <dt className="text-[11px] font-medium tracking-wide text-slate-500 uppercase">
                    {stat.label}
                  </dt>
                  <dd className="mt-1 font-[family-name:var(--font-display)] text-xl font-semibold tabular-nums text-slate-950 md:text-2xl">
                    {stat.value}
                  </dd>
                </div>
              ))}
            </dl>

            <p className="mt-6 text-xs leading-relaxed text-slate-500">
              Primary sources last opened {sourcesUpdatedLabel}.
              {approvalLabel ? ` ${approvalLabel}` : ''}
            </p>
          </div>

          {heroImage ? (
            <aside className="mx-auto w-full max-w-[280px] sm:max-w-[320px] lg:mx-0 lg:w-full lg:max-w-none">
              <figure>
                <div className="relative aspect-square w-full overflow-hidden rounded-[1.35rem] bg-slate-200/80 shadow-[0_28px_56px_-36px_rgba(15,23,42,0.45)] ring-1 ring-slate-900/[0.06]">
                  <Image
                    src={heroImage.src}
                    alt={heroImage.alt}
                    fill
                    sizes="(min-width: 1024px) 40vw, 320px"
                    loading="eager"
                    className="size-full object-cover object-center"
                  />
                </div>
                <figcaption className="mt-3 text-xs leading-relaxed text-slate-500">
                  {heroImage.alt}
                </figcaption>
              </figure>
            </aside>
          ) : null}
        </div>
      </div>
    </section>
  );
}
