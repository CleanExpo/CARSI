import {
  Building2,
  ClipboardCheck,
  Droplets,
  HardHat,
  House,
  Shield,
  SprayCan,
  Stethoscope,
  Wind,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';

import {
  IndustryCTA,
  IndustryCourseSection,
  IndustryEvidenceLinks,
  IndustryFAQSection,
  IndustryPageLayout,
} from '@/components/industries';
import { AuthorityForCrossLinks } from '@/components/industries/AuthorityForCrossLinks';
import { RoleGuideHero } from '@/components/industries/role-guide/RoleGuideHero';
import { RoleGuideScopeSection } from '@/components/industries/role-guide/RoleGuideScopeSection';
import { RoleGuideWhySection } from '@/components/industries/role-guide/RoleGuideWhySection';
import {
  LANDING_DISPLAY_H2_CLASS,
  LANDING_EYEBROW_CLASS,
  LANDING_LEAD_CLASS,
  PUBLIC_SHELL_INNER_CLASS,
} from '@/components/landing/public-shell-width';
import {
  BreadcrumbSchema,
  FAQSchema,
  ItemListSchema,
  WebPageSchema,
} from '@/components/seo/JsonLd';
import { getPublicSiteUrl } from '@/lib/env/public-url';
import { catalogueCourseTitle } from '@/lib/marketing/authority-catalogue-titles';
import {
  authorityPageLatestVerified,
  formatAuthorityAuDate,
} from '@/lib/marketing/authority-for-nav';
import {
  isAuthorityPagePublishable,
  type AuthorityCardIcon,
  type AuthorityIcon,
  type AuthorityPageEntry,
} from '@/lib/marketing/authority-pages';
import { ROLE_GUIDES_HUB_PATH, roleGuidePagePath } from '@/lib/marketing/role-guides-path';
import type { IndustryCourseItem } from '@/lib/server/industry-courses';

const ACCENT = '#146fc2';

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
  return formatAuthorityAuDate(iso);
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
  const siteUrl = getPublicSiteUrl();
  const pageUrl = `${siteUrl}${roleGuidePagePath(entry.slug)}`;
  const publishable = isAuthorityPagePublishable(entry, new Set(courses.map((c) => c.slug)));
  const sourcesUpdated = authorityPageLatestVerified(entry);
  const featuredCourse = courses[0];
  const awaitingSlugs = entry.bundle.awaitingCatalogueSlugs;
  const evidence = entry.claims.map((claim) => ({
    title: claim.sourceTitle,
    publisher: claim.publisher,
    context: `${claim.text} Source opened ${auDate(claim.lastVerified)}.`,
    href: claim.sourceUrl,
  }));

  return (
    <IndustryPageLayout>
      <WebPageSchema
        name={entry.title}
        description={entry.metaDescription}
        url={pageUrl}
        dateModified={sourcesUpdated}
      />
      <BreadcrumbSchema
        items={[
          { name: 'Home', url: siteUrl },
          { name: 'Role guides', url: `${siteUrl}${ROLE_GUIDES_HUB_PATH}` },
          { name: entry.audience, url: pageUrl },
        ]}
      />
      <FAQSchema questions={entry.faqs} />
      {courses.length > 0 ? (
        <ItemListSchema
          name={`Live courses for ${entry.shortAudience}`}
          description="Published CARSI courses linked from this role guide."
          itemType="Course"
          items={courses.map((course) => ({
            name: course.title,
            url: `${siteUrl}/courses/${course.slug}`,
            description: course.short_description ?? course.title,
            price: course.is_free ? 0 : Number(course.price_aud),
            isFree: course.is_free,
          }))}
        />
      ) : null}

      {!publishable && (
        <div
          role="status"
          className="border-b border-amber-300/80 bg-gradient-to-r from-amber-50 to-amber-100/90 py-3.5 text-center text-sm text-amber-950 shadow-sm"
        >
          <div className={`${PUBLIC_SHELL_INNER_CLASS} font-medium`}>
            Preview page — sources and courses are real, but this guide is not listed in search yet.
            It goes live once approval, hero imagery and every linked course are confirmed on the
            catalogue.
          </div>
        </div>
      )}

      <RoleGuideHero
        icon={HERO_ICONS[entry.icon]}
        audience={entry.audience}
        headline={entry.headline}
        headlineAccent={entry.headlineAccent}
        description={entry.description}
        topics={entry.topics}
        heroImage={entry.heroImage}
        stats={[
          { value: String(courses.length), label: 'Live courses linked below' },
          { value: String(entry.claims.length), label: 'Sourced rules and facts' },
          { value: 'IICRC CEC', label: 'On approved courses only' },
        ]}
        sourcesUpdatedLabel={auDate(sourcesUpdated)}
        approvalLabel={
          entry.approvedAt ? `Approval record dated ${auDate(entry.approvedAt)}.` : undefined
        }
      />

      <RoleGuideWhySection
        industryName={entry.shortAudience}
        headline="Built around the"
        headlineAccent="work you do"
        heroImage={entry.heroImage}
        cards={entry.whyCards.map((card) => ({
          icon: CARD_ICONS[card.icon],
          title: card.title,
          description: card.description,
        }))}
      />

      <IndustryEvidenceLinks links={evidence} presentation="role-guide" />

      <RoleGuideScopeSection
        scopeNote={entry.scopeNote}
        livePageHref={entry.livePageHref}
        livePageLabel={entry.livePageLabel}
        heroImage={entry.heroImage}
      />

      <IndustryCourseSection
        industryName={entry.shortAudience}
        disciplineList="Live courses"
        courses={courses}
        emptyLiveCoursesNote={
          publishable && courses.length === 0
            ? 'This page is approved, but no published courses match its bundle yet. The grid will fill in automatically once those slugs are live in the catalogue.'
            : courses.length < entry.bundle.publishedSlugs.length
              ? `${entry.bundle.publishedSlugs.length - courses.length} course(s) in this bundle are not published on the catalogue yet. Only live courses are shown below.`
              : undefined
        }
      />

      {awaitingSlugs.length > 0 ? (
        <section className="border-t border-slate-200/70 bg-[#fafbfc] py-12 md:py-16">
          <div className={PUBLIC_SHELL_INNER_CLASS}>
            <p className={LANDING_EYEBROW_CLASS}>Catalogue catch-up</p>
            <h2 className={`mt-3 max-w-2xl text-xl font-semibold text-slate-950 md:text-2xl`}>
              Named on this guide — added to the grid when live
            </h2>
            <p className={`mt-4 max-w-2xl ${LANDING_LEAD_CLASS}`}>
              These courses are in the CARSI seed catalogue but may not be on the live site yet.
              They do not block publication of this guide; cards appear automatically once the
              course page is published.
            </p>
            <ul className="mt-8 space-y-3">
              {awaitingSlugs.map((slug) => (
                <li key={slug}>
                  <Link
                    href={`/courses/${slug}`}
                    className="flex flex-col rounded-2xl border border-slate-200/80 bg-white px-5 py-4 transition hover:border-[#146fc2]/35 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <span className="font-medium text-slate-900">{catalogueCourseTitle(slug)}</span>
                    <span className="mt-1 text-sm text-slate-500 sm:mt-0">
                      Opens when published on carsi.com.au
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

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

      <AuthorityForCrossLinks currentSlug={entry.slug} />

      <IndustryCTA
        subtitle={entry.audience}
        title="Talk to CARSI about"
        price="your team"
        description="Ask about the live courses, team seats, or the modules being built."
        ctaText="Talk to CARSI"
        ctaHref="/contact"
        secondaryHref={featuredCourse ? `/courses/${featuredCourse.slug}` : '/courses'}
        secondaryText={featuredCourse ? 'Open a recommended course' : 'Browse all courses'}
        accentColor={ACCENT}
      />
    </IndustryPageLayout>
  );
}
