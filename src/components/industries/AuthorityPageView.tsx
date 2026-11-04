import {
  Building2,
  ClipboardCheck,
  Droplets,
  HardHat,
  House,
  type LucideIcon,
  Shield,
  SprayCan,
  Stethoscope,
  Wind,
} from 'lucide-react';
import Image from 'next/image';

import {
  IndustryCTA,
  IndustryCourseSection,
  IndustryEvidenceLinks,
  IndustryFAQSection,
  IndustryHero,
  IndustryPageLayout,
  IndustryWhySection,
} from '@/components/industries';
import {
  LANDING_DISPLAY_H2_CLASS,
  LANDING_EYEBROW_CLASS,
  LANDING_LEAD_CLASS,
  PUBLIC_SHELL_INNER_CLASS,
} from '@/components/landing/public-shell-width';
import { FAQSchema } from '@/components/seo/JsonLd';
import {
  isAuthorityPagePublishable,
  type AuthorityCardIcon,
  type AuthorityIcon,
  type AuthorityPageEntry,
} from '@/lib/marketing/authority-pages';
import type { IndustryCourseItem } from '@/lib/server/industry-courses';

const ACCENT = '#146fc2';
const CHIP_COLOURS = ['#146fc2', '#0f5fa8', '#2490ed', '#0b4a82'];

const HERO_ICONS: Record<AuthorityIcon, LucideIcon> = {
  hardhat: HardHat,
  clipboard: ClipboardCheck,
  building: Building2,
  stethoscope: Stethoscope,
  home: House,
  spray: SprayCan,
};

const CARD_ICONS: Record<AuthorityCardIcon, LucideIcon> = {
  shield: Shield,
  droplets: Droplets,
  wind: Wind,
  clipboard: ClipboardCheck,
};

/** 2026-10-20 -> 20/10/2026 (Australian date order). */
function auDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

/**
 * One layout for all six /for/<industry> pages, composed from the existing industry components.
 * `courses` is the published bundle as read from the database (see AuthorityPage). The course
 * grid, the live-course count and the draft banner all come from that one list.
 */
export function AuthorityPageView({
  entry,
  courses,
}: {
  entry: AuthorityPageEntry;
  courses: IndustryCourseItem[];
}) {
  const publishable = isAuthorityPagePublishable(entry, new Set(courses.map((c) => c.slug)));
  const evidence = entry.claims.map((claim) => ({
    title: claim.sourceTitle,
    publisher: claim.publisher,
    context: `${claim.text} Source opened ${auDate(claim.lastVerified)}.`,
    href: claim.sourceUrl,
  }));

  return (
    <IndustryPageLayout>
      <FAQSchema questions={entry.faqs} />

      {!publishable && (
        <div className="border-b border-amber-200 bg-amber-50 py-3 text-center text-sm text-amber-900">
          <div className={PUBLIC_SHELL_INNER_CLASS}>
            Draft page. Not yet cleared for publication and hidden from search engines.
          </div>
        </div>
      )}

      <IndustryHero
        icon={HERO_ICONS[entry.icon]}
        industryName={entry.audience}
        accentColor={ACCENT}
        headline={entry.headline}
        headlineAccent={entry.headlineAccent}
        description={entry.description}
        disciplines={entry.topics.map((label, i) => ({
          label,
          color: CHIP_COLOURS[i % CHIP_COLOURS.length],
        }))}
        stats={[
          { value: String(courses.length), label: 'Live courses linked below' },
          { value: String(entry.claims.length), label: 'Sourced rules and facts' },
          { value: 'IICRC CEC', label: 'Shown only on courses with an approval in force' },
        ]}
      />

      {entry.heroImage && (
        <div className={`${PUBLIC_SHELL_INNER_CLASS} pt-10`}>
          <Image
            src={entry.heroImage.src}
            alt={entry.heroImage.alt}
            width={1600}
            height={900}
            priority
            className="h-auto w-full rounded-3xl border border-slate-200/70 object-cover"
          />
        </div>
      )}

      <IndustryWhySection
        industryName={entry.shortAudience}
        headline="Built around the"
        headlineAccent="work you do"
        accentColor={ACCENT}
        cards={entry.whyCards.map((card, i) => ({
          icon: CARD_ICONS[card.icon],
          title: card.title,
          description: card.description,
          color: CHIP_COLOURS[i % CHIP_COLOURS.length],
        }))}
      />

      <IndustryEvidenceLinks links={evidence} />

      <section className="border-t border-slate-200/70 bg-[#fafbfc] py-16 md:py-20">
        <div className={PUBLIC_SHELL_INNER_CLASS}>
          <p className={LANDING_EYEBROW_CLASS}>What CARSI does and does not claim</p>
          <h2 className={`mt-3 max-w-2xl ${LANDING_DISPLAY_H2_CLASS}`}>Read this first</h2>
          <p className={`mt-4 max-w-3xl ${LANDING_LEAD_CLASS}`}>{entry.scopeNote}</p>
        </div>
      </section>

      <IndustryCourseSection
        industryName={entry.shortAudience}
        disciplineList="Live courses"
        courses={courses}
      />

      {entry.bundle.plannedModules.length > 0 && (
        <section className="border-t border-slate-200/70 bg-white py-16 md:py-20">
          <div className={PUBLIC_SHELL_INNER_CLASS}>
            <p className={LANDING_EYEBROW_CLASS}>Being built</p>
            <h2 className={`mt-3 max-w-2xl ${LANDING_DISPLAY_H2_CLASS}`}>
              Modules written for this audience
            </h2>
            <p className={`mt-4 max-w-2xl ${LANDING_LEAD_CLASS}`}>
              These are not available yet and cannot be bought. They are listed so you can see what
              is coming.
            </p>
            <ul className="mt-10 grid gap-4 md:grid-cols-2">
              {entry.bundle.plannedModules.map((module) => (
                <li
                  key={module.title}
                  className="rounded-2xl border border-slate-200/80 bg-[#fafbfc] p-6"
                >
                  <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
                    Being built
                    {module.minutes ? `, about ${module.minutes} minutes` : ''}
                  </p>
                  <p className="mt-2 text-lg font-semibold text-slate-900">{module.title}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <IndustryFAQSection industryName={entry.audience} faqs={entry.faqs} />

      <IndustryCTA
        subtitle={entry.audience}
        title="Talk to CARSI about"
        price="your team"
        description="Ask about the live courses, team seats, or the modules being built."
        ctaText="Talk to CARSI"
        ctaHref="/contact"
        secondaryHref={entry.livePageHref}
        secondaryText={entry.livePageLabel}
        accentColor={ACCENT}
      />
    </IndustryPageLayout>
  );
}
