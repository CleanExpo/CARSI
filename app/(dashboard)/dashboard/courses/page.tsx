import type { Metadata } from 'next';
import Link from 'next/link';

import { DashboardCatalogueHeader } from '@/components/layout/DashboardCatalogueHeader';
import { CourseBrowseProvider } from '@/components/lms/CourseBrowseContext';
import { CourseGrid } from '@/components/lms/CourseGrid';
import { CourseSearchBar } from '@/components/lms/CourseSearchBar';
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

  const filterBtn =
    'inline-flex min-h-[40px] items-center rounded-lg px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50';

  return (
    <main className="max-w-9xl relative z-10 mx-auto w-full text-slate-900">
      <div className="px-1 py-2 sm:py-4">
        <DashboardCatalogueHeader />
        <header className="mb-6">
          <h1 className="font-display text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
            Course catalogue
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Find training that fits your professional goals.
            {canSeeDrafts
              ? ` ${total} course${total !== 1 ? 's' : ''} — filter by catalogue status.`
              : ` ${total} course${total !== 1 ? 's' : ''} available.`}
          </p>
        </header>

        {onboardingPrograms.length > 0 ? (
          <div className="mb-8">
            <OnboardingSpotlight programs={onboardingPrograms} variant="compact" />
          </div>
        ) : null}

        <div className="relative mx-auto mb-6 max-w-2xl">
          <CourseSearchBar />
        </div>

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
                  className={filterBtn}
                  style={
                    active
                      ? {
                          color: '#146fc2',
                          background: '#eef7ff',
                          border: '1px solid #b8dbfb',
                        }
                      : {
                          color: '#475569',
                          background: '#ffffff',
                          border: '1px solid rgba(15,23,42,0.12)',
                        }
                  }
                >
                  {label}
                </Link>
              );
            })}
          </div>
        ) : null}

        <section className="mb-10">
          <div
            className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200"
            style={{
              border: '1px solid rgba(15,23,42,0.04)',
            }}
          >
            {courses.length === 0 ? (
              <p className="py-12 text-center text-sm text-slate-600">
                No courses in this view. Try another filter or search.
              </p>
            ) : (
              <CourseBrowseProvider
                courseLinkBase="/dashboard/courses"
                enrolledSlugs={enrolledSlugs}
              >
                <CourseGrid
                  courses={courses}
                  initialTab={disciplineTab ?? 'All'}
                  showModulesSort
                  initialSortBy={status === 'draft' ? 'modules' : 'updated'}
                  surface="light"
                  recommendedSlugs={recommendedSlugs}
                />
              </CourseBrowseProvider>
            )}
          </div>
        </section>

        <p className="text-center text-xs text-slate-500">
          Public catalogue:{' '}
          <Link href="/courses" className="text-[#146fc2] underline-offset-2 hover:underline">
            /courses
          </Link>
        </p>
      </div>
    </main>
  );
}
