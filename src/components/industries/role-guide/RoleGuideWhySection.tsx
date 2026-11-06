import Image from 'next/image';
import type { LucideIcon } from 'lucide-react';

import {
  LANDING_DISPLAY_H2_CLASS,
  LANDING_EYEBROW_CLASS,
  LANDING_LEAD_CLASS,
  PUBLIC_SHELL_INNER_CLASS,
} from '@/components/landing/public-shell-width';
import type { AuthorityHeroImage } from '@/lib/marketing/authority-pages';

interface WhyCard {
  icon: LucideIcon;
  title: string;
  description: string;
}

interface RoleGuideWhySectionProps {
  industryName: string;
  headline: string;
  headlineAccent: string;
  heroImage: AuthorityHeroImage | null;
  cards: WhyCard[];
}

export function RoleGuideWhySection({
  industryName,
  headline,
  headlineAccent,
  heroImage,
  cards,
}: RoleGuideWhySectionProps) {
  return (
    <section className="border-t border-slate-200/70 bg-white py-16 md:py-24">
      <div
        className={`${PUBLIC_SHELL_INNER_CLASS} grid gap-12 ${heroImage ? 'lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:gap-16' : ''}`}
      >
        {heroImage ? (
          <div className="lg:sticky lg:top-24 lg:self-start">
            <figure>
              <div className="relative aspect-[4/5] w-full max-w-md overflow-hidden rounded-2xl bg-slate-100 shadow-[0_24px_48px_-32px_rgba(15,23,42,0.35)] ring-1 ring-slate-900/[0.06] lg:max-w-none">
                <Image
                  src={heroImage.src}
                  alt=""
                  fill
                  sizes="(min-width: 1024px) 40vw, 448px"
                  loading="lazy"
                  className="size-full object-cover object-[center_35%]"
                  aria-hidden
                />
              </div>
              <figcaption className="sr-only">{heroImage.alt}</figcaption>
            </figure>
            <p className="mt-4 max-w-md text-xs leading-relaxed text-slate-500">{heroImage.alt}</p>
          </div>
        ) : null}

        <div className="min-w-0">
          <p className={LANDING_EYEBROW_CLASS}>Why {industryName} choose CARSI</p>
          <h2 className={`mt-3 max-w-xl ${LANDING_DISPLAY_H2_CLASS}`}>
            {headline} <span className="text-[#146fc2]">{headlineAccent}</span>
          </h2>
          <p className={`mt-4 max-w-xl ${LANDING_LEAD_CLASS}`}>
            Training organised around the constraints technicians meet on site, with a clear path
            from task to course.
          </p>

          <ol className="mt-10 space-y-0">
            {cards.map((card, i) => (
              <li
                key={card.title}
                className="border-t border-slate-200/80 py-8 first:border-t-0 first:pt-0"
              >
                <div className="flex gap-5">
                  <p
                    className="font-[family-name:var(--font-display)] text-3xl leading-none font-semibold text-slate-200 tabular-nums"
                    aria-hidden
                  >
                    {String(i + 1).padStart(2, '0')}
                  </p>
                  <div className="min-w-0 flex-1">
                    <card.icon className="h-5 w-5 text-[#146fc2]" aria-hidden />
                    <h3 className="mt-3 font-[family-name:var(--font-display)] text-lg font-semibold text-slate-950">
                      {card.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">
                      {card.description}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
