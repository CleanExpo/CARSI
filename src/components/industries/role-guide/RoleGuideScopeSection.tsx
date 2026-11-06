import Image from 'next/image';
import Link from 'next/link';

import {
  LANDING_DISPLAY_H2_CLASS,
  LANDING_EYEBROW_CLASS,
  LANDING_LEAD_CLASS,
  PUBLIC_SHELL_INNER_CLASS,
} from '@/components/landing/public-shell-width';
import type { AuthorityHeroImage } from '@/lib/marketing/authority-pages';

interface RoleGuideScopeSectionProps {
  scopeNote: string;
  livePageHref: string;
  livePageLabel: string;
  heroImage: AuthorityHeroImage | null;
}

export function RoleGuideScopeSection({
  scopeNote,
  livePageHref,
  livePageLabel,
  heroImage,
}: RoleGuideScopeSectionProps) {
  return (
    <section className="border-t border-slate-200/70 bg-[#fafbfc]">
      {heroImage ? (
        <div className="relative h-44 overflow-hidden md:h-52 lg:h-56">
          <Image
            src={heroImage.src}
            alt=""
            fill
            sizes="100vw"
            loading="lazy"
            className="size-full object-cover object-center"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#fafbfc] via-[#fafbfc]/40 to-transparent"
            aria-hidden
          />
        </div>
      ) : null}

      <div
        className={`${PUBLIC_SHELL_INNER_CLASS} ${heroImage ? 'relative -mt-8 pb-16 md:-mt-10 md:pb-20' : 'py-16 md:py-20'}`}
      >
        <div className="max-w-3xl rounded-2xl border border-slate-200/80 bg-white p-8 shadow-sm md:p-10">
          <p className={LANDING_EYEBROW_CLASS}>What CARSI does and does not claim</p>
          <h2 className={`mt-3 ${LANDING_DISPLAY_H2_CLASS}`}>Read this first</h2>
          <p className={`mt-4 ${LANDING_LEAD_CLASS}`}>{scopeNote}</p>
          <p className="mt-6 text-sm text-slate-600">
            <Link
              href={livePageHref}
              className="font-semibold text-[#146fc2] underline-offset-4 hover:underline"
            >
              {livePageLabel}
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}
