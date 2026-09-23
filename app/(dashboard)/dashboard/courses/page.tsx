import type { Metadata } from 'next';
import Link from 'next/link';

import { DashboardCatalogueHeader } from '@/components/layout/DashboardCatalogueHeader';
import { CourseBrowseProvider } from '@/components/lms/CourseBrowseContext';
import { CourseGrid } from '@/components/lms/CourseGrid';
import { OnboardingSpotlight } from '@/components/onboarding/OnboardingSpotlight';
import { getDashboardCoursesForSession } from '@/lib/server/dashboard-courses';
import { getEnrollmentsForStudent } from '@/lib/server/learner-dashboard-data';
import { listOnboardingProgramsForUser } from '@/lib/server/onboarding-programs';
import type { DashboardCourseStatusFilter } from '@/lib/server/public-courses-list';
import { getNextCourseRecommendationsForStudent } from '@/lib/server/renewal-summary';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Course Catalogue | CARSI',
  description: 'Find training that fits your professional goals.',
};

function parseStatus(raw: string | string[] | undefined): DashboardCourseStatusFilter {
  const v = Array.isArray(raw) ? raw[0] : raw;
  if (v === 'draft' || v === 'published' || v === 'all') return v;
  return 'all';
}

function dashboardCoursesHref(opts: {
  status: DashboardCourseStatusFilter;
  discipline?: string;
}): string {
  const p = new URLSearchParams();
  p.set('status', opts.status);
  if (opts.discipline?.trim()) p.set('discipline', opts.discipline.trim());
  const q = p.toString();
  return q ? `/dashboard/courses?${q}` : '/dashboard/courses';
}

const surface = 'learner-home-surface learner-home-card overflow-hidden rounded-[1.25rem]';
const inset = 'learner-home-inset';
const kicker =
  'bg-gradient-to-r from-sky-200 via-cyan-200 to-indigo-200 bg-clip-text text-[11px] font-semibold tracking-[0.2em] text-transparent uppercase';
const heading = 'font-semibold tracking-[-0.02em] text-white';
const muted = 'text-slate-300/80';

export default async function DashboardCoursesPage({
  searchParams,
}: {
  searchParams: Promise<{ discipline?: string; status?: string }>;
}) {
  const sp = await searchParams;
  // WS1 fix 3 (GP-542): a learner never sees draft courses. The session wrapper reads the role
  // from the cookie itself and coerces the requested status; the page only decides whether to
  // offer the filter at all. `status` below is the status actually queried.
  const { claims, canSeeDrafts, status, courses } = await getDashboardCoursesForSession(
    parseStatus(sp.status)
  );
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

  const total = courses.length;
  const userId = claims?.sub;
  const dbReady = Boolean(userId && process.env.DATABASE_URL?.trim());
  const onboardingPrograms = userId && dbReady ? await listOnboardingProgramsForUser(userId) : [];
  const enrollments = userId && dbReady ? await getEnrollmentsForStudent(userId) : [];
  const recommended = userId && dbReady ? await getNextCourseRecommendationsForStudent(userId) : [];
  const enrolledSlugs = enrollments.map((e) => e.course_slug);
  const recommendedSlugs = recommended.map((c) => c.slug);
  const enrolledSet = new Set(enrolledSlugs);
  const enrolledInView = courses.filter((c) => enrolledSet.has(c.slug)).length;
  const cecInView = courses.filter((c) => Boolean(c.cec_hours?.toString().trim())).length;

  return (
    <main className="learner-home -mx-4 w-[calc(100%+2rem)] min-w-0 px-4 pb-16 text-slate-900 sm:-mx-6 sm:w-[calc(100%+3rem)] sm:px-6 lg:-mx-10 lg:w-[calc(100%+5rem)] lg:px-10">
      <DashboardCatalogueHeader />
      <header className="mt-4 mb-8">
        <p className="text-[13px] text-slate-500">Find your next course</p>
        <h1 className="mt-2 text-[2.75rem] leading-[1.05] font-semibold tracking-tight text-slate-950 sm:text-[3.15rem]">
          Course catalogue
        </h1>
        <p className="mt-3 max-w-xl text-[15px] leading-6 text-slate-500">
          Professional learning for the field. Approved IICRC CEC hours appear only where the IICRC
          has confirmed them.
        </p>
      </header>

      <section className={`${surface} mb-8 px-7 py-7`}>
        <p className={kicker}>This catalogue</p>
        <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(
            [
              [total, total === 1 ? 'Course' : 'Courses'],
              [
                recommendedSlugs.length,
                recommendedSlugs.length === 1 ? 'Recommended' : 'Recommended',
              ],
              [enrolledInView, enrolledInView === 1 ? 'Enrolled' : 'Enrolled'],
              [cecInView, cecInView === 1 ? 'With approved CEC' : 'With approved CEC'],
            ] as const
          ).map(([value, label]) => (
            <div key={label} className={`${inset} rounded-xl px-3 py-4`}>
              <dt className={`text-[11px] ${muted}`}>{label}</dt>
              <dd className={`mt-2 text-[1.85rem] leading-none tabular-nums ${heading}`}>
                {value}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      {onboardingPrograms.length > 0 ? (
        <div className="mb-8">
          <OnboardingSpotlight programs={onboardingPrograms} variant="compact" />
        </div>
      ) : null}

      {canSeeDrafts ? (
        <div
          className="mb-6 flex flex-wrap gap-2"
          role="tablist"
          aria-label="Filter by publish status"
        >
          {(
            [
              { key: 'all' as const, label: 'All' },
              { key: 'published' as const, label: 'Published' },
              { key: 'draft' as const, label: 'Draft' },
            ] as const
          ).map(({ key, label }) => {
            const active = status === key;
            return (
              <Link
                key={key}
                href={dashboardCoursesHref({ status: key, discipline })}
                scroll={false}
                className={`inline-flex min-h-11 items-center rounded-full border px-4 py-2 text-sm font-medium ${
                  active
                    ? 'learner-home-surface border-sky-300/30 text-white'
                    : 'border-slate-200 bg-white text-slate-600'
                }`}
              >
                {label}
              </Link>
            );
          })}
        </div>
      ) : null}

      <div className="mb-5">
        <h2 className="text-[1.4rem] font-semibold tracking-tight text-slate-950">
          Browse courses
        </h2>
        <p className="mt-1 text-[14px] text-slate-500">
          Filter by topic, then open a course for the outline, price and enrolment.
        </p>
      </div>
      <section className="mb-10">
        {courses.length === 0 ? (
          <p className="rounded-[1.25rem] border border-slate-200 bg-white py-12 text-center text-[15px] text-slate-600">
            No courses in this view. Try another filter or search.
          </p>
        ) : (
          <CourseBrowseProvider courseLinkBase="/dashboard/courses" enrolledSlugs={enrolledSlugs}>
            <CourseGrid
              courses={courses}
              initialTab={disciplineTab ?? 'All'}
              showModulesSort
              initialSortBy={status === 'draft' ? 'modules' : 'updated'}
              surface="light"
              cardVariant="premium"
              recommendedSlugs={recommendedSlugs}
            />
          </CourseBrowseProvider>
        )}
      </section>

      <p className="text-center text-xs text-slate-500">
        Public catalogue:{' '}
        <Link href="/courses" className="text-[#146fc2] underline-offset-2 hover:underline">
          /courses
        </Link>
      </p>
    </main>
  );
}
