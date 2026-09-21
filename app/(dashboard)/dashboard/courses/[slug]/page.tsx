import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { CourseDetailOutline } from '@/components/lms/CourseDetailOutline';
import { CourseFormattedBody } from '@/components/lms/CourseFormattedBody';
import { CourseReviews } from '@/components/lms/CourseReviews';
import { EnrolButton } from '@/components/lms/EnrolButton';
import { dash } from '@/lib/dashboard-light-ui';
import { courseDetailPrimaryAction } from '@/lib/learner-course-cta';
import { isOnboardingCourse } from '@/lib/onboarding/enterprise';
import { getOnboardingLearnPath } from '@/lib/onboarding/navigation';
import { getEnrollmentsForStudent } from '@/lib/server/learner-dashboard-data';
import { getServerSessionClaims } from '@/lib/server/session-server';
import { getCourse, generateMetadata } from '../../../../(public)/courses/[slug]/page';

export { generateMetadata };

export const dynamic = 'force-dynamic';

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

  const claims = await getServerSessionClaims();
  const enrollments =
    claims && process.env.DATABASE_URL?.trim()
      ? await getEnrollmentsForStudent(claims.sub)
      : [];
  const enrollment = enrollments.find((e) => e.course_slug === course.slug) ?? null;
  const completed =
    enrollment?.all_lessons_complete === true || enrollment?.status === 'completed';
  const action = courseDetailPrimaryAction({
    enrolled: Boolean(enrollment),
    percent: enrollment?.completion_percentage ?? 0,
    completed,
  });
  const learnHref = enrollment?.last_lesson_id
    ? getOnboardingLearnPath(course.slug, enrollment.last_lesson_id)
    : getOnboardingLearnPath(course.slug);
  const priceNum = parseFloat(course.price_aud);
  const description =
    course.short_description ?? course.description?.slice(0, 280) ?? null;
  const syllabus = (course.syllabus ?? []).map((m) => ({
    id: m.id,
    title: m.title,
    lessons: m.lessons.map((l) => ({ id: l.id, title: l.title })),
  }));

  return (
    <div className="mx-auto w-full max-w-5xl space-y-8 pb-12">
      <p>
        <Link href="/dashboard/courses" className="text-sm font-medium text-[#146fc2] hover:underline">
          ← Back to catalogue
        </Link>
      </p>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-8">
          <header>
            <h1 className={dash.h1}>{course.title}</h1>
            {description ? <p className={`mt-3 ${dash.lead}`}>{description}</p> : null}
            <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-600">
              {course.cec_hours ? (
                <div>
                  <dt className="sr-only">CEC hours</dt>
                  <dd>{course.cec_hours} CEC</dd>
                </div>
              ) : null}
              {course.duration_hours ? (
                <div>
                  <dt className="sr-only">Duration</dt>
                  <dd>{course.duration_hours} hours</dd>
                </div>
              ) : null}
              {course.lesson_count ? (
                <div>
                  <dt className="sr-only">Lessons</dt>
                  <dd>
                    {course.lesson_count} lesson{course.lesson_count === 1 ? '' : 's'}
                  </dd>
                </div>
              ) : null}
              {course.level ? (
                <div>
                  <dt className="sr-only">Level</dt>
                  <dd>{course.level}</dd>
                </div>
              ) : null}
            </dl>
          </header>

          {course.description ? (
            <section>
              <h2 className={dash.h2}>About this course</h2>
              <div className="mt-3">
                <CourseFormattedBody text={course.description} tone="light" />
              </div>
            </section>
          ) : null}

          <CourseDetailOutline slug={course.slug} syllabus={syllabus} />

          <section>
            <CourseReviews slug={course.slug} />
          </section>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="text-2xl font-semibold text-slate-900">
              {course.is_free || priceNum === 0 ? 'Free' : `$${priceNum.toFixed(0)}`}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {action === 'enrol'
                ? 'Enrol to start this course.'
                : action === 'start'
                  ? 'Enrolled. Not started.'
                  : action === 'continue'
                    ? `${enrollment?.completion_percentage ?? 0}% complete`
                    : 'Course completed'}
            </p>
            <div className="mt-5">
              {action === 'enrol' ? (
                <EnrolButton slug={course.slug} priceAud={priceNum} isFree={course.is_free} />
              ) : (
                <Link href={learnHref} className={`${dash.btnPrimary} w-full justify-center`}>
                  {action === 'start'
                    ? 'Start course'
                    : action === 'continue'
                      ? 'Continue course'
                      : 'View course'}
                </Link>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
