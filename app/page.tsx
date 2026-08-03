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
import {
  catalogueMetaDescription,
  formatCourseCountForCopy,
  getPublicCatalogueFacts,
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

function buildHomeFaqs(facts: { publishedCourseCount: number; disciplineCodes: string[] }) {
  const n = facts.publishedCourseCount;
  const d = facts.disciplineCodes.length;
  const coursePhrase =
    n > 0 ? `${n} published course${n === 1 ? '' : 's'}` : 'IICRC CEC Accredited courses';
  const disciplinePhrase =
    d > 0 ? `${d} IICRC discipline${d === 1 ? '' : 's'}` : 'the core IICRC disciplines';

  return [
    {
      question: 'What is CARSI?',
      answer: `CARSI is an Australian online training platform offering ${coursePhrase} across ${disciplinePhrase} for people just starting out, working technicians updating their knowledge, and experienced professionals maintaining CECs.`,
    },
    {
      question: 'Can I complete training at my own pace?',
      answer:
        'Yes. CARSI courses are online, self-paced, and designed for technicians who need to study around site work and on-call schedules.',
    },
    {
      question: 'How do IICRC CECs work?',
      answer:
        'IICRC members and certified technicians continue their education through CECs. Each eligible CARSI course carries a specific Continuing Education Credit value, with certificates and progress available in the learner dashboard.',
    },
    {
      question: 'What industries does CARSI serve?',
      answer:
        'CARSI serves healthcare, hospitality, aged care, mining, commercial cleaning, government and defence, education, property management, strata, retail, childcare, construction, and more, with sector-specific training pathways.',
    },
    {
      question: 'Does CARSI run in-person events?',
      answer:
        'Yes. CARSI partners with Carpet Cleaners Warehouse on Business Growth Days in Melbourne, Sydney and Brisbane, and offers the 2-Day CCW Carpet Cleaning Workshop. Online courses remain available 24/7 between events.',
    },
  ];
}

export default async function Home() {
  const [featuredCourses, catalogueFacts] = await Promise.all([
    getFeaturedCourses(),
    getPublicCatalogueFacts(),
  ]);
  const faqs = buildHomeFaqs(catalogueFacts);
  const disciplineCountLabel =
    catalogueFacts.disciplineCodes.length > 0 ? catalogueFacts.disciplineCodes.length : 7;
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
      value:
        catalogueFacts.disciplineCodes.length > 0
          ? formatCourseCountForCopy(catalogueFacts.disciplineCodes.length)
          : '7',
      label: 'IICRC Disciplines',
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
      <HomePricingSection subscriptionsEnabled={subscriptionsEnabled()} />
      <HomeGrowthSection />
      <HomeFaqSection faqs={faqs} />
      <HomeIndustriesSection />
      <HomeFinalCtaSection />

      <PublicFooter tone="light" />
      <FloatingChatGate />
    </div>
  );
}
