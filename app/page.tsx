import { AnimatedCard, AnimatedHero, AnimatedSection } from '@/components/landing/AnimatedHero';
import { HomeCertificationsSection } from '@/components/landing/HomeCertificationsSection';
import { HomeFeaturedCoursesSection } from '@/components/landing/HomeFeaturedCoursesSection';
import { HomeGrowthSection } from '@/components/landing/HomeGrowthSection';
import { HomePricingSection } from '@/components/landing/HomePricingSection';
import { PublicFooter } from '@/components/landing/PublicFooter';
import { PublicNavbar } from '@/components/landing/PublicNavbar';
import { PUBLIC_SHELL_INNER_CLASS } from '@/components/landing/public-shell-width';
import FloatingChatGate from '@/components/lms/FloatingChatGate';
import { StudentJourneyMap } from '@/components/lms/diagrams/StudentJourneyMap';
import { FAQSchema } from '@/components/seo/JsonLd';
import { AcronymTooltip } from '@/components/ui/AcronymTooltip';
import { ccwRoadshowPath } from '@/lib/marketing/ccw-roadshow';
import {
  catalogueMetaDescription,
  formatCourseCountForCopy,
  getPublicCatalogueFacts,
} from '@/lib/server/public-catalogue-facts';
import { getHomepageFeaturedCourses } from '@/lib/server/public-courses-list';
import type { CourseListItem } from '@/lib/course-list-item';
import {
  ArrowRight,
  Award,
  BadgeCheck,
  BookOpen,
  Building2,
  CheckCircle2,
  Clock,
  Compass,
  ShieldCheck,
  Ticket,
} from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

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
  '24/7 access — learn anytime, anywhere',
  'IICRC CEC Accredited courses',
  'Beginner, intermediate, and advanced levels',
  'Automatic credit tracking',
  'Verifiable digital credentials',
  'No travel, no downtime, no waiting',
];

const industries = [
  { slug: 'healthcare', label: 'Healthcare', highlight: true },
  { slug: 'hospitality', label: 'Hotels & Resorts', highlight: true },
  { slug: 'government-defence', label: 'Government & Defence', highlight: true },
  { slug: 'commercial-cleaning', label: 'Commercial Cleaning', highlight: true },
  { slug: 'aged-care', label: 'Aged Care' },
  { slug: 'mining', label: 'Mining & Resources' },
  { slug: 'education', label: 'Education' },
  { slug: 'property-management', label: 'Property Management' },
  { slug: 'strata', label: 'Strata & Body Corporate' },
  { slug: 'retail', label: 'Retail & Shopping Centres' },
  { slug: 'childcare', label: 'Childcare' },
  { slug: 'construction', label: 'Construction' },
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
        'CARSI serves healthcare, hospitality, aged care, mining, commercial cleaning, government and defence, education, property management, strata, retail, childcare, construction, and more — with sector-specific training pathways.',
    },
    {
      question: 'Does CARSI run in-person events?',
      answer:
        'Yes. CARSI partners with Carpet Cleaners Warehouse on Business Growth Days in Melbourne and Sydney, and offers the 2-Day CCW Carpet Cleaning Workshop. Online courses remain available 24/7 between events.',
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
    { value: '24/7', label: 'Online Access' },
    { value: '12+', label: 'Industries Served' },
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
    <div
      id="main-content"
      className="min-h-screen bg-[#f6f8fb] text-slate-900 dark:bg-[#050505] dark:text-white"
    >
      <FAQSchema questions={faqs} />
      <PublicNavbar />
      <AnimatedHero benefits={benefits} />
      <HomeGrowthSection stats={stats} />

      <HomeFeaturedCoursesSection
        courses={featuredCourses}
        courseCountLabel={
          catalogueFacts.publishedCourseCount > 0
            ? formatCourseCountForCopy(catalogueFacts.publishedCourseCount)
            : undefined
        }
      />

      <HomePricingSection />

      <HomeCertificationsSection disciplineCountLabel={disciplineCountLabel} />

      <section className="border-t border-slate-200/80 bg-white py-14 dark:border-white/10 dark:bg-[#0a0a0a]">
        <div className={PUBLIC_SHELL_INNER_CLASS}>
          <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
            <div>
              <p className="inline-flex rounded-full border border-[#b8dbfb] bg-[#eef7ff] px-3 py-1 text-[11px] font-semibold tracking-[0.14em] text-[#146fc2] uppercase">
                How it works
              </p>
              <h2 className="mt-4 text-2xl font-bold tracking-tight text-slate-950 md:text-3xl dark:text-white">
                A clearer path from enrolment to certificate.
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-white/65">
                CARSI is structured around practical outcomes: find the right course, complete
                self-paced lessons, track CECs, and share verifiable credentials when your work
                requires proof.
              </p>
              <Link
                href="/pathways"
                className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#146fc2] hover:text-[#0f5fa8] dark:text-[#8fd0ff] dark:hover:text-[#b8e2ff]"
              >
                Browse structured pathways <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                {
                  icon: BookOpen,
                  title: 'Browse by need',
                  text: 'Search by discipline, level, CEC hours, free courses, or course outcome.',
                },
                {
                  icon: Clock,
                  title: 'Learn around jobs',
                  text: 'Resume lessons whenever the roster allows, on desktop or mobile.',
                },
                {
                  icon: Award,
                  title: 'Track CECs',
                  text: 'Keep progress and continuing education details visible in your dashboard.',
                },
                {
                  icon: BadgeCheck,
                  title: 'Share credentials',
                  text: 'Use certificates and verification pages for employers, clients, or renewal.',
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="rounded-lg border border-slate-200 bg-[#f8fbff] p-5 dark:border-white/10 dark:bg-white/[0.04]"
                >
                  <item.icon className="h-5 w-5 text-[#146fc2]" aria-hidden />
                  <h3 className="mt-3 font-semibold text-slate-950 dark:text-white">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-white/60">
                    {item.text}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-10 rounded-xl border border-slate-200 bg-[#0f172a] p-6 sm:p-8">
            <p className="mb-6 text-center text-sm leading-relaxed text-slate-300">
              From enrolment to credential — six steps to IICRC-recognised professional development.
            </p>
            <StudentJourneyMap />
          </div>
        </div>
      </section>

      <AnimatedSection label="Multi-industry training" title="Built for every sector you serve">
        <p className="mb-8 max-w-2xl text-sm leading-relaxed text-slate-600 md:text-base dark:text-white/70">
          From hospitals to hotels, government facilities to commercial buildings — CARSI provides
          industry-specific training pathways for every sector that needs{' '}
          <AcronymTooltip term="IICRC" /> credentials.
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {industries.map((industry, i) => (
            <AnimatedCard key={industry.slug} index={i}>
              <Link
                href={`/industries/${industry.slug}`}
                className={`group flex min-h-20 items-center gap-3 rounded-lg border p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
                  industry.highlight
                    ? 'border-[#2490ed]/35 bg-[#eef7ff] hover:border-[#2490ed]/50 dark:border-[#2490ed]/30 dark:bg-[#2490ed]/10'
                    : 'border-slate-200 bg-white hover:border-[#2490ed]/45 dark:border-white/10 dark:bg-white/[0.04]'
                }`}
              >
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                    industry.highlight ? 'bg-white text-[#146fc2]' : 'bg-[#eef7ff] text-[#146fc2]'
                  }`}
                >
                  <Building2 className="h-5 w-5" aria-hidden />
                </span>
                <span
                  className={`font-semibold transition-colors group-hover:text-[#146fc2] ${
                    industry.highlight ? 'text-slate-900' : 'text-slate-800'
                  }`}
                >
                  {industry.label}
                </span>
              </Link>
            </AnimatedCard>
          ))}
        </div>
        <div className="mt-8 text-center">
          <Link
            href="/industries"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#146fc2] hover:text-[#0f5fa8] dark:text-[#8fd0ff] dark:hover:text-[#b8e2ff]"
          >
            View all industries <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </AnimatedSection>

      <section className="bg-[#0f172a] py-14 text-white dark:bg-[#020617]">
        <div
          className={`${PUBLIC_SHELL_INNER_CLASS} grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center`}
        >
          <div>
            <p className="inline-flex items-center gap-2 text-sm font-semibold text-[#8fd0ff]">
              <ShieldCheck className="h-4 w-4" aria-hidden />
              Built for practical professional development
            </p>
            <h2 className="mt-3 text-2xl font-bold tracking-tight md:text-3xl">
              Ready to start — online, in person, or both?
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300">
              Browse the catalogue for self-paced CEC courses, follow a structured pathway, or book
              CARSI × CCW Business Growth Days when you are ready to grow in person.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
            <Link
              href="/courses"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-[#ed9d24] px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-[#f2b14f]"
            >
              Browse the catalogue
              <CheckCircle2 className="h-4 w-4" aria-hidden />
            </Link>
            <Link
              href={`${ccwRoadshowPath}#booking`}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Book Growth Days
              <Ticket className="h-4 w-4" aria-hidden />
            </Link>
            <Link
              href="/pathways"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Find my pathway
              <Compass className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </div>
      </section>

      <PublicFooter />
      <FloatingChatGate />
    </div>
  );
}
