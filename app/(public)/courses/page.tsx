import type { Metadata } from 'next';
import Link from 'next/link';
import { cache } from 'react';

import { BundlePricingCard } from '@/components/lms/BundlePricingCard';
import { CourseGrid } from '@/components/lms/CourseGrid';
import { IICRCDisciplineMap } from '@/components/lms/diagrams/IICRCDisciplineMap';
import { ItemListSchema } from '@/components/seo';
import { CECCalculator } from '@/components/tools/CECCalculator';
import { AcronymTooltip } from '@/components/ui/AcronymTooltip';
import { getBackendOrigin, getPublicSiteUrl } from '@/lib/env/public-url';
import {
  coursesIndexMetaDescription,
  deriveCatalogueFactsFromCourseItems,
} from '@/lib/server/public-catalogue-facts';
import { getPublishedCourseListItemsFromDatabase } from '@/lib/server/public-courses-list';
import type { CourseListItem } from '@/lib/course-list-item';

// ISR: cache the catalogue render, refreshed every 5 minutes (issue #129).
// Discipline-filter variants that read searchParams still render per-request.
export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const { items } = await getCoursesCached();
  const facts = deriveCatalogueFactsFromCourseItems(items);
  return {
    title: 'IICRC-aligned CEC Restoration Courses',
    description: coursesIndexMetaDescription(facts),
    alternates: { canonical: '/courses' },
  };
}

interface SearchParams {
  category?: string;
  level?: string;
  discipline?: string;
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
    if (!res.ok) return { items: [], total: 0 };
    const data = await res.json();
    return { items: data.items ?? [], total: data.total ?? 0 };
  } catch {
    return { items: [], total: 0 };
  }
}

async function getCourses() {
  if (process.env.DATABASE_URL?.trim()) {
    try {
      const items = await getPublishedCourseListItemsFromDatabase();
      if (items.length > 0) {
        return { items, total: items.length };
      }
    } catch (e) {
      console.error('[courses] Failed to load published courses from database', e);
    }
  }

  return getCoursesFromBackend();
}

/** One catalogue fetch per request (shared by the page and `generateMetadata`). */
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
  const rawDiscipline = sp.discipline;
  const discipline =
    typeof rawDiscipline === 'string'
      ? rawDiscipline
      : Array.isArray(rawDiscipline)
        ? rawDiscipline[0]
        : undefined;
  const disciplineTab =
    typeof discipline === 'string' && discipline.trim() !== ''
      ? discipline.trim().toUpperCase()
      : undefined;
  const [bundles, { items: courses }] = await Promise.all([
    getBundles(),
    getCoursesCached(),
  ]);
  const displayCourses = dedupeCoursesBySlug(courses);
  const displayTotal = displayCourses.length;
  const catalogueFacts = deriveCatalogueFactsFromCourseItems(displayCourses);
  const siteUrl = getPublicSiteUrl();
  const courseListItems = displayCourses.map((course) => {
    const price = courseSchemaPrice(course);

    return {
      name: course.title,
      url: `${siteUrl}/courses/${course.slug}`,
      description: course.short_description ?? `${course.title} online restoration training course.`,
      price,
      duration: course.duration_hours,
      isFree: course.is_free === true || price === 0,
    };
  });

  return (
    <main id="main-content" className="relative z-10 min-h-screen bg-[#f6f8fb] text-slate-900">
      <ItemListSchema
        name="CARSI restoration training courses"
        description={coursesIndexMetaDescription(catalogueFacts)}
        items={courseListItems}
        itemType="Course"
      />

      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            'radial-gradient(ellipse 80% 42% at 50% 0%, rgba(36,144,237,0.12) 0%, transparent 58%)',
        }}
        aria-hidden="true"
      />

      <div className="relative z-10 mx-auto px-6 py-8 sm:py-10">
        {/* ── Hero header ── */}
        <header className="mb-6">
          <h1 className="font-display text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
            Restoration Training Courses
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            {displayTotal} beginner, intermediate, and advanced course
            {displayTotal !== 1 ? 's' : ''} across 7 <AcronymTooltip term="IICRC" /> disciplines —
            track <AcronymTooltip term="CEC">CECs</AcronymTooltip> online, at your own pace
          </p>
          <p className="mt-3 rounded-lg border border-[#f2cf8f] bg-[#fff8ed] px-4 py-3 text-sm leading-relaxed text-[#7a3500]">
            CARSI courses earn IICRC Continuing Education Credits (CECs). They are not IICRC
            certification courses — IICRC certifications are obtained through IICRC-approved schools
            and examinations.
          </p>
          <div className="mt-4 rounded-lg border border-[#b8dbfb] bg-white px-4 py-3 shadow-sm">
            <p className="text-sm leading-relaxed text-slate-700">
              Not sure where to start, or comparing several courses?{' '}
              <Link
                href="/pathways"
                className="font-semibold text-[#146fc2] underline decoration-[#146fc2]/30 underline-offset-4 transition-colors hover:text-[#0f5fa8]"
              >
                Use the guided pathway advisor
              </Link>{' '}
              to choose by trade goal, CEC need, team rollout, or facility risk.{' '}
              <Link
                href="/pricing"
                className="font-semibold text-[#146fc2] underline decoration-[#146fc2]/30 underline-offset-4 transition-colors hover:text-[#0f5fa8]"
              >
                Membership gives 100% access to all published courses
              </Link>
              .
            </p>
          </div>
        </header>

        {/* ── Course Grid (primary content — above the fold) ── */}
        <section className="mb-10">
          <div
            className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:p-5"
            style={{
              border: '1px solid rgba(15,23,42,0.04)',
            }}
          >
            <CourseGrid courses={displayCourses} initialTab={disciplineTab ?? 'All'} />
          </div>
        </section>

        {/* ── Industry Bundles ── */}
        {bundles.length > 0 && (
          <section className="mb-10">
            <h2 className="mb-4 text-lg font-semibold text-slate-950">
              Industry Bundles
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {bundles.map((b: any) => (
                <BundlePricingCard key={b.id} bundle={b} />
              ))}
            </div>
          </section>
        )}

        {/* ── IICRC Discipline Map ── */}
        <section className="mb-10">
          <div
            className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200"
            style={{
              border: '1px solid rgba(15,23,42,0.04)',
            }}
          >
            <h2
              className="font-display mb-3 text-center text-lg font-semibold text-slate-950"
            >
              IICRC Discipline Map
            </h2>
            <p
              className="mx-auto mb-4 max-w-xl text-center text-xs text-slate-600"
            >
              Explore the seven IICRC disciplines. Hover over each node to learn more about the
              CEC pathway.
            </p>
            <IICRCDisciplineMap />
          </div>
        </section>

        {/* ── CEC Calculator ── */}
        <div className="mb-10">
          <CECCalculator />
        </div>

        {/* ── GEO Q&A Sections (SEO content — collapsed accordion) ── */}
        <section className="mb-8">
          <h2 className="font-display mb-4 text-lg font-semibold text-slate-950">
            Frequently Asked Questions
          </h2>
          <div className="space-y-3">
            {/* Q1 — What courses does CARSI offer? */}
            <details
              className="group rounded-lg border border-slate-200 bg-white shadow-sm"
              style={{
                border: '1px solid rgba(15,23,42,0.1)',
              }}
            >
              <summary
                className="flex cursor-pointer items-center justify-between px-5 py-4 text-sm font-semibold text-slate-900 select-none"
              >
                <span>What courses does CARSI offer?</span>
                <svg
                  className="h-4 w-4 shrink-0 transition-transform duration-200 group-open:rotate-180"
                  style={{ color: '#64748b' }}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <div className="px-5 pb-5">
                <p className="text-sm leading-relaxed text-slate-600">
                  CARSI offers <AcronymTooltip term="IICRC" /> <AcronymTooltip term="CEC" />{' '}
                  accredited courses across seven core disciplines: Water Restoration
                  Technology (<AcronymTooltip term="WRT" />
                  ), Carpet Repair and Reinstallation Technology (<AcronymTooltip term="CRT" />
                  ), Applied Structural Drying (<AcronymTooltip term="ASD" />
                  ), Applied Microbial Remediation Technology (<AcronymTooltip term="AMRT" />
                  ), Fire and Smoke Restoration Technology (<AcronymTooltip term="FSRT" />
                  ), Odour Control Technology (<AcronymTooltip term="OCT" />
                  ), and Commercial Carpet Cleaning Technology (<AcronymTooltip term="CCT" />
                  ). Eligible courses carry <AcronymTooltip term="IICRC" /> Continuing Education
                  Credits (<AcronymTooltip term="CEC">CECs</AcronymTooltip>) upon completion, with
                  automatic tracking and verifiable digital credentials.{' '}
                  {catalogueFacts.publishedCourseCount > 0 ? (
                    <>Our {catalogueFacts.publishedCourseCount} courses range from</>
                  ) : (
                    <>Our courses range from</>
                  )}{' '}
                  beginner modules for people just starting, through intermediate refreshers and
                  advanced practice modules for experienced professionals. Courses are delivered
                  online, allowing Australian restoration technicians to study at their own pace
                  from any location. Eligible courses show their <AcronymTooltip term="CEC" /> value
                  so learners can track continuing education progress without implying{' '}
                  <AcronymTooltip term="IICRC" /> delivery status.
                </p>
              </div>
            </details>

            {/* Q2 — How do I choose the right discipline? */}
            <details
              className="group rounded-lg border border-slate-200 bg-white shadow-sm"
              style={{
                border: '1px solid rgba(15,23,42,0.1)',
              }}
            >
              <summary
                className="flex cursor-pointer items-center justify-between px-5 py-4 text-sm font-semibold text-slate-900 select-none"
              >
                <span>
                  How do I choose the right <AcronymTooltip term="IICRC" /> discipline?
                </span>
                <svg
                  className="h-4 w-4 shrink-0 transition-transform duration-200 group-open:rotate-180"
                  style={{ color: '#64748b' }}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <div className="px-5 pb-5">
                <p className="text-sm leading-relaxed text-slate-600">
                  Your discipline choice depends on your current role and career goals. Water
                  Restoration Technology (<AcronymTooltip term="WRT" />) is the most common starting
                  point, providing foundational knowledge applicable across all restoration work
                  including flood damage, burst pipes, and storm recovery. Carpet Repair and
                  Reinstallation Technology (<AcronymTooltip term="CRT" />) suits technicians
                  working in flooring and soft furnishing restoration. Applied Structural Drying (
                  <AcronymTooltip term="ASD" />) builds on <AcronymTooltip term="WRT" /> with
                  advanced moisture control techniques for structural elements. Applied Microbial
                  Remediation Technology (<AcronymTooltip term="AMRT" />) covers mould assessment
                  and remediation, an increasingly regulated area across Australian states. Fire and
                  Smoke Restoration Technology (<AcronymTooltip term="FSRT" />) addresses post-fire
                  cleanup and deodorisation. Odour Control Technology (
                  <AcronymTooltip term="OCT" />) focuses on identifying and neutralising odour
                  sources in residential and commercial settings. Commercial Carpet Cleaning
                  Technology (<AcronymTooltip term="CCT" />) targets contract cleaners working in
                  commercial environments.
                </p>
              </div>
            </details>

            {/* Q3 — What are CECs? */}
            <details
              className="group rounded-lg border border-slate-200 bg-white shadow-sm"
              style={{
                border: '1px solid rgba(15,23,42,0.1)',
              }}
            >
              <summary
                className="flex cursor-pointer items-center justify-between px-5 py-4 text-sm font-semibold text-slate-900 select-none"
              >
                <span>
                  What are <AcronymTooltip term="IICRC" /> Continuing Education Credits (
                  <AcronymTooltip term="CEC">CECs</AcronymTooltip>)?
                </span>
                <svg
                  className="h-4 w-4 shrink-0 transition-transform duration-200 group-open:rotate-180"
                  style={{ color: '#64748b' }}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <div className="px-5 pb-5">
                <p className="text-sm leading-relaxed text-slate-600">
                  <AcronymTooltip term="IICRC" /> Continuing Education Credits (
                  <AcronymTooltip term="CEC">CECs</AcronymTooltip>) are the industry standard for
                  tracking professional development in the cleaning and restoration sector.
                  IICRC members and certified technicians continue their education through{' '}
                  <AcronymTooltip term="CEC">CECs</AcronymTooltip> within each certification cycle
                  to maintain their credentials with the Institute of Inspection, Cleaning and
                  Restoration Certification. Eligible CARSI courses carry a specific{' '}
                  <AcronymTooltip term="CEC" /> value based on course scope and duration. Upon
                  completing a course, your{' '}
                  <AcronymTooltip term="CEC">CECs</AcronymTooltip> are automatically recorded in
                  your CARSI student dashboard and can be exported for submission to the{' '}
                  <AcronymTooltip term="IICRC" />. CARSI also provides verifiable digital
                  credentials with a public URL that employers and clients can use to confirm your
                  qualifications. This system ensures your professional development is documented,
                  portable, and recognised internationally across the restoration industry.
                </p>
              </div>
            </details>
          </div>
        </section>
      </div>
    </main>
  );
}
