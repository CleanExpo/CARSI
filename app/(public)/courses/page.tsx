import type { Metadata } from 'next';
import Link from 'next/link';
import { cache } from 'react';

import { HomeFaqSection } from '@/components/landing/HomeFaqSection';
import { HomeFinalCtaSection } from '@/components/landing/HomeFinalCtaSection';
import { HomeTrustStrip } from '@/components/landing/HomeTrustStrip';
import {
  LANDING_DISPLAY_H2_CLASS,
  LANDING_EYEBROW_CLASS,
  LANDING_LEAD_CLASS,
  PUBLIC_SHELL_INNER_CLASS,
} from '@/components/landing/public-shell-width';
import { BundlePricingCard } from '@/components/lms/BundlePricingCard';
import { CourseGrid } from '@/components/lms/CourseGrid';
import { IICRCDisciplineMap } from '@/components/lms/diagrams/IICRCDisciplineMap';
import { FAQSchema, ItemListSchema } from '@/components/seo';
import { INDIVIDUAL_TIERS } from '@/lib/lms/pricing-tiers';
import { selectCurrentCecCourses } from '@/lib/seed/cec-approvals';
import { catalogueFaqs } from '@/lib/seo/answer-engine';
import { hasPublicCoursePage } from '@/lib/seo/public-course-page';
import { CECCalculator } from '@/components/tools/CECCalculator';
import { resolveDisciplineParam } from '@/lib/catalogue/discipline-param';
import type { CourseListItem } from '@/lib/course-list-item';
import { getBackendOrigin, getPublicSiteUrl } from '@/lib/env/public-url';
import {
  coursesIndexMetaDescription,
  deriveCatalogueFactsFromCourseItems,
  formatCourseCountForCopy,
} from '@/lib/server/public-catalogue-facts';
import { getPublishedCourseListItemsFromDatabase } from '@/lib/server/public-courses-list';
import { subscriptionsEnabled } from '@/lib/server/subscriptions-flag';
import { ArrowRight, Compass } from 'lucide-react';

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const { items } = await getCoursesCached();
  const facts = deriveCatalogueFactsFromCourseItems(items);
  return {
    title: 'Restoration and Cleaning Courses',
    description: coursesIndexMetaDescription(facts),
    alternates: { canonical: '/courses' },
  };
}

interface SearchParams {
  category?: string;
  level?: string;
  discipline?: string | string[];
}

async function getBundles() {
  const backendUrl = getBackendOrigin();
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`${backendUrl}/api/lms/bundles`, {
      next: { revalidate: 60 },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (!res.ok) return [];
    const data = await res.json();
    return data.items ?? data ?? [];
  } catch {
    return [];
  }
}

async function getCoursesFromBackend() {
  const backendUrl = getBackendOrigin();
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`${backendUrl}/api/lms/courses`, {
      next: { revalidate: 60 },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (!res.ok) return { items: [], total: 0, available: false };
    const data = await res.json();
    const items: CourseListItem[] = data.items ?? [];
    return { items, total: data.total ?? 0, available: items.length > 0 };
  } catch {
    return { items: [], total: 0, available: false };
  }
}

async function getCourses() {
  if (process.env.DATABASE_URL?.trim()) {
    try {
      const items = await getPublishedCourseListItemsFromDatabase();
      if (items.length > 0) {
        return { items, total: items.length, available: true };
      }
    } catch (e) {
      console.error('[courses] Failed to load published courses from database', e);
    }
  }

  return getCoursesFromBackend();
}

const getCoursesCached = cache(getCourses);

function courseSchemaPrice(course: CourseListItem): number | undefined {
  if (course.is_free) return 0;
  const price = Number(course.price_aud);
  if (!Number.isFinite(price) || price < 0) return undefined;
  return price;
}

function dedupeCoursesBySlug(items: CourseListItem[]): CourseListItem[] {
  const seen = new Set<string>();
  return items.filter((course) => {
    const key = course.slug?.trim() || course.id;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export default async function CoursesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  // GP-592: map ?discipline= (topic label or legacy URL code) to a real topic tab.
  const disciplineTab = resolveDisciplineParam(sp.discipline);
  const [bundles, { items: courses, available }] = await Promise.all([
    getBundles(),
    getCoursesCached(),
  ]);
  const displayCourses = dedupeCoursesBySlug(courses);
  const displayTotal = displayCourses.length;
  const catalogueFacts = deriveCatalogueFactsFromCourseItems(displayCourses);
  const yearly = INDIVIDUAL_TIERS.find((t) => t.id === 'pro_annual');
  // Answers are computed from the same catalogue the page lists, the /pricing membership tier
  // and the CEC approvals registry (src/lib/seo/answer-engine.ts). One array feeds the visible
  // FAQ and the FAQPage JSON-LD.
  // A published catalogue is never legitimately empty: a failed or empty read means the catalogue
  // is unavailable, and then no part of the page states a count — not the hero, the stats, the
  // grid, the answers, or the ItemList / FAQPage schema.
  const catalogueAvailable = available && displayTotal > 0;
  // GP-639: the logged-out first screen sorts free courses first, so the hero gives buyers a
  // direct door to the approved CEC classes. The number is a public claim, so it comes from the
  // CEC approvals registry (the same count the FAQ states), never from a course's own hours field.
  const cecApprovedCount = selectCurrentCecCourses(
    displayCourses.filter(hasPublicCoursePage)
  ).length;
  const catalogueAnswers = catalogueFaqs({
    catalogueAvailable,
    publishedCourseCount: displayTotal,
    freeCourseCount: displayCourses.filter((c) => c.is_free || Number(c.price_aud) === 0).length,
    minPaidCoursePriceAud: catalogueFacts.minPaidCoursePriceAud,
    cecApprovedCount,
    membership: {
      priceAud: (yearly?.priceCents ?? 0) / 100,
      available: subscriptionsEnabled(),
      terms: yearly?.description ?? '',
    },
  });
  const siteUrl = getPublicSiteUrl();
  // Course-list markup names only URLs that render a course page (onboarding courses redirect).
  const courseListItems = displayCourses.filter(hasPublicCoursePage).map((course) => {
    const price = courseSchemaPrice(course);

    return {
      name: course.title,
      url: `${siteUrl}/courses/${course.slug}`,
      description:
        course.short_description ?? `${course.title} online restoration training course.`,
      price,
      duration: course.duration_hours,
      isFree: course.is_free === true || price === 0,
    };
  });

  const stats = [
    catalogueAvailable
      ? { value: formatCourseCountForCopy(displayTotal), label: 'Published courses' }
      : { value: 'Online', label: 'Self-paced study' },
    { value: '24/7', label: 'Study anytime' },
    { value: 'AUD', label: 'Priced for Australia' },
    { value: 'CEC', label: 'Hours only when approved' },
  ];

  return (
    <>
      {catalogueAvailable ? (
        <ItemListSchema
          name="CARSI restoration training courses"
          description={coursesIndexMetaDescription(catalogueFacts)}
          items={courseListItems}
          itemType="Course"
        />
      ) : null}

      <section className="relative overflow-hidden border-b border-slate-200/70 bg-white">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_55%_at_20%_0%,rgba(36,144,237,0.12),transparent_58%)]"
          aria-hidden
        />
        <div className={`relative ${PUBLIC_SHELL_INNER_CLASS} py-16 md:py-24`}>
          <p className={LANDING_EYEBROW_CLASS}>Course catalogue</p>
          <h1
            className={`mt-3 max-w-3xl font-[family-name:var(--font-display)] text-[2.15rem] leading-[1.1] font-semibold tracking-[-0.02em] text-slate-950 md:text-[3.1rem] md:leading-[1.06]`}
          >
            Restoration training you can start tonight
          </h1>
          <p className={`mt-5 max-w-2xl text-pretty ${LANDING_LEAD_CLASS}`}>
            {catalogueAvailable
              ? `${displayTotal} beginner, intermediate, and advanced course${displayTotal !== 1 ? 's' : ''}`
              : 'Beginner, intermediate, and advanced courses'}{' '}
            across water damage, carpet, structural drying, mould, fire and smoke, odour control and
            commercial cleaning — produced for Australian conditions, studied around the roster.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <a
              href="#catalogue"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#146fc2] px-7 text-sm font-semibold text-white shadow-[0_14px_40px_-16px_rgba(20,111,194,0.55)] transition hover:bg-[#0f5fa8] focus-visible:ring-2 focus-visible:ring-[#2490ed]/45 focus-visible:outline-none"
            >
              Browse the catalogue
              <ArrowRight className="h-4 w-4" aria-hidden />
            </a>
            <Link
              href="/pathways"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-slate-200/90 bg-white px-7 text-sm font-semibold text-slate-800 transition hover:border-[#2490ed]/40 hover:text-[#146fc2] focus-visible:ring-2 focus-visible:ring-[#2490ed]/35 focus-visible:outline-none"
            >
              <Compass className="h-4 w-4" aria-hidden />
              Guided pathway advisor
            </Link>
            {catalogueAvailable && cecApprovedCount > 0 ? (
              <Link
                href="/courses?discipline=iicrc-cec#catalogue"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-[#146fc2]/30 bg-white px-7 text-sm font-semibold text-[#146fc2] transition hover:border-[#146fc2]/60 focus-visible:ring-2 focus-visible:ring-[#2490ed]/35 focus-visible:outline-none"
              >
                {cecApprovedCount} IICRC CEC Accredited course{cecApprovedCount !== 1 ? 's' : ''}
              </Link>
            ) : null}
            <Link
              href="/pricing"
              className="inline-flex min-h-12 items-center justify-center text-sm font-semibold text-[#146fc2] underline-offset-4 hover:underline"
            >
              Membership covers every published course
            </Link>
          </div>

          <p className="mt-8 max-w-2xl rounded-2xl border border-[#f2cf8f]/80 bg-[#fff8ed] px-5 py-4 text-sm leading-relaxed text-[#7a3500]">
            CARSI courses carry CARSI Southern Hemisphere Restoration Designations. These are
            CARSI-issued credentials, not IICRC certifications. IICRC certification is obtained
            through schools and examinations approved by the IICRC.
          </p>
        </div>
      </section>

      <HomeTrustStrip stats={stats} />

      <section
        id="catalogue"
        className="relative border-t border-slate-200/70 bg-white py-16 md:py-24"
      >
        <div className={PUBLIC_SHELL_INNER_CLASS}>
          <div className="mb-10 max-w-2xl">
            <p className={LANDING_EYEBROW_CLASS}>All published courses</p>
            <h2 className={`mt-3 ${LANDING_DISPLAY_H2_CLASS}`}>
              Filter by topic, then open a card
            </h2>
            <p className={`mt-4 ${LANDING_LEAD_CLASS}`}>
              Same cards as the homepage — price, duration, and CEC hours only when the IICRC has
              approved that course.
            </p>
          </div>
          {catalogueAvailable ? (
            <CourseGrid
              key={disciplineTab ?? 'All'}
              courses={displayCourses}
              initialTab={disciplineTab ?? 'All'}
              surface="light"
              syncTabToUrl
            />
          ) : (
            <p role="status" className={`py-12 ${LANDING_LEAD_CLASS}`}>
              The course list could not be loaded right now. Please try again shortly.
            </p>
          )}
        </div>
      </section>

      {bundles.length > 0 && (
        <section className="relative border-t border-slate-200/70 bg-[#fafbfc] py-16 md:py-24">
          <div className={PUBLIC_SHELL_INNER_CLASS}>
            <p className={LANDING_EYEBROW_CLASS}>Bundles</p>
            <h2 className={`mt-3 ${LANDING_DISPLAY_H2_CLASS}`}>Industry packs</h2>
            <p className={`mt-4 mb-10 max-w-xl ${LANDING_LEAD_CLASS}`}>
              Grouped seats when a crew needs more than one course in the same season.
            </p>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {bundles.map((b: any) => (
                <BundlePricingCard key={b.id} bundle={b} />
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="relative border-t border-slate-200/70 bg-white py-16 md:py-24">
        <div className={PUBLIC_SHELL_INNER_CLASS}>
          <div className="mx-auto max-w-2xl text-center">
            <p className={LANDING_EYEBROW_CLASS}>IICRC context</p>
            <h2 className={`mt-3 ${LANDING_DISPLAY_H2_CLASS}`}>
              How IICRC certification disciplines fit together
            </h2>
            <p className={`mx-auto mt-4 ${LANDING_LEAD_CLASS}`}>
              A reference map of the IICRC&rsquo;s own certification disciplines. These are
              certifications awarded by schools and examinations approved by the IICRC, not CARSI
              courses — CARSI courses carry CARSI Southern Hemisphere Restoration Designations.
            </p>
          </div>
          <div className="mt-10 rounded-2xl border border-slate-200/80 bg-[#fafbfc] p-6 shadow-sm md:p-10">
            <IICRCDisciplineMap />
          </div>
        </div>
      </section>

      <section className="relative border-t border-slate-200/70 bg-[#fafbfc] py-16 md:py-20">
        <div className={PUBLIC_SHELL_INNER_CLASS}>
          <CECCalculator />
        </div>
      </section>

      {catalogueAvailable ? <FAQSchema questions={catalogueAnswers} /> : null}
      <HomeFaqSection faqs={catalogueAnswers} />
      <HomeFinalCtaSection />
    </>
  );
}
