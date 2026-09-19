import { CourseViewTracker } from '@/components/analytics/CourseViewTracker';
import { CoursePublicDetail } from '@/components/lms/CoursePublicDetail';
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


      <CoursePublicDetail
        course={{
          slug: course.slug,
          title: course.title,
          description: course.description,
          short_description: course.short_description,
          price_aud: course.price_aud,
          is_free: course.is_free,
          level: course.level,
          category: course.category,
          cec_hours: course.cec_hours,
          duration_hours: course.duration_hours,
          thumbnailUrl,
          module_count: course.module_count,
          lesson_count: course.lesson_count,
          syllabus: course.syllabus,
          instructor: course.instructor,
          intro_video_url: course.intro_video_url,
        }}
        designation={designation}
        priceLabel={price}
        priceNum={priceNum}
        learningOutcomes={learningOutcomes}
        audienceItems={audienceItems}
        previewLesson={
          previewLesson?.preview_body
            ? { title: previewLesson.title, preview_body: previewLesson.preview_body }
            : null
        }
        aggregateRating={aggregateRating}
      />
    </>
  );
}
