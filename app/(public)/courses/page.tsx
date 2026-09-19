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
import { ItemListSchema } from '@/components/seo';
import { CECCalculator } from '@/components/tools/CECCalculator';
import type { CourseListItem } from '@/lib/course-list-item';
import { getBackendOrigin, getPublicSiteUrl } from '@/lib/env/public-url';
import {
  coursesIndexMetaDescription,
  deriveCatalogueFactsFromCourseItems,
  formatCourseCountForCopy,
} from '@/lib/server/public-catalogue-facts';
import { getPublishedCourseListItemsFromDatabase } from '@/lib/server/public-courses-list';
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

function buildCatalogueFaqs(publishedCourseCount: number) {
  const countPhrase =
    publishedCourseCount > 0
      ? `Our ${publishedCourseCount} courses range from`
      : 'Our courses range from';

  return [
    {
      question: 'What courses does CARSI offer?',
      answer: `CARSI is an IICRC CEC Accredited provider, and its courses carry CARSI Southern Hemisphere Restoration Designations — CARSI-issued credentials, not IICRC certifications. The catalogue covers water damage restoration, carpet repair, structural drying, mould remediation, fire and smoke restoration, odour control and carpet cleaning, all produced for Australian and New Zealand conditions. ${countPhrase} beginner modules for people just starting, through intermediate refreshers and advanced practice modules for experienced professionals. Courses are delivered online so technicians can study at their own pace. Eligible courses show their CEC value so learners can track continuing education without implying IICRC delivery status.`,
    },
    {
      question: 'How do I choose the right course?',
      answer:
        'Your choice depends on your current role and career goals. Water damage restoration is the most common starting point. Carpet repair suits flooring and soft-furnishing work. Structural drying builds moisture control for structure. Mould remediation covers assessment and remediation. Fire and smoke restoration addresses post-fire cleanup. Odour control focuses on identifying and neutralising sources. Carpet cleaning targets commercial contract cleaners. Each pathway leads to a CARSI Southern Hemisphere Restoration Designation.',
    },
    {
      question: 'What are IICRC Continuing Education Credits (CECs)?',
      answer:
        'IICRC Continuing Education Credits (CECs) are the industry standard for tracking professional development in cleaning and restoration. IICRC members and certified technicians continue their education through CECs within each certification cycle. A CARSI course may carry a specific CEC value only after the IICRC has approved that course for CECs. Courses awaiting approval show no CEC value. Upon completing an approved course, CECs are recorded in your CARSI dashboard and can be exported for submission to the IICRC. CARSI also provides verifiable digital credentials with a public URL.',
    },
  ];
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
  const [bundles, { items: courses }] = await Promise.all([getBundles(), getCoursesCached()]);
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

  const stats = [
    {
      value:
        displayTotal > 0 ? formatCourseCountForCopy(displayTotal) : `${displayTotal}`,
      label: 'Published courses',
    },
    { value: '24/7', label: 'Study anytime' },
    { value: 'AUD', label: 'Priced for Australia' },
    { value: 'CEC', label: 'Hours only when approved' },
  ];

  return (
    <>
      <ItemListSchema
        name="CARSI restoration training courses"
        description={coursesIndexMetaDescription(catalogueFacts)}
        items={courseListItems}
        itemType="Course"
      />

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
            {displayTotal} beginner, intermediate, and advanced course
            {displayTotal !== 1 ? 's' : ''} across water damage, carpet, structural drying, mould,
            fire and smoke, odour control and commercial cleaning — produced for Australian
            conditions, studied around the roster.
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
            <Link
              href="/pricing"
              className="inline-flex min-h-12 items-center justify-center text-sm font-semibold text-[#146fc2] underline-offset-4 hover:underline"
            >
              Membership covers every published course
            </Link>
          </div>

          <p className="mt-8 max-w-2xl rounded-2xl border border-[#f2cf8f]/80 bg-[#fff8ed] px-5 py-4 text-sm leading-relaxed text-[#7a3500]">
            CARSI courses carry CARSI Southern Hemisphere Restoration Designations. They are not
            IICRC certification courses — IICRC certifications are obtained through schools and
            examinations approved by the IICRC.
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
            <h2 className={`mt-3 ${LANDING_DISPLAY_H2_CLASS}`}>Filter by topic, then open a card</h2>
            <p className={`mt-4 ${LANDING_LEAD_CLASS}`}>
              Same cards as the homepage — price, duration, and CEC hours only when the IICRC has
              approved that course.
            </p>
          </div>
          <CourseGrid courses={displayCourses} initialTab={disciplineTab ?? 'All'} surface="light" />
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

      <HomeFaqSection faqs={buildCatalogueFaqs(catalogueFacts.publishedCourseCount)} />
      <HomeFinalCtaSection />
    </>
  );
}
