import type { Metadata } from 'next';
import Link from 'next/link';

import { DashboardCatalogueHeader } from '@/components/layout/DashboardCatalogueHeader';
import { CourseGrid } from '@/components/lms/CourseGrid';
import { CourseSearchBar } from '@/components/lms/CourseSearchBar';
import { AcronymTooltip } from '@/components/ui/AcronymTooltip';
import {
  type DashboardCourseStatusFilter,
  getDashboardCourseListItemsFromDatabase,
} from '@/lib/server/public-courses-list';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Courses | Dashboard | CARSI',
  description: 'Browse CARSI courses from your dashboard.',
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
  const status = parseStatus(sp.status);
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

  const courses = await getDashboardCourseListItemsFromDatabase({ status });
  const total = courses.length;

  const filterBtn =
    'inline-flex min-h-[40px] items-center rounded-lg px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50';

  return (
    <main id="main-content" className="relative z-10 min-h-screen bg-[#f6f8fb] text-slate-900">
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            'radial-gradient(ellipse 80% 42% at 50% 0%, rgba(36,144,237,0.12) 0%, transparent 58%)',
        }}
        aria-hidden="true"
      />

      <div className="relative z-10 mx-auto px-6 py-8 sm:py-10">
        <DashboardCatalogueHeader />
        <header className="mb-6">
          <h1 className="font-display text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
            Courses
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            {total} course{total !== 1 ? 's' : ''} — filter by catalogue status. Draft courses are
            ordered with the most modules first.
          </p>
        </header>

        <div className="relative mx-auto mb-6 max-w-2xl">
          <CourseSearchBar />
        </div>

        <div className="mb-6 flex flex-wrap gap-2" role="tablist" aria-label="Filter by publish status">
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

        <section className="mb-10">
          <div
            className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200"
            style={{
              border: '1px solid rgba(15,23,42,0.04)',
            }}
          >
            {courses.length === 0 ? (
              <p className="py-12 text-center text-sm text-slate-600">
                No courses in this view. Connect <code className="text-slate-800">DATABASE_URL</code>{' '}
                or choose another filter.
              </p>
            ) : (
              <CourseGrid
                courses={courses}
                initialTab={disciplineTab ?? 'All'}
                showModulesSort
                initialSortBy={status === 'draft' ? 'modules' : 'updated'}
              />
            )}
          </div>
        </section>

        <p className="text-center text-xs text-slate-500">
          Public catalogue:{' '}
          <Link href="/courses" className="text-[#146fc2] underline-offset-2 hover:underline">
            /courses
          </Link>
          . Disciplines follow <AcronymTooltip term="IICRC" /> groupings.
        </p>
      </div>
    </main>
  );
}
