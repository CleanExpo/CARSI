import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { CourseFormattedBody } from '@/components/lms/CourseFormattedBody';
import { CourseThumbnail } from '@/components/lms/CourseThumbnail';
import { EnrolButton } from '@/components/lms/EnrolButton';
import { dash } from '@/lib/dashboard-light-ui';
import { isOnboardingCourse } from '@/lib/onboarding/enterprise';
import { normalizePublicAssetUrl } from '@/lib/remote-image';
import { getBackendOrigin } from '@/lib/env/public-url';
import { getCourse, generateMetadata } from '../../../../(public)/courses/[slug]/page';

export { generateMetadata };

export const dynamic = 'force-dynamic';

function resolveAssetUrl(url?: string | null): string | null {
  const normalized = normalizePublicAssetUrl(url);
  if (!normalized) return null;
  if (normalized.startsWith('http://') || normalized.startsWith('https://')) return normalized;
  const backendUrl = getBackendOrigin().replace(/\/$/, '');
  const path = normalized.startsWith('/') ? normalized : `/${normalized}`;
  return `${backendUrl}${path}`;
}

export default async function DashboardCourseDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const normalizedSlug = slug.trim().toLowerCase();

  if (isOnboardingCourse({ slug: normalizedSlug })) {
    redirect(`/dashboard/onboarding/${normalizedSlug}`);
  }

  const course = await getCourse(normalizedSlug);
  if (!course) notFound();

  if (isOnboardingCourse({ slug: course.slug, category: course.category })) {
    redirect(`/dashboard/onboarding/${course.slug}`);
  }

  const priceNum = parseFloat(course.price_aud);
  const price = course.is_free || priceNum === 0 ? 'Free' : `$${priceNum.toFixed(0)}`;
  const thumbnailUrl = resolveAssetUrl(course.thumbnail_url);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-8 pb-12">
      <nav className="text-xs text-slate-500" aria-label="Breadcrumb">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li>
            <Link href="/dashboard/student" className="text-[#146fc2] hover:underline">
              My learning
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link href="/dashboard/courses" className="text-[#146fc2] hover:underline">
              Browse courses
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="text-slate-700">{course.title}</li>
        </ol>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <header className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {course.iicrc_discipline ? (
                <span className="rounded-md border border-[#2490ed]/25 bg-[#eef7ff] px-2.5 py-1 text-xs font-semibold text-[#146fc2] uppercase">
                  IICRC {course.iicrc_discipline}
                </span>
              ) : null}
              {course.level ? (
                <span className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600">
                  {course.level}
                </span>
              ) : null}
              {course.cec_hours ? (
                <span className="rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                  {course.cec_hours} CECs
                </span>
              ) : null}
            </div>
            <h1 className={dash.h1}>{course.title}</h1>
            <p className={dash.lead}>
              {course.short_description ??
                course.description?.slice(0, 280) ??
                'Professional restoration training aligned with IICRC standards.'}
            </p>
            {course.instructor ? (
              <p className="text-sm text-slate-600">
                Instructor:{' '}
                <span className="font-medium text-slate-800">{course.instructor.full_name}</span>
              </p>
            ) : null}
          </header>

          {course.description ? (
            <section className={`${dash.panel} p-6 sm:p-8`}>
              <h2 className={`mb-4 ${dash.h2}`}>About this course</h2>
              <CourseFormattedBody text={course.description} tone="light" />
            </section>
          ) : null}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <CourseThumbnail
            src={thumbnailUrl}
            title={course.title}
            category={course.category}
            discipline={course.iicrc_discipline}
            priceLabel={course.is_free || priceNum === 0 ? 'Free' : `$${priceNum.toFixed(0)} AUD`}
            isFree={course.is_free || priceNum === 0}
            moduleCount={course.module_count ?? null}
            level={course.level}
            cecHours={course.cec_hours}
            durationHours={course.duration_hours}
            shortDescription={course.short_description}
            instructorName={course.instructor?.full_name ?? null}
          />

          <div className={`${dash.panel} space-y-4 p-6`}>
            <div>
              <p className="text-3xl font-bold text-slate-900">{price}</p>
              <p className="mt-1 text-xs text-slate-500">
                {course.is_free || priceNum === 0
                  ? 'Free access — no payment required'
                  : 'One-time payment — lifetime access'}
              </p>
            </div>
            <EnrolButton slug={course.slug} priceAud={priceNum} isFree={course.is_free} />
            <dl className="space-y-2 border-t border-slate-200 pt-4 text-sm">
              {course.duration_hours ? (
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">Duration</dt>
                  <dd className="font-medium text-slate-800">{course.duration_hours} hours</dd>
                </div>
              ) : null}
              {course.cec_hours ? (
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">CECs awarded</dt>
                  <dd className="font-medium text-emerald-700">{course.cec_hours} credits</dd>
                </div>
              ) : null}
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Format</dt>
                <dd className="font-medium text-slate-800">Online / self-paced</dd>
              </div>
            </dl>
          </div>

          <Link
            href={`/dashboard/learn/${encodeURIComponent(course.slug)}`}
            className={`${dash.btnSecondary} w-full justify-center`}
          >
            Open in course player
          </Link>
        </aside>
      </div>
    </div>
  );
}
