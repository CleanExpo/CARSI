import type { Metadata } from 'next';
import Link from 'next/link';

import {
  LANDING_EYEBROW_CLASS,
  LANDING_LEAD_CLASS,
  PUBLIC_SHELL_INNER_CLASS,
} from '@/components/landing/public-shell-width';
import { ItemListSchema } from '@/components/seo';
import type { CourseListItem } from '@/lib/course-list-item';
import { getBackendOrigin, getPublicSiteUrl } from '@/lib/env/public-url';
import { selectCurrentCecCourses } from '@/lib/seed/cec-approvals';
import { getPublishedCourseListItemsFromDatabase } from '@/lib/server/public-courses-list';

/**
 * `/iicrc-cec-courses` — every published course with an IICRC CEC approval in force
 * today, read from the approvals registry (`data/seed/cec-approvals.json`) and the live
 * catalogue. Nothing here is hand-listed: an approval that lapses or a course that is
 * unpublished drops off on the next revalidation. Deliberately states no IICRC renewal
 * requirement (how many CECs a certification needs), because that figure is unverified.
 */

export const revalidate = 300;

const PAGE_PATH = '/iicrc-cec-courses';

export const metadata: Metadata = {
  title: 'IICRC CEC Accredited Courses Online',
  description:
    'CARSI courses with a current IICRC approval for Continuing Education Credit (CEC) hours: price, CEC hours and approval expiry for each, all self-paced online.',
  alternates: { canonical: PAGE_PATH },
};

async function getPublishedCourses(): Promise<CourseListItem[]> {
  if (process.env.DATABASE_URL?.trim()) {
    try {
      const items = await getPublishedCourseListItemsFromDatabase();
      if (items.length > 0) return items;
    } catch (e) {
      console.error('[iicrc-cec-courses] Failed to load published courses from database', e);
    }
  }
  try {
    const res = await fetch(`${getBackendOrigin()}/api/lms/courses`, {
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.items ?? [];
  } catch {
    return [];
  }
}

function priceOf(course: CourseListItem): number | undefined {
  if (course.is_free) return 0;
  const price = Number(course.price_aud);
  return Number.isFinite(price) && price >= 0 ? price : undefined;
}

function formatPrice(price: number | undefined): string {
  if (price === undefined) return 'See course';
  if (price === 0) return 'Free';
  return `$${Number.isInteger(price) ? price : price.toFixed(2)} AUD`;
}

function formatExpiry(iso: string): string {
  return new Date(iso).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export default async function IicrcCecCoursesPage() {
  const siteUrl = getPublicSiteUrl();
  const rows = selectCurrentCecCourses(await getPublishedCourses());

  return (
    <>
      <ItemListSchema
        name="IICRC CEC Accredited courses from CARSI"
        description="CARSI courses with a current IICRC approval for Continuing Education Credit hours."
        itemType="Course"
        items={rows.map(({ course }) => {
          const price = priceOf(course);
          return {
            name: course.title,
            url: `${siteUrl}/courses/${course.slug}`,
            description: course.short_description ?? course.title,
            price,
            duration: course.duration_hours,
            isFree: price === 0,
          };
        })}
      />

      <section className="border-b border-slate-200/70 bg-white">
        <div className={`${PUBLIC_SHELL_INNER_CLASS} py-16 md:py-20`}>
          <p className={LANDING_EYEBROW_CLASS}>IICRC Continuing Education Credits</p>
          <h1 className="mt-3 max-w-3xl font-[family-name:var(--font-display)] text-[2.15rem] leading-[1.1] font-semibold tracking-[-0.02em] text-slate-950 md:text-[3rem]">
            IICRC CEC Accredited courses
          </h1>
          <p className={`mt-5 max-w-2xl text-pretty ${LANDING_LEAD_CLASS}`}>
            CARSI is an IICRC CEC Accredited provider. Each course below has a current IICRC
            approval for the CEC hours shown, up to the expiry date listed. CECs count toward
            maintaining an IICRC certification you already hold; they are not an IICRC
            certification. Completed courses are recorded in your CARSI dashboard.
          </p>
        </div>
      </section>

      <section aria-label="Courses with current IICRC CEC approval" className="bg-[#fafbfc] py-12 md:py-16">
        <div className={PUBLIC_SHELL_INNER_CLASS}>
          {rows.length === 0 ? (
            <p className="text-sm text-slate-600">
              The list is not available right now.{' '}
              <Link href="/courses" className="font-semibold text-[#146fc2] underline">
                Browse all courses
              </Link>
              .
            </p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
              <table className="w-full text-left text-sm">
                <caption className="sr-only">
                  Courses with a current IICRC CEC approval, with price, CEC hours and approval expiry
                </caption>
                <thead className="bg-slate-50 text-xs font-semibold tracking-wide text-slate-600 uppercase">
                  <tr>
                    <th scope="col" className="px-4 py-3">Course</th>
                    <th scope="col" className="px-4 py-3">IICRC CEC hours</th>
                    <th scope="col" className="px-4 py-3">Price</th>
                    <th scope="col" className="px-4 py-3">Approval valid until</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {rows.map(({ course, approvedHours, expiresAt }) => (
                    <tr key={course.slug}>
                      <td className="px-4 py-3">
                        <Link
                          href={`/courses/${course.slug}`}
                          className="font-medium text-[#146fc2] underline decoration-[#146fc2]/25 underline-offset-4 hover:text-[#0f5fa8]"
                        >
                          {course.title}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-slate-900">{approvedHours}</td>
                      <td className="px-4 py-3 text-slate-900">{formatPrice(priceOf(course))}</td>
                      <td className="px-4 py-3 text-slate-600">{formatExpiry(expiresAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="mt-6 text-xs text-slate-500">
            Courses not listed here show no CEC hours, because the IICRC has not approved them for
            CECs or their approval has lapsed. Training a crew? Paid courses can be bought as team
            seats at checkout.
          </p>
        </div>
      </section>
    </>
  );
}
