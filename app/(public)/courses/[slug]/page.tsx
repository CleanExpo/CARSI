import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { Metadata } from 'next';
import { CourseViewTracker } from '@/components/analytics/CourseViewTracker';
import { CoursesIndexLink } from '@/components/lms/CoursesIndexLink';
import { EnrolButton } from '@/components/lms/EnrolButton';
import { CourseFormattedBody } from '@/components/lms/CourseFormattedBody';
import { CourseThumbnail } from '@/components/lms/CourseThumbnail';
import { CourseHubContext } from '@/components/lms/CourseHubContext';
import { CourseSchema, BreadcrumbSchema, VideoObjectSchema } from '@/components/seo';
import { SchemaMarkup, buildFaqSchema } from '@/lib/schema';
import { getCourseMarketing } from '@/lib/seo/course-marketing';
import { getBackendOrigin, getPublicSiteUrl } from '@/lib/env/public-url';
import { isOnboardingCourse } from '@/lib/onboarding/enterprise';
import { normalizePublicAssetUrl } from '@/lib/remote-image';
import { OG_IMAGES, OG_IMAGE_URLS } from '@/lib/seo/og-image';
import { getPublishedCourseDetailBySlugFromDatabase } from '@/lib/server/public-courses-list';
import { getAggregateRating } from '@/lib/server/course-reviews';
import { stripLegacyPurchaseCta } from '@/lib/lms/format-course-body';
import {
  getDesignationForCourseSlug,
  type DesignationDefinition,
} from '@/lib/designations/registry';

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

  const priceNum = parseFloat(course.price_aud);
  const thumbnailUrl = resolveAssetUrl(course.thumbnail_url);
  const priceText = course.is_free || priceNum === 0 ? 'Free' : `$${priceNum.toFixed(0)} AUD`;
  const designation = getDesignationForCourseSlug(slug);
  const disciplineText = designation ? `CARSI ${designation.disciplineTopic}` : 'restoration';

  const description =
    course.short_description ??
    course.description?.slice(0, 155) ??
    `${course.title} — ${disciplineText} training course. ${priceText}.`;

  // Prefer the hand-authored SEO card copy (data/seo/course-cards) when present,
  // falling back to the course-derived defaults for any un-carded course.
  const card = getCourseMarketing(slug);
  const metaTitle = card?.seoTitle ?? course.title;
  const metaDescription = card?.metaDescription ?? description;
  const ogTitle = card?.og?.title ?? `${course.title} | CARSI`;
  const ogDescription = card?.og?.description ?? description;
  const metaKeywords = card?.keywords ?? [
    course.title,
    designation?.name ?? '',
    designation?.disciplineTopic ?? '',
    'IICRC CEC course',
    'restoration course',
    'CARSI',
  ].filter(Boolean);
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

const glassPanel = {
  background: 'rgba(255,255,255,0.04)',
  backdropFilter: 'blur(24px) saturate(160%)',
  WebkitBackdropFilter: 'blur(24px) saturate(160%)',
  border: '1px solid rgba(255,255,255,0.07)',
} as const;

const glassPanelSubtle = {
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.06)',
} as const;

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
  const audienceItems = getAudienceItems(course, designation);

  const breadcrumbs = [
    { name: 'Home', url: siteUrl },
    { name: 'Courses', url: `${siteUrl}/courses` },
    { name: course.title, url: `${siteUrl}/courses/${slug}` },
  ];

  // AggregateRating for Course rich results — omit silently if unavailable (build/no reviews).
  const aggregateRating = course.id
    ? await getAggregateRating(course.id).catch(() => null)
    : null;

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
        const faqs = getCourseMarketing(slug)?.faq;
        return faqs?.length ? <SchemaMarkup schema={buildFaqSchema({ faqs })} /> : null;
      })()}

      <main id="main-content" className="relative min-h-screen" style={{ background: '#060a14' }}>
        {/* ── Mesh background ── */}
        <div className="mesh-bg" aria-hidden="true">
          <div className="mesh-blob mesh-blob-1" />
          <div className="mesh-blob mesh-blob-2" />
        </div>

        {/* ── Hero Section ── */}
        <section className="relative z-10">
          <div
            style={{
              background: 'linear-gradient(180deg, rgba(237,157,36,0.06) 0%, transparent 100%)',
            }}
          >
            <div className="mx-auto max-w-[1200px] px-4 pt-8 pb-12 sm:px-6 lg:px-8">
              {/* Breadcrumb nav */}
              <nav className="mb-8" aria-label="Breadcrumb">
                <ol
                  className="flex items-center gap-1.5 text-xs"
                  style={{ color: 'rgba(255,255,255,0.6)' }}
                >
                  <li>
                    <Link href="/" className="transition-colors hover:text-white/60">
                      Home
                    </Link>
                  </li>
                  <li aria-hidden="true">/</li>
                  <li>
                    <CoursesIndexLink className="transition-colors hover:text-white/60">
                      Courses
                    </CoursesIndexLink>
                  </li>
                  <li aria-hidden="true">/</li>
                  <li style={{ color: 'rgba(255,255,255,0.55)' }}>{course.title}</li>
                </ol>
              </nav>

              <div className="grid grid-cols-1 gap-10 lg:grid-cols-3">
                {/* ── Hero Left: Title & Meta ── */}
                <div className="lg:col-span-2">
                  {/* Badges */}
                  <div className="mb-5 flex flex-wrap items-center gap-2">
                    {designation && (
                      <span
                        className="rounded-sm px-2.5 py-1 text-xs font-semibold tracking-wide uppercase"
                        style={{
                          background: 'rgba(237,157,36,0.15)',
                          color: '#ed9d24',
                          border: '1px solid rgba(237,157,36,0.25)',
                        }}
                      >
                        CARSI Designation
                      </span>
                    )}
                    {course.level && (
                      <span
                        className="rounded-sm px-2.5 py-1 text-xs font-medium"
                        style={{
                          background: 'rgba(255,255,255,0.06)',
                          color: 'rgba(255,255,255,0.6)',
                          border: '1px solid rgba(255,255,255,0.08)',
                        }}
                      >
                        {course.level}
                      </span>
                    )}
                    {course.category && (
                      <span
                        className="rounded-sm px-2.5 py-1 text-xs font-medium"
                        style={{
                          background: 'rgba(255,255,255,0.06)',
                          color: 'rgba(255,255,255,0.6)',
                          border: '1px solid rgba(255,255,255,0.08)',
                        }}
                      >
                        {course.category}
                      </span>
                    )}
                    {course.cec_hours && (
                      <span
                        className="rounded-sm px-2.5 py-1 text-xs font-medium"
                        style={{
                          background: 'rgba(0,245,255,0.08)',
                          color: '#00F5FF',
                          border: '1px solid rgba(0,245,255,0.15)',
                        }}
                      >
                        {course.cec_hours} CECs
                      </span>
                    )}
                  </div>

                  {/* Title */}
                  <h1
                    className="mb-4 text-3xl leading-tight font-bold tracking-tight sm:text-4xl lg:text-5xl"
                    style={{ color: 'rgba(255,255,255,0.95)' }}
                  >
                    {course.title}
                  </h1>

                  {/* CARSI designation this course earns */}
                  {designation && (
                    <p
                      className="mb-4 text-sm font-medium tracking-wide"
                      style={{ color: '#ed9d24' }}
                    >
                      Earns the {designation.name}
                    </p>
                  )}

                  {/* Star rating (social proof) — only when the course has published reviews */}
                  {aggregateRating && (
                    <div
                      className="mb-4 inline-flex items-center gap-2"
                      aria-label={`Rated ${aggregateRating.ratingValue} out of 5 from ${aggregateRating.reviewCount} reviews`}
                    >
                      <span aria-hidden style={{ color: '#ed9d24', letterSpacing: '2px', fontSize: '18px' }}>
                        {'★'.repeat(Math.round(aggregateRating.ratingValue))}
                        <span style={{ color: 'rgba(255,255,255,0.25)' }}>
                          {'★'.repeat(5 - Math.round(aggregateRating.ratingValue))}
                        </span>
                      </span>
                      <span className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.9)' }}>
                        {aggregateRating.ratingValue.toFixed(1)}
                      </span>
                      <span className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
                        ({aggregateRating.reviewCount} review{aggregateRating.reviewCount === 1 ? '' : 's'})
                      </span>
                    </div>
                  )}

                  {/* Short description or description excerpt */}
                  <p
                    className="mb-6 max-w-2xl text-base leading-relaxed sm:text-lg"
                    style={{ color: 'rgba(255,255,255,0.55)' }}
                  >
                    {course.short_description ??
                      course.description?.slice(0, 280) ??
                      'Australian-produced restoration training — a CARSI credential that also earns IICRC CECs.'}
                  </p>

                  {/* Instructor */}
                  {course.instructor && (
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-10 w-10 items-center justify-center rounded-sm text-sm font-bold"
                        style={{
                          background: 'rgba(237,157,36,0.15)',
                          color: '#ed9d24',
                          border: '1px solid rgba(237,157,36,0.2)',
                        }}
                      >
                        {course.instructor.full_name
                          .split(' ')
                          .map((n) => n[0])
                          .join('')
                          .slice(0, 2)}
                      </div>
                      <div>
                        <p
                          className="text-sm font-medium"
                          style={{ color: 'rgba(255,255,255,0.8)' }}
                        >
                          {course.instructor.full_name}
                        </p>
                        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>
                          Course Instructor
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Quick stats row — mobile only (desktop has sidebar) */}
                  <div
                    className="mt-8 grid grid-cols-3 gap-4 rounded-sm p-4 lg:hidden"
                    style={glassPanelSubtle}
                  >
                    <div className="text-center">
                      <p className="text-lg font-bold" style={{ color: '#ed9d24' }}>
                        {price}
                      </p>
                      <p className="text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>
                        {course.is_free || priceNum === 0 ? 'No cost' : 'AUD'}
                      </p>
                    </div>
                    {course.cec_hours && (
                      <div className="text-center">
                        <p className="text-lg font-bold" style={{ color: '#00F5FF' }}>
                          {course.cec_hours}
                        </p>
                        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>
                          CECs
                        </p>
                      </div>
                    )}
                    {course.duration_hours && (
                      <div className="text-center">
                        <p className="text-lg font-bold" style={{ color: 'rgba(255,255,255,0.8)' }}>
                          {course.duration_hours}h
                        </p>
                        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>
                          Duration
                        </p>
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
                        <video
                          controls
                          preload="metadata"
                          poster={thumbnailUrl ?? undefined}
                          className="aspect-video w-full"
                          src={course.intro_video_url}
                        >
                          Your browser does not support the video tag.
                        </video>
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
                      cecHours={course.cec_hours}
                      durationHours={course.duration_hours}
                      shortDescription={course.short_description}
                      instructorName={course.instructor?.full_name ?? null}
                    />

                    {/* Price card */}
                    <div className="rounded-sm p-6" style={glassPanel}>
                      {/* Price */}
                      <div className="mb-1">
                        <span
                          className="text-3xl font-bold"
                          style={{ color: 'rgba(255,255,255,0.95)' }}
                        >
                          {price}
                        </span>
                        {!course.is_free && priceNum > 0 && (
                          <span
                            className="ml-2 text-sm"
                            style={{ color: 'rgba(255,255,255,0.6)' }}
                          >
                            AUD
                          </span>
                        )}
                      </div>
                      <p className="mb-6 text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>
                        {course.is_free || priceNum === 0
                          ? 'Free access — no payment required'
                          : 'One-time payment — lifetime access'}
                      </p>

                      {/* Enrol CTA */}
                      <div className="mb-6">
                        <EnrolButton
                          slug={course.slug}
                          priceAud={priceNum}
                          isFree={course.is_free}
                        />
                      </div>

                      {/* Pro subscription note */}
                      <p
                        className="mb-6 text-center text-xs"
                        style={{ color: 'rgba(255,255,255,0.7)' }}
                      >
                        or included with{' '}
                        <Link
                          href="/subscribe"
                          className="underline transition-colors"
                          style={{ color: '#00F5FF' }}
                        >
                          CARSI Pro
                        </Link>{' '}
                        — $795/yr
                      </p>

                      {/* Divider */}
                      <div
                        className="mb-5"
                        style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
                      />

                      {/* Course meta */}
                      <div className="space-y-3">
                        {course.duration_hours && (
                          <div className="flex items-center justify-between text-sm">
                            <span style={{ color: 'rgba(255,255,255,0.65)' }}>Duration</span>
                            <span style={{ color: 'rgba(255,255,255,0.8)' }}>
                              {course.duration_hours} hours
                            </span>
                          </div>
                        )}
                        {course.cec_hours && (
                          <div className="flex items-center justify-between text-sm">
                            <span style={{ color: 'rgba(255,255,255,0.65)' }}>CECs awarded</span>
                            <span style={{ color: '#00F5FF' }}>{course.cec_hours} credits</span>
                          </div>
                        )}
                        {course.level && (
                          <div className="flex items-center justify-between text-sm">
                            <span style={{ color: 'rgba(255,255,255,0.65)' }}>Level</span>
                            <span style={{ color: 'rgba(255,255,255,0.8)' }}>{course.level}</span>
                          </div>
                        )}
                        {designation && (
                          <div className="flex items-center justify-between gap-4 text-sm">
                            <span style={{ color: 'rgba(255,255,255,0.65)' }}>Designation</span>
                            <span className="text-right" style={{ color: '#ed9d24' }}>
                              {designation.name}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center justify-between text-sm">
                          <span style={{ color: 'rgba(255,255,255,0.65)' }}>Format</span>
                          <span style={{ color: 'rgba(255,255,255,0.8)' }}>
                            Online / Self-paced
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span style={{ color: 'rgba(255,255,255,0.65)' }}>Certificate</span>
                          <span style={{ color: 'rgba(255,255,255,0.8)' }}>Digital credential</span>
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
          </div>
        </section>

        {/* ── Content Sections ── */}
        <div className="relative z-10 mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-3">
            {/* Left column: content sections */}
            <div className="space-y-10 pb-20 lg:col-span-2">
              {/* ── Full Description ── */}
              {course.description && (
                <section>
                  <h2
                    className="mb-4 text-xl font-bold"
                    style={{ color: 'rgba(255,255,255,0.92)' }}
                  >
                    About This Course
                  </h2>
                  <div className="rounded-sm p-6" style={glassPanelSubtle}>
                    <CourseFormattedBody text={course.description} />
                  </div>
                </section>
              )}

              {/* ── What You'll Learn ── */}
              <section>
                <h2 className="mb-4 text-xl font-bold" style={{ color: 'rgba(255,255,255,0.92)' }}>
                  What You&apos;ll Learn
                </h2>
                <div className="rounded-sm p-6" style={glassPanel}>
                  <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {learningOutcomes.map((outcome) => (
                      <li key={outcome} className="flex items-start gap-3">
                        <span
                          className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-sm text-xs"
                          style={{
                            background: 'rgba(0,255,136,0.1)',
                            color: '#00FF88',
                          }}
                          aria-hidden="true"
                        >
                          &#10003;
                        </span>
                        <span
                          className="text-sm leading-relaxed"
                          style={{ color: 'rgba(255,255,255,0.7)' }}
                        >
                          {outcome}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </section>

              {/* ── Course Details Grid ── */}
              <section>
                <h2 className="mb-4 text-xl font-bold" style={{ color: 'rgba(255,255,255,0.92)' }}>
                  Course Details
                </h2>
                <div
                  className="grid grid-cols-2 gap-px overflow-hidden rounded-sm sm:grid-cols-3"
                  style={{ background: 'rgba(255,255,255,0.06)' }}
                >
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
                    <div key={item.label} className="p-5" style={{ background: '#060a14' }}>
                      <p
                        className="mb-1 text-xs font-medium tracking-wider uppercase"
                        style={{ color: 'rgba(255,255,255,0.7)' }}
                      >
                        {item.label}
                      </p>
                      <p
                        className="text-sm font-semibold"
                        style={{
                          color: item.accent ? '#ed9d24' : 'rgba(255,255,255,0.8)',
                        }}
                      >
                        {item.value}
                      </p>
                    </div>
                  ))}
                </div>
              </section>

              {/* ── Who This Course Is For ── */}
              <section>
                <h2 className="mb-4 text-xl font-bold" style={{ color: 'rgba(255,255,255,0.92)' }}>
                  Who This Course Is For
                </h2>
                <div className="rounded-sm p-6" style={glassPanelSubtle}>
                  <ul className="space-y-3">
                    {audienceItems.map((item) => (
                      <li key={item} className="flex items-start gap-3">
                        <span
                          className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-sm text-xs"
                          style={{
                            background: 'rgba(237,157,36,0.1)',
                            color: '#ed9d24',
                          }}
                          aria-hidden="true"
                        >
                          &#8594;
                        </span>
                        <span
                          className="text-sm leading-relaxed"
                          style={{ color: 'rgba(255,255,255,0.6)' }}
                        >
                          {item}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </section>

              {/* ── Credential & CEC Section ── */}
              <section>
                <h2 className="mb-4 text-xl font-bold" style={{ color: 'rgba(255,255,255,0.92)' }}>
                  Credential &amp; CECs
                </h2>
                <div className="rounded-sm p-6" style={glassPanel}>
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <div>
                      <div
                        className="mb-3 flex h-10 w-10 items-center justify-center rounded-sm"
                        style={{
                          background: 'rgba(0,245,255,0.08)',
                          border: '1px solid rgba(0,245,255,0.15)',
                        }}
                      >
                        <span style={{ color: '#00F5FF', fontSize: '18px' }}>&#9733;</span>
                      </div>
                      <h3
                        className="mb-1 text-sm font-semibold"
                        style={{ color: 'rgba(255,255,255,0.85)' }}
                      >
                        Digital Credential
                      </h3>
                      <p
                        className="text-xs leading-relaxed"
                        style={{ color: 'rgba(255,255,255,0.7)' }}
                      >
                        Receive a verifiable digital credential with a unique public URL. Share
                        directly to LinkedIn or include in job applications.
                      </p>
                    </div>
                    <div>
                      <div
                        className="mb-3 flex h-10 w-10 items-center justify-center rounded-sm"
                        style={{
                          background: 'rgba(237,157,36,0.1)',
                          border: '1px solid rgba(237,157,36,0.2)',
                        }}
                      >
                        <span style={{ color: '#ed9d24', fontSize: '18px' }}>&#9670;</span>
                      </div>
                      <h3
                        className="mb-1 text-sm font-semibold"
                        style={{ color: 'rgba(255,255,255,0.85)' }}
                      >
                        IICRC CEC Tracking
                      </h3>
                      <p
                        className="text-xs leading-relaxed"
                        style={{ color: 'rgba(255,255,255,0.7)' }}
                      >
                        {course.cec_hours
                          ? `This course awards ${course.cec_hours} IICRC Continuing Education Credits. Credits are automatically recorded and exportable for IICRC submission.`
                          : 'Continuing Education Credits are tracked automatically in your CARSI dashboard and exportable for IICRC submission.'}
                      </p>
                    </div>
                  </div>
                  <p
                    className="mt-6 border-t pt-4 text-xs leading-relaxed"
                    style={{
                      color: 'rgba(255,255,255,0.6)',
                      borderColor: 'rgba(255,255,255,0.08)',
                    }}
                  >
                    {designation ? `${designation.name} is a CARSI credential that ` : 'This CARSI course '}
                    complements the IICRC — it is Southern-Hemisphere training the IICRC does not
                    offer, not an IICRC certification. It earns IICRC Continuing Education Credits
                    (CECs) toward maintaining an existing IICRC certification, which is obtained
                    separately through IICRC-approved schools and examinations.
                  </p>
                </div>
              </section>

              {/* ── Career context (mobile) ── */}
              <div className="lg:hidden">
                <CourseHubContext discipline={designation?.disciplineTopic ?? ''} slug={course.slug} />
              </div>
            </div>

            {/* Right column: empty spacer for desktop layout alignment (sticky card is in hero) */}
            <div className="hidden lg:block" aria-hidden="true" />
          </div>
        </div>

        {/* ── Bottom CTA ── */}
        <section className="relative z-10">
          <div
            style={{
              background: 'linear-gradient(180deg, transparent 0%, rgba(237,157,36,0.04) 100%)',
            }}
          >
            <div className="mx-auto max-w-[800px] px-4 py-20 text-center sm:px-6">
              <h2
                className="mb-3 text-2xl font-bold sm:text-3xl"
                style={{ color: 'rgba(255,255,255,0.92)' }}
              >
                Ready to advance your career?
              </h2>
              <p
                className="mx-auto mb-8 max-w-lg text-sm leading-relaxed"
                style={{ color: 'rgba(255,255,255,0.7)' }}
              >
                {course.cec_hours
                  ? `Earn ${course.cec_hours} IICRC CECs and receive a verifiable digital credential upon completion of ${course.title}.`
                  : `Complete ${course.title} and receive a verifiable digital credential for your professional portfolio.`}
              </p>

              <div className="mx-auto flex max-w-sm flex-col items-center gap-4">
                <div className="w-full">
                  <EnrolButton slug={course.slug} priceAud={priceNum} isFree={course.is_free} />
                </div>
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.7)' }}>
                  {course.is_free || priceNum === 0
                    ? 'Free — no payment or credit card required'
                    : 'Secure checkout — or access all courses with CARSI Pro'}
                </p>
              </div>

              <div className="mt-8">
                <CoursesIndexLink
                  className="text-sm underline transition-colors"
                  style={{ color: 'rgba(255,255,255,0.6)' }}
                >
                  Browse all courses
                </CoursesIndexLink>
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
