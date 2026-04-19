import type { Metadata } from 'next';
import { cache } from 'react';

import { BundlePricingCard } from '@/components/lms/BundlePricingCard';
import { CourseGrid } from '@/components/lms/CourseGrid';
import { CourseSearchBar } from '@/components/lms/CourseSearchBar';
import { IICRCDisciplineMap } from '@/components/lms/diagrams/IICRCDisciplineMap';
import { CECCalculator } from '@/components/tools/CECCalculator';
import { AcronymTooltip } from '@/components/ui/AcronymTooltip';
import { getBackendOrigin } from '@/lib/env/public-url';
import {
  coursesIndexMetaDescription,
  deriveCatalogueFactsFromCourseItems,
} from '@/lib/server/public-catalogue-facts';
import { getPublishedCourseListItemsFromDatabase } from '@/lib/server/public-courses-list';
import { loadWpExportCourses, mapWpExportToCourseListItem } from '@/lib/wordpress-export-courses';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const { items } = await getCoursesCached();
  const facts = deriveCatalogueFactsFromCourseItems(items);
  return {
    title: 'IICRC-Approved Restoration Training Courses | CARSI',
    description: coursesIndexMetaDescription(facts),
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

  const exported = loadWpExportCourses();
  if (exported && exported.length > 0) {
    const items = exported.map(mapWpExportToCourseListItem);
    return { items, total: items.length };
  }
  return getCoursesFromBackend();
}

/** One catalogue fetch per request (shared by the page and `generateMetadata`). */
const getCoursesCached = cache(getCourses);

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
  const [bundles, { items: courses, total }] = await Promise.all([
    getBundles(),
    getCoursesCached(),
  ]);
  const catalogueFacts = deriveCatalogueFactsFromCourseItems(courses);

  return (
    <main id="main-content" className="relative z-10 min-h-screen bg-[#050505]">
      {/* Match home: single top radial accent */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(36,144,237,0.07) 0%, transparent 55%)',
        }}
        aria-hidden="true"
      />

      <div className="relative z-10 mx-auto px-6 py-8 sm:py-10">
        {/* ── Hero header ── */}
        <header className="mb-6">
          <h1
            className="font-display text-3xl font-bold tracking-tight sm:text-4xl"
            style={{ color: 'rgba(255,255,255,0.92)' }}
          >
            Restoration Training Courses
          </h1>
          <p className="mt-2 text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
            {total} course{total !== 1 ? 's' : ''} across 7 <AcronymTooltip term="IICRC" />{' '}
            disciplines — earn <AcronymTooltip term="CEC">CECs</AcronymTooltip> online, at your own
            pace
          </p>
        </header>

        {/* ── AI Search Bar — immediately below header ── */}
        <div className="relative mx-auto mb-8 max-w-2xl">
          <CourseSearchBar />
        </div>

        {/* ── Course Grid (primary content — above the fold) ── */}
        <section className="mb-10">
          <div
            className="rounded-sm p-5"
            style={{
              background: 'rgba(255,255,255,0.04)',
              backdropFilter: 'blur(24px) saturate(160%)',
              WebkitBackdropFilter: 'blur(24px) saturate(160%)',
              border: '1px solid rgba(255,255,255,0.07)',
            }}
          >
            <CourseGrid courses={courses} initialTab={disciplineTab ?? 'All'} />
          </div>
        </section>

        {/* ── Industry Bundles ── */}
        {bundles.length > 0 && (
          <section className="mb-10">
            <h2 className="mb-4 text-lg font-semibold" style={{ color: 'rgba(255,255,255,0.85)' }}>
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
            className="rounded-sm p-5"
            style={{
              background: 'rgba(255,255,255,0.04)',
              backdropFilter: 'blur(24px) saturate(160%)',
              WebkitBackdropFilter: 'blur(24px) saturate(160%)',
              border: '1px solid rgba(255,255,255,0.07)',
            }}
          >
            <h2
              className="font-display mb-3 text-center text-lg font-semibold"
              style={{ color: 'rgba(255,255,255,0.88)' }}
            >
              IICRC Discipline Map
            </h2>
            <p
              className="mx-auto mb-4 max-w-xl text-center text-xs"
              style={{ color: 'rgba(255,255,255,0.4)' }}
            >
              Explore the seven IICRC disciplines. Hover over each node to learn more about the
              certification pathway.
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
          <h2
            className="font-display mb-4 text-lg font-semibold"
            style={{ color: 'rgba(255,255,255,0.88)' }}
          >
            Frequently Asked Questions
          </h2>
          <div className="space-y-3">
            {/* Q1 — What courses does CARSI offer? */}
            <details
              className="group rounded-sm"
              style={{
                background: 'rgba(255,255,255,0.04)',
                backdropFilter: 'blur(24px) saturate(160%)',
                WebkitBackdropFilter: 'blur(24px) saturate(160%)',
                border: '1px solid rgba(255,255,255,0.07)',
              }}
            >
              <summary
                className="flex cursor-pointer items-center justify-between px-5 py-4 text-sm font-semibold select-none"
                style={{ color: 'rgba(255,255,255,0.88)' }}
              >
                <span>What courses does CARSI offer?</span>
                <svg
                  className="h-4 w-4 shrink-0 transition-transform duration-200 group-open:rotate-180"
                  style={{ color: 'rgba(255,255,255,0.4)' }}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <div className="px-5 pb-5">
                <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)' }}>
                  CARSI provides <AcronymTooltip term="IICRC" />
                  -aligned continuing education across seven core disciplines: Water Restoration
                  Technology (<AcronymTooltip term="WRT" />
                  ), Carpet Repair and Reinstallation Technology (<AcronymTooltip term="CRT" />
                  ), Applied Structural Drying (<AcronymTooltip term="ASD" />
                  ), Applied Microbial Remediation Technology (<AcronymTooltip term="AMRT" />
                  ), Fire and Smoke Restoration Technology (<AcronymTooltip term="FSRT" />
                  ), Odour Control Technology (<AcronymTooltip term="OCT" />
                  ), and Commercial Carpet Cleaning Technology (<AcronymTooltip term="CCT" />
                  ). Each course awards <AcronymTooltip term="IICRC" /> Continuing Education Credits
                  (<AcronymTooltip term="CEC">CECs</AcronymTooltip>) upon completion, with automatic
                  tracking and verifiable digital credentials.{' '}
                  {catalogueFacts.publishedCourseCount > 0 ? (
                    <>
                      Our {catalogueFacts.publishedCourseCount} courses range from
                    </>
                  ) : (
                    <>Our courses range from</>
                  )}{' '}
                  introductory modules for new technicians through to advanced certification
                  preparation for experienced professionals. All courses are delivered online,
                  allowing Australian restoration technicians to study at their own pace from any
                  location. Course content is reviewed and approved by the{' '}
                  <AcronymTooltip term="IICRC" /> board in the United States before{' '}
                  <AcronymTooltip term="CEC">CECs</AcronymTooltip> are assigned, ensuring every
                  credit meets international standards.
                </p>
              </div>
            </details>

            {/* Q2 — How do I choose the right discipline? */}
            <details
              className="group rounded-sm"
              style={{
                background: 'rgba(255,255,255,0.04)',
                backdropFilter: 'blur(24px) saturate(160%)',
                WebkitBackdropFilter: 'blur(24px) saturate(160%)',
                border: '1px solid rgba(255,255,255,0.07)',
              }}
            >
              <summary
                className="flex cursor-pointer items-center justify-between px-5 py-4 text-sm font-semibold select-none"
                style={{ color: 'rgba(255,255,255,0.88)' }}
              >
                <span>
                  How do I choose the right <AcronymTooltip term="IICRC" /> discipline?
                </span>
                <svg
                  className="h-4 w-4 shrink-0 transition-transform duration-200 group-open:rotate-180"
                  style={{ color: 'rgba(255,255,255,0.4)' }}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <div className="px-5 pb-5">
                <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)' }}>
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
              className="group rounded-sm"
              style={{
                background: 'rgba(255,255,255,0.04)',
                backdropFilter: 'blur(24px) saturate(160%)',
                WebkitBackdropFilter: 'blur(24px) saturate(160%)',
                border: '1px solid rgba(255,255,255,0.07)',
              }}
            >
              <summary
                className="flex cursor-pointer items-center justify-between px-5 py-4 text-sm font-semibold select-none"
                style={{ color: 'rgba(255,255,255,0.88)' }}
              >
                <span>
                  What are <AcronymTooltip term="IICRC" /> Continuing Education Credits (
                  <AcronymTooltip term="CEC">CECs</AcronymTooltip>)?
                </span>
                <svg
                  className="h-4 w-4 shrink-0 transition-transform duration-200 group-open:rotate-180"
                  style={{ color: 'rgba(255,255,255,0.4)' }}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <div className="px-5 pb-5">
                <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)' }}>
                  <AcronymTooltip term="IICRC" /> Continuing Education Credits (
                  <AcronymTooltip term="CEC">CECs</AcronymTooltip>) are the industry standard for
                  tracking professional development in the cleaning and restoration sector.
                  Certified technicians must earn a minimum number of{' '}
                  <AcronymTooltip term="CEC">CECs</AcronymTooltip> within each certification cycle
                  to maintain their credentials with the Institute of Inspection, Cleaning and
                  Restoration Certification. CARSI courses are individually submitted to the{' '}
                  <AcronymTooltip term="IICRC" /> board for approval, and each approved course is
                  assigned a specific <AcronymTooltip term="CEC" /> value based on its content depth
                  and duration. Upon completing a course, your{' '}
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
