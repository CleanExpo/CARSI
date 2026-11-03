import { AnimatedHero } from '@/components/landing/AnimatedHero';
import { HomeCertificationsSection } from '@/components/landing/HomeCertificationsSection';
import { HomeFaqSection } from '@/components/landing/HomeFaqSection';
import { HomeFeaturedCoursesSection } from '@/components/landing/HomeFeaturedCoursesSection';
import { HomeFinalCtaSection } from '@/components/landing/HomeFinalCtaSection';
import { HomeGrowthSection } from '@/components/landing/HomeGrowthSection';
import { HomeHowItWorksSection } from '@/components/landing/HomeHowItWorksSection';
import { HomeIndustriesSection } from '@/components/landing/HomeIndustriesSection';
import { HomePricingSection } from '@/components/landing/HomePricingSection';
import { HomeStorySection } from '@/components/landing/HomeStorySection';
import { HomeTestimonialsSection } from '@/components/landing/HomeTestimonialsSection';
import { HomeTrustStrip } from '@/components/landing/HomeTrustStrip';
import { PublicFooter } from '@/components/landing/PublicFooter';
import { PublicNavbar } from '@/components/landing/PublicNavbar';
import FloatingChatGate from '@/components/lms/FloatingChatGate';
import { FAQSchema } from '@/components/seo/JsonLd';
import type { CourseListItem } from '@/lib/course-list-item';
import { perCoursePriceLabel } from '@/lib/lms/pricing-tiers';
import { buildHomeFaqs } from '@/lib/marketing/home-faqs';
import { upcomingRoadshowStops } from '@/lib/marketing/roadshow-stops';
import {
  catalogueMetaDescription,
  formatCourseCountForCopy,
  getPublicCatalogueFacts,
  restorationTopicCount,
} from '@/lib/server/public-catalogue-facts';
import { getHomepageFeaturedCourses } from '@/lib/server/public-courses-list';
import { subscriptionsEnabled } from '@/lib/server/subscriptions-flag';
import type { Metadata } from 'next';

// ISR: serve a CDN-cached render, refreshed every 5 minutes, instead of SSR on every
// request (issue #129). Build-safe via the build-phase guard in the catalogue readers;
// publish busts the cache via revalidatePath in the admin workflow route.
export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const facts = await getPublicCatalogueFacts();
  return {
    description: catalogueMetaDescription(facts),
  };
}

async function getFeaturedCourses(): Promise<CourseListItem[]> {
  try {
    return await getHomepageFeaturedCourses();
  } catch (e) {
    console.error('[home] Failed to load featured courses from database', e);
    return [];
  }
}

const benefits = [
  '24/7 access, learn anytime, anywhere',
  'IICRC CEC Accredited courses',
  'Beginner, intermediate, and advanced levels',
  'Automatic credit tracking',
  'Verifiable digital credentials',
  'No travel, no downtime, no waiting',
];

export default async function Home() {
  const [featuredCourses, catalogueFacts] = await Promise.all([
    getFeaturedCourses(),
    getPublicCatalogueFacts(),
  ]);
  const faqs = buildHomeFaqs(catalogueFacts);
  const disciplineCountLabel = restorationTopicCount(catalogueFacts);
  const stats = [
    { value: '24/7', label: 'Study anytime' },
    { value: '12+', label: 'Industries served' },
    {
      value:
        catalogueFacts.publishedCourseCount > 0
          ? formatCourseCountForCopy(catalogueFacts.publishedCourseCount)
          : '70+',
      label: 'Courses',
    },
    {
      value: formatCourseCountForCopy(disciplineCountLabel),
      label: 'Restoration topics',
    },
  ];

  return (
    <div id="main-content" className="min-h-screen bg-[#fafbfc] text-slate-900">
      <FAQSchema questions={faqs} />
      <PublicNavbar tone="light" />
      <AnimatedHero benefits={benefits} />
      <HomeTrustStrip stats={stats} />
      <HomeStorySection />

      <HomeFeaturedCoursesSection
        courses={featuredCourses}
        courseCountLabel={
          catalogueFacts.publishedCourseCount > 0
            ? formatCourseCountForCopy(catalogueFacts.publishedCourseCount)
            : undefined
        }
      />

      <HomeHowItWorksSection />
      <HomeTestimonialsSection />
      <HomeCertificationsSection disciplineCountLabel={disciplineCountLabel} />
      <HomePricingSection
        subscriptionsEnabled={subscriptionsEnabled()}
        perCoursePriceLabel={perCoursePriceLabel(catalogueFacts.minPaidCoursePriceAud) ?? undefined}
      />
      <HomeGrowthSection stops={upcomingRoadshowStops()} />
      <HomeFaqSection faqs={faqs} />
      <HomeIndustriesSection />
      <HomeFinalCtaSection />

      <PublicFooter tone="light" />
      <FloatingChatGate />
    </div>
  );
}
