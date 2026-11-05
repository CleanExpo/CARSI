import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

import {
  LANDING_DISPLAY_H2_CLASS,
  LANDING_EYEBROW_CLASS,
  LANDING_LEAD_CLASS,
  PUBLIC_SHELL_INNER_CLASS,
} from '@/components/landing/public-shell-width';
import { PlatformNav } from '@/components/marketing/PlatformNav';
import { authorityForNavItems } from '@/lib/marketing/authority-for-nav';
import { platformSurfaceByHref } from '@/lib/marketing/platform-surface';
import { ROLE_GUIDES_HUB_PATH } from '@/lib/marketing/role-guides-path';

export function RoleGuidesHubHero() {
  const surface = platformSurfaceByHref(ROLE_GUIDES_HUB_PATH);
  if (!surface) throw new Error('platform-surface: missing role guides hub');

  return (
    <section className="relative overflow-hidden border-b border-slate-200/80 bg-[#fafbfc]">
      <div
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(165deg,rgba(36,144,237,0.06)_0%,transparent_42%)]"
        aria-hidden
      />
      <div className={`relative ${PUBLIC_SHELL_INNER_CLASS} py-10 md:py-14 lg:py-16`}>
        <p className={LANDING_EYEBROW_CLASS}>{surface.eyebrow}</p>
        <div className="mt-6 max-w-3xl">
          <h1 className="font-[family-name:var(--font-display)] text-[2.05rem] leading-[1.1] font-semibold tracking-[-0.03em] text-slate-950 md:text-[2.85rem] md:leading-[1.06]">
            {surface.headline}
          </h1>
          <p className={`mt-5 text-pretty ${LANDING_LEAD_CLASS}`}>{surface.lead}</p>
          <p className="mt-4 text-sm leading-relaxed text-slate-600">{surface.summary}</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link
              href="/authority"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#146fc2] px-7 text-sm font-semibold text-white shadow-[0_12px_32px_-14px_rgba(20,111,194,0.55)] hover:bg-[#0f5fa8]"
            >
              Authority Hub
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            <Link
              href="/courses"
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-slate-200 bg-white px-7 text-sm font-semibold text-slate-800 hover:border-[#2490ed]/35 hover:text-[#146fc2]"
            >
              Browse courses
            </Link>
          </div>
        </div>

        <div className="mt-12 border-t border-slate-200/70 pt-8 lg:mt-14 [&_nav]:mt-0 [&_nav]:max-w-none [&_nav]:justify-start">
          <p className="mb-3 text-[10px] font-semibold tracking-[0.14em] text-slate-400 uppercase">
            CARSI platform
          </p>
          <PlatformNav current={ROLE_GUIDES_HUB_PATH} />
        </div>
      </div>
    </section>
  );
}

export function RoleGuidesHubGrid() {
  return (
    <section className="border-t border-slate-200/70 bg-white py-16 md:py-24">
      <div className={PUBLIC_SHELL_INNER_CLASS}>
        <p className={LANDING_EYEBROW_CLASS}>Six audiences</p>
        <h2 className={`mt-3 max-w-2xl ${LANDING_DISPLAY_H2_CLASS}`}>
          Pick the job title you hire for
        </h2>
        <p className={`mt-4 max-w-2xl ${LANDING_LEAD_CLASS}`}>
          Each guide links live courses, cites Australian primary sources, and states what CARSI
          does and does not claim for that role.
        </p>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {authorityForNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.slug}
                href={item.href}
                className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm transition hover:border-[#2490ed]/40 hover:shadow-[0_20px_44px_-28px_rgba(20,111,194,0.35)]"
              >
                <div className="relative aspect-[5/4] overflow-hidden bg-slate-100">
                  {item.heroImage ? (
                    <img
                      src={item.heroImage.src}
                      alt={item.heroImage.alt}
                      width={512}
                      height={512}
                      loading="lazy"
                      decoding="async"
                      className="size-full object-cover object-center transition duration-500 group-hover:scale-[1.03]"
                    />
                  ) : (
                    <div className="flex size-full items-center justify-center bg-[#eef4fb]">
                      <Icon className="h-10 w-10 text-[#146fc2]/40" aria-hidden />
                    </div>
                  )}
                  <div
                    className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/75 via-slate-950/25 to-transparent px-5 pt-16 pb-4"
                    aria-hidden
                  />
                  <span className="absolute bottom-4 left-5 rounded-full bg-white/95 px-2.5 py-0.5 text-[10px] font-semibold tracking-wide text-slate-700 uppercase ring-1 ring-white/80">
                    Role guide
                  </span>
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <Icon className="h-5 w-5 text-[#146fc2]" aria-hidden />
                  <p className="mt-3 font-[family-name:var(--font-display)] text-lg font-semibold text-slate-950 group-hover:text-[#146fc2]">
                    {item.audience}
                  </p>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-600">
                    {item.summary}
                  </p>
                  <span className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-[#146fc2]">
                    Open guide
                    <ArrowRight
                      className="h-4 w-4 transition group-hover:translate-x-0.5"
                      aria-hidden
                    />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
