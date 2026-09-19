import { CourseViewTracker } from '@/components/analytics/CourseViewTracker';
import {
  LANDING_DISPLAY_H2_CLASS,
  LANDING_EYEBROW_CLASS,
  LANDING_LEAD_CLASS,
  PUBLIC_SHELL_INNER_CLASS,
} from '@/components/landing/public-shell-width';
import { CourseFormattedBody } from '@/components/lms/CourseFormattedBody';
import { CourseHubContext } from '@/components/lms/CourseHubContext';
import { CoursesIndexLink } from '@/components/lms/CoursesIndexLink';
import { CourseThumbnail } from '@/components/lms/CourseThumbnail';
import { EnrolButton } from '@/components/lms/EnrolButton';
import { BreadcrumbSchema, CourseSchema, VideoObjectSchema } from '@/components/seo';
import {
  getDesignationForCourseSlug,
  type DesignationDefinition,
} from '@/lib/designations/registry';
import { getBackendOrigin, getPublicSiteUrl } from '@/lib/env/public-url';
import { stripLegacyPurchaseCta } from '@/lib/lms/format-course-body';
import { isOnboardingCourse } from '@/lib/onboarding/enterprise';
import { normalizePublicAssetUrl } from '@/lib/remote-image';
import { SchemaMarkup, buildFaqSchema } from '@/lib/schema';
import {
  buildCourseFallbackKeywords,
  getCourseMarketing,
  resolveCourseMarketingTruth,
} from '@/lib/seo/course-marketing';
import { OG_IMAGES, OG_IMAGE_URLS } from '@/lib/seo/og-image';
import { getAggregateRating } from '@/lib/server/course-reviews';
import { getPublishedCourseDetailBySlugFromDatabase } from '@/lib/server/public-courses-list';
import { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

// ISR: render each course detail on demand and cache for 5 minutes (issue #129).
// Build-safe via the build-phase guard in getCourse's DB reader; publish busts the
// cache via revalidatePath in the admin workflow route.
export const revalidate = 300;

/**
 * Strip the legacy WooCommerce "Already Purchased This Course? → Access Here" lead block
 * (issue #126) from a loaded course so it leaks into neither the rendered hero nor the SEO
 * metadata / JSON-LD schema (which read `description` directly, bypassing CourseFormattedBody).
 */
function sanitizeCourseDetail<T extends { description?: string | null }>(course: T): T {
  if (!course.description) return course;
  return { ...course, description: stripLegacyPurchaseCta(course.description) };
}

interface CourseDetail {
  id: string;
  slug: string;
  title: string;
  description?: string | null;
  short_description?: string | null;
  price_aud: string;
  is_free: boolean;
  level?: string | null;
  category?: string | null;
  iicrc_discipline?: string | null;
  cec_hours?: string | null;
  duration_hours?: string | null;
  thumbnail_url?: string | null;
  module_count?: number | null;
  lesson_count?: number | null;
  syllabus?: {
    id: string;
    title: string;
    duration_minutes?: number | null;
    lessons: {
      id: string;
      title: string;
      content_type: string;
      is_preview: boolean;
      duration_minutes?: number | null;
      preview_body?: string | null;
    }[];
  }[];
  instructor?: { full_name: string } | null;
  intro_video_url?: string | null;
}

const backendUrl = getBackendOrigin();
const siteUrl = getPublicSiteUrl();

function resolveAssetUrl(url?: string | null): string | null {
  const normalized = normalizePublicAssetUrl(url);
  if (!normalized) return null;
  if (normalized.startsWith('http://') || normalized.startsWith('https://')) return normalized;
  const path = normalized.startsWith('/') ? normalized : `/${normalized}`;
  return `${backendUrl}${path}`;
}

function getCourseDerivedDescription(
  course: CourseDetail,
  designation: DesignationDefinition | null
): string {
  const priceNum = parseFloat(course.price_aud);
  const priceText = course.is_free || priceNum === 0 ? 'Free' : `$${priceNum.toFixed(0)} AUD`;
  const disciplineText = designation ? `CARSI ${designation.disciplineTopic}` : 'restoration';
  return (
    course.short_description ??
    course.description?.slice(0, 155) ??
    `${course.title} — ${disciplineText} training course. ${priceText}.`
  );
}

function getResolvedCourseMarketing(
  course: CourseDetail,
  designation: DesignationDefinition | null
) {
  const description = getCourseDerivedDescription(course, designation);
  return resolveCourseMarketingTruth({
    marketing: getCourseMarketing(course.slug),
    isFree: course.is_free,
    priceAud: course.price_aud,
    fallback: {
      seoTitle: course.title,
      metaDescription: description,
      ogTitle: `${course.title} | CARSI`,
      ogDescription: description,
      keywords: buildCourseFallbackKeywords({
        title: course.title,
        designationName: designation?.name,
        disciplineTopic: designation?.disciplineTopic,
        cecHoursLabel: course.cec_hours,
      }),
      imageAlt: course.title,
    },
  });
}

export async function getCourse(slug: string): Promise<CourseDetail | null> {
  if (process.env.DATABASE_URL?.trim()) {
    try {
      const fromDb = await getPublishedCourseDetailBySlugFromDatabase(slug);
      if (fromDb) return sanitizeCourseDetail(fromDb);
    } catch (e) {
      console.error('[courses/[slug]] Failed to load course from database', e);
    }
  }

  const base = backendUrl.replace(/\/$/, '');
  if (!base) return null;

  try {
    const res = await fetch(`${base}/api/lms/courses/${encodeURIComponent(slug)}`, {
      next: { revalidate: 60 },
    });
    if (res.status === 404) return null;
    if (!res.ok) return null;
    return sanitizeCourseDetail((await res.json()) as CourseDetail);
  } catch {
    return null;
  }
}

// Dynamic metadata for SEO
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const course = await getCourse(slug);

  if (!course) {
    return {
      title: 'Course Not Found',
      description: 'The requested course could not be found.',
    };
  }

  const thumbnailUrl = resolveAssetUrl(course.thumbnail_url);
  const designation = getDesignationForCourseSlug(slug);
  const description = getCourseDerivedDescription(course, designation);

  // Prefer the hand-authored SEO card copy (data/seo/course-cards) when present,
  // after reconciling it with course-derived commerce and CEC truth.
  const card = getResolvedCourseMarketing(course, designation);
  const metaTitle = card?.seoTitle ?? course.title;
  const metaDescription = card?.metaDescription ?? description;
  const ogTitle = card?.og?.title ?? `${course.title} | CARSI`;
  const ogDescription = card?.og?.description ?? description;
  const metaKeywords =
    card?.keywords ??
    buildCourseFallbackKeywords({
      title: course.title,
      designationName: designation?.name,
      disciplineTopic: designation?.disciplineTopic,
      cecHoursLabel: course.cec_hours,
    });
  const imageAlt = card?.imageAlt ?? course.title;

  return {
    title: metaTitle,
    description: metaDescription,
    keywords: metaKeywords,
    openGraph: {
      title: ogTitle,
      description: ogDescription,
      url: `${siteUrl}/courses/${slug}`,
      siteName: 'CARSI',
      images: thumbnailUrl
        ? [{ url: thumbnailUrl, width: 1200, height: 630, alt: imageAlt }]
        : OG_IMAGES,
      locale: 'en_AU',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: ogTitle,
      description: ogDescription,
      images: thumbnailUrl ? [thumbnailUrl] : OG_IMAGE_URLS,
    },
    alternates: {
      canonical: `${siteUrl}/courses/${slug}`,
    },
  };
}

/* ---------------------------------------------------------------------------
 * Helpers
 * --------------------------------------------------------------------------- */

function getLearningOutcomes(
  course: CourseDetail,
  designation: DesignationDefinition | null
): string[] {
  const outcomes: string[] = [];

  if (designation) {
    outcomes.push(
      `Work to the CARSI ${designation.disciplineTopic} standard, built for Southern-Hemisphere conditions`
    );
  }

  if (course.cec_hours) {
    outcomes.push(
      `Earn ${course.cec_hours} IICRC Continuing Education Credits (CECs) toward maintaining an existing IICRC certification`
    );
  }

  outcomes.push(
    'Apply current Australian and New Zealand methods to real-world restoration jobs',
    'Build competency in training the IICRC does not offer locally — a CARSI-issued credential, not an IICRC certification',
    'Receive a verifiable digital credential for your professional portfolio'
  );

  if (designation) {
    outcomes.push(`Complete a required step toward the ${designation.name} designation`);
  }

  return outcomes;
}

function getAudienceItems(
  course: CourseDetail,
  designation: DesignationDefinition | null
): string[] {
  if (designation) {
    return [
      `Restoration professionals working in ${designation.disciplineTopic}`,
      'Technicians earning IICRC Continuing Education Credits (CECs)',
      `Practitioners pursuing the ${designation.name} designation`,
      'Australian and New Zealand trade professionals expanding their qualifications',
    ];
  }
  return [
    'Restoration and cleaning industry professionals',
    'Technicians earning IICRC Continuing Education Credits (CECs)',
    'Trade professionals expanding their qualifications',
    'Business owners investing in team development',
  ];
}

/* ---------------------------------------------------------------------------
 * Inline style constants (Scientific Luxury glass panel system)
 * --------------------------------------------------------------------------- */

const panelClass = 'rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm';
const sectionHeadingClass = `mb-5 ${LANDING_DISPLAY_H2_CLASS} !text-[1.55rem] md:!text-[1.85rem]`;

/* ---------------------------------------------------------------------------
 * Page Component
 * --------------------------------------------------------------------------- */

export default async function CourseDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const course = await getCourse(slug);

  if (!course) notFound();

  if (isOnboardingCourse({ slug: course.slug, category: course.category })) {
    redirect(`/dashboard/onboarding/${course.slug}`);
  }

  const priceNum = parseFloat(course.price_aud);
  const price = course.is_free || priceNum === 0 ? 'Free' : `$${priceNum.toFixed(0)}`;
  const designation = getDesignationForCourseSlug(course.slug);
  const thumbnailUrl = resolveAssetUrl(course.thumbnail_url);
  const learningOutcomes = getLearningOutcomes(course, designation);

  // First preview lesson that actually carries a body. The server has already nulled
  // preview_body on every non-preview lesson, so this only ever selects permitted content.
  const previewLesson = course.syllabus
    ?.flatMap((m) => m.lessons)
    .find((l) => l.is_preview && l.preview_body);
  const audienceItems = getAudienceItems(course, designation);

  const breadcrumbs = [
    { name: 'Home', url: siteUrl },
    { name: 'Courses', url: `${siteUrl}/courses` },
    { name: course.title, url: `${siteUrl}/courses/${slug}` },
  ];

  // AggregateRating for Course rich results — omit silently if unavailable (build/no reviews).
  const aggregateRating = course.id ? await getAggregateRating(course.id).catch(() => null) : null;
  const resolvedMarketing = getResolvedCourseMarketing(course, designation);

  return (
    <>
      <CourseViewTracker slug={course.slug} title={course.title} />
      <CourseSchema
        name={course.title}
        description={course.description ?? course.short_description ?? course.title}
        url={`${siteUrl}/courses/${slug}`}
        price={priceNum}
        duration={course.duration_hours ?? undefined}
        educationalLevel={course.level ?? undefined}
        teaches={designation ? [designation.disciplineTopic] : undefined}
        aggregateRating={aggregateRating ?? undefined}
        credentialAwarded={designation?.name}
        authoredCourseJsonLd={resolvedMarketing?.courseJsonLd}
      />
      {course.intro_video_url ? (
        <VideoObjectSchema
          name={`${course.title} — course trailer`}
          description={course.short_description ?? course.description ?? course.title}
          thumbnailUrl={thumbnailUrl ?? undefined}
          url={course.intro_video_url}
          channelName="CARSI"
          channelUrl="https://carsi.com.au"
        />
      ) : null}
      <BreadcrumbSchema items={breadcrumbs} />
      {(() => {
        // AEO/GEO: FAQPage JSON-LD from the course's marketing metadata (data/seo/course-cards).
        const faqs = resolvedMarketing?.faq;
        return faqs?.length ? <SchemaMarkup schema={buildFaqSchema({ faqs })} /> : null;
      })()}

      <div>
        <section className="relative overflow-hidden border-b border-slate-200/70 bg-white">
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_80%_0%,rgba(36,144,237,0.10),transparent_58%)]"
            aria-hidden
          />
          <div className={`relative ${PUBLIC_SHELL_INNER_CLASS} pt-8 pb-16 md:pt-10 md:pb-20`}>
            <nav className="mb-8" aria-label="Breadcrumb">
              <ol className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                <li>
                  <Link href="/" className="transition-colors hover:text-[#146fc2]">
                    Home
                  </Link>
                </li>
                <li aria-hidden="true">/</li>
                <li>
                  <CoursesIndexLink className="transition-colors hover:text-[#146fc2]">
                    Courses
                  </CoursesIndexLink>
                </li>
                <li aria-hidden="true">/</li>
                <li className="text-slate-700">{course.title}</li>
              </ol>
            </nav>

            <div className="grid grid-cols-1 gap-10 lg:grid-cols-3">
              {/* ── Hero Left: Title & Meta ── */}
              <div className="lg:col-span-2">
                {/* Badges */}
                <div className="mb-5 flex flex-wrap items-center gap-2">
                  <p className={`${LANDING_EYEBROW_CLASS} mr-2`}>Course</p>
                  {designation && (
                    <span className="rounded-full border border-[#ed9d24]/35 bg-[#fff8ed] px-3 py-1 text-[11px] font-semibold tracking-wide text-[#a85500] uppercase">
                      CARSI Designation
                    </span>
                  )}
                  {course.level && (
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-medium text-slate-600">
                      {course.level}
                    </span>
                  )}
                  {course.category && (
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-medium text-slate-600">
                      {course.category}
                    </span>
                  )}
                  {course.cec_hours && (
                    <span className="rounded-full border border-[#b8dbfb] bg-[#eef5fb] px-3 py-1 text-[11px] font-medium text-[#146fc2]">
                      {course.cec_hours} CECs
                    </span>
                  )}
                </div>

                {/* Title */}
                <h1 className="mb-4 font-[family-name:var(--font-display)] text-[2rem] leading-[1.12] font-semibold tracking-[-0.02em] text-slate-950 sm:text-[2.6rem] lg:text-[3rem] lg:leading-[1.06]">
                  {course.title}
                </h1>

                {/* CARSI designation this course earns */}
                {designation && (
                  <p className="mb-4 text-sm font-semibold text-[#a85500]">
                    Earns the {designation.name}
                  </p>
                )}

                {/* Credential clarity, above the fold.
                      CARSI's strongest and most honest differentiator — that this is CARSI's own
                      credential and CARSI is a CEC provider rather than a certifying body — was
                      stated only in a mid-page bullet and again near the page bottom. A buyer
                      deciding whether the credential is worth anything had to scroll to find out.
                      Wording is fixed and licence-bound: "IICRC CEC Accredited" never appears
                      without CEC, and no discipline acronym brands the course
                      (CLAUDE.md § IICRC CEC terminology, enforced by check:iicrc-compliance). */}
                <p className={`mb-4 max-w-2xl ${LANDING_LEAD_CLASS}`}>
                  <span className="font-semibold text-slate-900">
                    A CARSI-issued credential — not an IICRC certification.
                  </span>{' '}
                  CARSI is an IICRC CEC Accredited provider, so this course counts toward
                  maintaining a certification you already hold. IICRC certification itself is
                  obtained through a school and examination approved by the IICRC.{' '}
                  {/* Both credential critics asked for a verification path. One already exists
                        and is public — app/(public)/verify/credential/[credentialId] and
                        /verify/training-record, neither auth-gated — but the course page linked
                        it zero times, so the buyer had no way to know the credential is checkable
                        at source. Surface it where the credential is sold. */}
                  <Link
                    href="/verify/training-record"
                    className="font-semibold text-[#146fc2] underline underline-offset-2"
                  >
                    Every CARSI credential gets a public verification page
                  </Link>{' '}
                  an employer or insurer can check without contacting us.
                </p>

                {/* Star rating (social proof) — only when the course has published reviews */}
                {aggregateRating && (
                  <div
                    className="mb-4 inline-flex items-center gap-2"
                    aria-label={`Rated ${aggregateRating.ratingValue} out of 5 from ${aggregateRating.reviewCount} reviews`}
                  >
                    <span aria-hidden className="text-lg tracking-[2px] text-[#ed9d24]">
                      {'★'.repeat(Math.round(aggregateRating.ratingValue))}
                      <span className="text-slate-300">
                        {'★'.repeat(5 - Math.round(aggregateRating.ratingValue))}
                      </span>
                    </span>
                    <span className="text-sm font-semibold text-slate-950">
                      {aggregateRating.ratingValue.toFixed(1)}
                    </span>
                    <span className="text-sm text-slate-500">
                      ({aggregateRating.reviewCount} review
                      {aggregateRating.reviewCount === 1 ? '' : 's'})
                    </span>
                  </div>
                )}

                {/* Short description or description excerpt */}
                <p className="mb-6 max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg">
                  {course.short_description ??
                    course.description?.slice(0, 280) ??
                    'Australian-produced restoration training built for the Southern-Hemisphere restoration industry.'}
                </p>

                {/* Instructor */}
                {course.instructor && (
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[#ed9d24]/30 bg-[#fff8ed] text-sm font-bold text-[#a85500]">
                      {course.instructor.full_name
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .slice(0, 2)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        {course.instructor.full_name}
                      </p>
                      <p className="text-xs text-slate-500">Course instructor</p>
                    </div>
                  </div>
                )}

                {/* Quick stats row — mobile only (desktop has sidebar) */}
                <div className="mt-8 grid grid-cols-3 gap-4 rounded-2xl border border-slate-200/80 bg-slate-50 p-4 lg:hidden">
                  <div className="text-center">
                    <p className="text-lg font-semibold text-[#a85500]">{price}</p>
                    <p className="text-xs text-slate-500">
                      {course.is_free || priceNum === 0 ? 'No cost' : 'AUD'}
                    </p>
                  </div>
                  {course.cec_hours && (
                    <div className="text-center">
                      <p className="text-lg font-semibold text-[#146fc2]">{course.cec_hours}</p>
                      <p className="text-xs text-slate-500">CECs</p>
                    </div>
                  )}
                  {course.duration_hours && (
                    <div className="text-center">
                      <p className="text-lg font-semibold text-slate-900">
                        {course.duration_hours}h
                      </p>
                      <p className="text-xs text-slate-500">Duration</p>
                    </div>
                  )}
                </div>

                {/* Mobile enrol button */}
                <div className="mt-6 lg:hidden">
                  <EnrolButton slug={course.slug} priceAud={priceNum} isFree={course.is_free} />
                </div>
              </div>

              {/* ── Hero Right: Sticky Price Card (desktop) ── */}
              <div className="hidden lg:block">
                <div className="sticky top-8">
                  {/* Intro/marketing video trailer (plays inline when the course has one) */}
                  {course.intro_video_url ? (
                    <div className="mb-4 overflow-hidden rounded-2xl border border-white/10 bg-black">
                      {/youtube\.com|youtu\.be/.test(course.intro_video_url) ? (
                        <iframe
                          src={(() => {
                            const url = course.intro_video_url;
                            const m = url.match(
                              /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/
                            );
                            const id = m ? m[1] : '';
                            return `https://www.youtube.com/embed/${id}?rel=0&modestbranding=1`;
                          })()}
                          title={`${course.title} — intro video`}
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                          className="aspect-video w-full"
                        />
                      ) : (
                        <video
                          controls
                          preload="metadata"
                          poster={thumbnailUrl ?? undefined}
                          className="aspect-video w-full"
                          src={course.intro_video_url}
                        >
                          Your browser does not support the video tag.
                        </video>
                      )}
                    </div>
                  ) : null}
                  {/* Thumbnail */}
                  <CourseThumbnail
                    src={thumbnailUrl}
                    title={course.title}
                    category={course.category}
                    discipline={designation?.disciplineTopic ?? null}
                    priceLabel={
                      course.is_free || priceNum === 0 ? 'Free' : `$${priceNum.toFixed(0)} AUD`
                    }
                    isFree={course.is_free || priceNum === 0}
                    moduleCount={course.module_count ?? null}
                    level={course.level}
                    cecHoursLabel={course.cec_hours}
                    durationHours={course.duration_hours}
                    shortDescription={course.short_description}
                    instructorName={course.instructor?.full_name ?? null}
                  />

                  {/* Price card */}
                  <div className={`${panelClass} mt-4`}>
                    <div className="mb-1">
                      <span className="font-[family-name:var(--font-display)] text-3xl font-semibold text-slate-950">
                        {price}
                      </span>
                      {!course.is_free && priceNum > 0 && (
                        <span className="ml-2 text-sm text-slate-500">AUD</span>
                      )}
                    </div>
                    <p className="mb-6 text-xs text-slate-500">
                      {course.is_free || priceNum === 0
                        ? 'Free access — no payment required'
                        : 'One-time payment — lifetime access'}
                    </p>

                    {/* Enrol CTA */}
                    <div className="mb-6">
                      <EnrolButton slug={course.slug} priceAud={priceNum} isFree={course.is_free} />
                    </div>

                    {/* Pro subscription note */}
                    <p className="mb-6 text-center text-xs text-slate-500">
                      or included with{' '}
                      <Link href="/subscribe" className="font-semibold text-[#146fc2] underline">
                        CARSI Pro
                      </Link>{' '}
                      — $795/yr
                    </p>

                    <div className="mb-5 border-t border-slate-200/80" />

                    <div className="space-y-3 text-sm">
                      {course.duration_hours && (
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Duration</span>
                          <span className="font-medium text-slate-900">
                            {course.duration_hours} hours
                          </span>
                        </div>
                      )}
                      {course.cec_hours && (
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">CECs awarded</span>
                          <span className="font-medium text-[#146fc2]">
                            {course.cec_hours} credits
                          </span>
                        </div>
                      )}
                      {course.level && (
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Level</span>
                          <span className="font-medium text-slate-900">{course.level}</span>
                        </div>
                      )}
                      {designation && (
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-slate-500">Designation</span>
                          <span className="text-right font-medium text-[#a85500]">
                            {designation.name}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Format</span>
                        <span className="font-medium text-slate-900">Online / Self-paced</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Certificate</span>
                        <span className="font-medium text-slate-900">Digital credential</span>
                      </div>
                    </div>
                  </div>

                  {/* Career context */}
                  <div className="mt-4">
                    <CourseHubContext
                      discipline={designation?.disciplineTopic ?? ''}
                      slug={course.slug}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Content Sections ── */}
        <div
          className={`relative border-t border-slate-200/70 bg-[#fafbfc] py-16 ${PUBLIC_SHELL_INNER_CLASS}`}
        >
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-3">
            {/* Left column: content sections */}
            <div className="space-y-10 pb-20 lg:col-span-2">
              {/* ── Full Description ── */}
              {course.description && (
                <section>
                  <h2 className={sectionHeadingClass}>About This Course</h2>
                  <div className={panelClass}>
                    <CourseFormattedBody text={course.description} tone="light" />
                  </div>
                </section>
              )}

              {/* ── What You'll Learn ── */}
              <section>
                <h2 className={sectionHeadingClass}>What You&apos;ll Learn</h2>
                <div className={panelClass}>
                  <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {learningOutcomes.map((outcome) => (
                      <li key={outcome} className="flex items-start gap-3">
                        <span
                          className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#e8f7ee] text-xs text-[#157a55]"
                          aria-hidden="true"
                        >
                          &#10003;
                        </span>
                        <span className="text-sm leading-relaxed text-slate-600">{outcome}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </section>

              {/* ── Syllabus ── */}
              {/* A bare module count cannot tell a buyer what two hours contains. The LMS already
                  stores every module and lesson title; name them. */}
              {course.syllabus && course.syllabus.length > 0 && (
                <section>
                  <h2 className={sectionHeadingClass}>Syllabus</h2>
                  <p className="mb-4 text-sm text-slate-500">
                    {course.syllabus.length} module{course.syllabus.length === 1 ? '' : 's'}
                    {course.lesson_count
                      ? ` · ${course.lesson_count} lesson${course.lesson_count === 1 ? '' : 's'}`
                      : ''}
                    {course.duration_hours ? ` · ${course.duration_hours}` : ''}
                  </p>
                  <ol className="space-y-4">
                    {course.syllabus.map((mod, modIndex) => (
                      <li key={mod.id} className={panelClass}>
                        <h3 className="mb-3 text-base font-semibold text-slate-950">
                          <span className="text-slate-400">Module {modIndex + 1}</span>
                          {' — '}
                          {mod.title}
                          {typeof mod.duration_minutes === 'number' && (
                            <span className="ml-2 text-sm font-normal text-slate-500">
                              {mod.duration_minutes} min
                            </span>
                          )}
                        </h3>
                        {mod.lessons.length > 0 && (
                          <ul className="space-y-2">
                            {mod.lessons.map((lesson) => (
                              <li
                                key={lesson.id}
                                className="flex items-start gap-3 text-sm leading-relaxed text-slate-600"
                              >
                                <span aria-hidden="true" className="text-slate-300">
                                  •
                                </span>
                                <span>
                                  {lesson.title}
                                  {typeof lesson.duration_minutes === 'number' && (
                                    <span className="ml-2 text-slate-400">
                                      {lesson.duration_minutes} min
                                    </span>
                                  )}
                                  {lesson.is_preview && (
                                    <span className="ml-2 rounded-full bg-[#eef5fb] px-2 py-0.5 text-xs font-medium text-[#146fc2]">
                                      Preview
                                    </span>
                                  )}
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </li>
                    ))}
                  </ol>
                </section>
              )}

              {/* ── Free preview lesson ── */}
              {/* The isPreview flag was previously only reachable through the curriculum API,
                  which 401s without a session and 403s without an enrolment — so the one
                  audience a preview exists for could never see one. Surface it before signup. */}
              {previewLesson?.preview_body && (
                <section>
                  <h2 className={sectionHeadingClass}>Read a free lesson</h2>
                  <div className={panelClass}>
                    <h3 className="mb-1 text-base font-semibold text-slate-950">
                      {previewLesson.title}
                    </h3>
                    <p className="mb-4 text-xs text-slate-500">Free preview — no account needed</p>
                    <CourseFormattedBody text={previewLesson.preview_body} tone="light" />
                  </div>
                </section>
              )}

              {/* ── Course Details Grid ── */}
              <section>
                <h2 className={sectionHeadingClass}>Course Details</h2>
                <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-slate-200 bg-slate-200/70 sm:grid-cols-3">
                  {[
                    {
                      label: 'Level',
                      value: course.level ?? 'All levels',
                      accent: false,
                    },
                    {
                      label: 'Designation',
                      value: designation ? designation.name : 'General',
                      accent: true,
                    },
                    ...(course.cec_hours
                      ? [
                          {
                            label: 'CEC Hours',
                            value: `${course.cec_hours} credits`,
                            accent: false,
                          },
                        ]
                      : []),
                    {
                      label: 'Duration',
                      value: course.duration_hours
                        ? `${course.duration_hours} hours`
                        : 'Self-paced',
                      accent: false,
                    },
                    {
                      label: 'Category',
                      value: course.category ?? 'Restoration',
                      accent: false,
                    },
                    {
                      label: 'Format',
                      value: 'Online — Self-paced',
                      accent: false,
                    },
                  ].map((item) => (
                    <div key={item.label} className="bg-white p-5">
                      <p className="mb-1 text-[11px] font-medium tracking-[0.16em] text-slate-400 uppercase">
                        {item.label}
                      </p>
                      <p
                        className={`text-sm font-semibold ${item.accent ? 'text-[#a85500]' : 'text-slate-900'}`}
                      >
                        {item.value}
                      </p>
                    </div>
                  ))}
                </div>
              </section>

              {/* ── Who This Course Is For ── */}
              <section>
                <h2 className={sectionHeadingClass}>Who This Course Is For</h2>
                <div className={panelClass}>
                  <ul className="space-y-3">
                    {audienceItems.map((item) => (
                      <li key={item} className="flex items-start gap-3">
                        <span
                          className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#fff8ed] text-xs text-[#a85500]"
                          aria-hidden="true"
                        >
                          &#8594;
                        </span>
                        <span className="text-sm leading-relaxed text-slate-500">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </section>

              {/* ── Credential & CEC Section ── */}
              <section>
                <h2 className={sectionHeadingClass}>Credential &amp; CECs</h2>
                <div className={panelClass}>
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <div>
                      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full border border-[#b8dbfb] bg-[#eef5fb]">
                        <span className="text-lg text-[#146fc2]">&#9733;</span>
                      </div>
                      <h3 className="mb-1 text-sm font-semibold text-slate-900">
                        Digital Credential
                      </h3>
                      <p className="text-sm text-xs leading-relaxed text-slate-600">
                        Receive a verifiable digital credential with a unique public URL. Share
                        directly to LinkedIn or include in job applications.
                      </p>
                    </div>
                    <div>
                      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full border border-[#ed9d24]/30 bg-[#fff8ed]">
                        <span className="text-lg text-[#a85500]">&#9670;</span>
                      </div>
                      <h3 className="mb-1 text-sm font-semibold text-slate-900">
                        {/* GP-498: only claim IICRC CEC tracking when this course has
                            registry-approved CEC hours; otherwise no CEC claim is made. */}
                        {course.cec_hours ? 'IICRC CEC Tracking' : 'Progress Tracking'}
                      </h3>
                      <p className="text-sm text-xs leading-relaxed text-slate-600">
                        {course.cec_hours
                          ? `This course awards ${course.cec_hours} IICRC Continuing Education Credits. Credits are automatically recorded and exportable for IICRC submission.`
                          : 'Your progress and completion are recorded automatically in your CARSI dashboard, with a verifiable digital credential on completion.'}
                      </p>
                    </div>
                  </div>
                  <p className="mt-6 border-t border-slate-200/80 pt-4 text-xs leading-relaxed text-slate-500">
                    {designation
                      ? `${designation.name} is a CARSI credential that `
                      : 'This CARSI course '}
                    complements the IICRC — it is Southern-Hemisphere training the IICRC does not
                    offer, not an IICRC certification.{' '}
                    {/* GP-498: assert this course earns CECs only when it has registry-approved
                        CEC hours; unapproved courses make no CEC-earning claim. */}
                    {course.cec_hours
                      ? 'It earns IICRC Continuing Education Credits (CECs) toward maintaining an existing IICRC certification, which is obtained separately through schools and examinations approved by the IICRC.'
                      : 'IICRC certification is obtained separately through schools and examinations approved by the IICRC.'}
                  </p>
                </div>
              </section>

              {/* ── Career context (mobile) ── */}
              <div className="lg:hidden">
                <CourseHubContext
                  discipline={designation?.disciplineTopic ?? ''}
                  slug={course.slug}
                />
              </div>
            </div>

            {/* Right column: empty spacer for desktop layout alignment (sticky card is in hero) */}
            <div className="hidden lg:block" aria-hidden="true" />
          </div>
        </div>

        {/* ── Bottom CTA ── */}
        <section className="relative overflow-hidden border-t border-slate-200/70 bg-[#eef5fb]">
          <div className={`mx-auto max-w-2xl py-20 text-center ${PUBLIC_SHELL_INNER_CLASS}`}>
            <p className={LANDING_EYEBROW_CLASS}>Enrol</p>
            <h2 className={`mt-3 ${LANDING_DISPLAY_H2_CLASS}`}>Ready to advance your career?</h2>
            <p className="mx-auto mb-8 max-w-lg text-sm leading-relaxed text-slate-600">
              {course.cec_hours
                ? `Earn ${course.cec_hours} IICRC CECs and receive a verifiable digital credential upon completion of ${course.title}.`
                : `Complete ${course.title} and receive a verifiable digital credential for your professional portfolio.`}
            </p>

            <div className="mx-auto flex max-w-sm flex-col items-center gap-4">
              <div className="w-full">
                <EnrolButton slug={course.slug} priceAud={priceNum} isFree={course.is_free} />
              </div>
              <p className="text-xs text-slate-500">
                {course.is_free || priceNum === 0
                  ? 'Free — no payment or credit card required'
                  : 'Secure checkout — or access all courses with CARSI Pro'}
              </p>
            </div>

            <div className="mt-8">
              <CoursesIndexLink className="text-sm text-slate-500 underline transition-colors">
                Browse all courses
              </CoursesIndexLink>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
