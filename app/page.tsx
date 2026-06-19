import {
  AnimatedCard,
  AnimatedHero,
  AnimatedSection,
  AnimatedStats,
} from '@/components/landing/AnimatedHero';
import { PublicFooter } from '@/components/landing/PublicFooter';
import { PublicNavbar } from '@/components/landing/PublicNavbar';
import { PUBLIC_SHELL_INNER_CLASS } from '@/components/landing/public-shell-width';
import { CourseBrowseProvider } from '@/components/lms/CourseBrowseContext';
import { CourseCard } from '@/components/lms/CourseCard';
import FloatingChatGate from '@/components/lms/FloatingChatGate';
import { FAQSchema } from '@/components/seo/JsonLd';
import {
  catalogueMetaDescription,
  formatCourseCountForCopy,
  getPublicCatalogueFacts,
} from '@/lib/server/public-catalogue-facts';
import { getHomepageFeaturedCourses } from '@/lib/server/public-courses-list';
import type { CourseListItem } from '@/lib/wordpress-export-courses';
import {
  ArrowRight,
  Award,
  BadgeCheck,
  BookOpen,
  Building2,
  CheckCircle2,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

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
  'IICRC CEC accredited courses',
  'Beginner, intermediate, and advanced levels',
  'Automatic credit tracking',
  'Verifiable digital credentials',
  'No travel, no downtime, no waiting',
];

const industries = [
  { slug: 'healthcare', label: 'Healthcare' },
  { slug: 'hospitality', label: 'Hotels & Resorts' },
  { slug: 'government-defence', label: 'Government & Defence' },
  { slug: 'commercial-cleaning', label: 'Commercial Cleaning' },
  { slug: 'aged-care', label: 'Aged Care' },
  { slug: 'mining', label: 'Mining & Resources' },
  { slug: 'education', label: 'Education' },
  { slug: 'property-management', label: 'Property Management' },
];

function buildHomeFaqs(facts: { publishedCourseCount: number; disciplineCodes: string[] }) {
  const n = facts.publishedCourseCount;
  const d = facts.disciplineCodes.length;
  const coursePhrase =
    n > 0 ? `${n} published course${n === 1 ? '' : 's'}` : 'IICRC CEC accredited courses';
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
  ];
}

function HomeSkeletonCard() {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="h-40 animate-pulse bg-slate-100" />
      <div className="space-y-3 p-4">
        <div className="h-4 w-3/4 animate-pulse rounded bg-slate-100" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-slate-100" />
      </div>
    </div>
  );
}

export default async function Home() {
  const [featuredCourses, catalogueFacts] = await Promise.all([
    getFeaturedCourses(),
    getPublicCatalogueFacts(),
  ]);
  const faqs = buildHomeFaqs(catalogueFacts);
  const stats = [
    { value: '24/7', label: 'Online Access' },
    { value: '12+', label: 'Industries Served' },
    {
      value:
        catalogueFacts.publishedCourseCount > 0
          ? formatCourseCountForCopy(catalogueFacts.publishedCourseCount)
          : '-',
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
    <div id="main-content" className="min-h-screen bg-[#f6f8fb] text-slate-900">
      <FAQSchema questions={faqs} />
      <PublicNavbar />
      <AnimatedHero benefits={benefits} />
      <AnimatedStats stats={stats} />

      <AnimatedSection
        label="Featured courses"
        title="Popular courses learners start with"
        rightContent={
          <Link
            href="/courses"
            className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#146fc2] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0f5fa8]"
          >
            View all courses <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        }
      >
        <CourseBrowseProvider courseLinkBase="/courses">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {featuredCourses.length > 0
              ? featuredCourses.map((course, i) => (
                  <AnimatedCard key={course.id} index={i}>
                    <CourseCard course={course} priorityImage={i < 6} />
                  </AnimatedCard>
                ))
              : [1, 2, 3].map((i) => (
                  <AnimatedCard key={i} index={i}>
                    <HomeSkeletonCard />
                  </AnimatedCard>
                ))}
          </div>
        </CourseBrowseProvider>
      </AnimatedSection>

      <section className="bg-white py-14">
        <div className={PUBLIC_SHELL_INNER_CLASS}>
          <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
            <div>
              <p className="inline-flex rounded-full border border-[#b8dbfb] bg-[#eef7ff] px-3 py-1 text-[11px] font-semibold tracking-[0.14em] text-[#146fc2] uppercase">
                How it works
              </p>
              <h2 className="mt-4 text-2xl font-bold tracking-tight text-slate-950 md:text-3xl">
                A clearer path from enrolment to certificate.
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                CARSI is structured around practical outcomes: find the right course, complete
                self-paced lessons, track CECs, and share verifiable credentials when your work
                requires proof.
              </p>
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
                <div key={item.title} className="rounded-lg border border-slate-200 bg-[#f8fbff] p-5">
                  <item.icon className="h-5 w-5 text-[#146fc2]" aria-hidden />
                  <h3 className="mt-3 font-semibold text-slate-950">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <AnimatedSection label="Industry pathways" title="Training for the facilities and sectors you serve">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {industries.map((industry) => (
            <Link
              key={industry.slug}
              href={`/industries/${industry.slug}`}
              className="group flex min-h-20 items-center gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-[#2490ed]/45 hover:shadow-md"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#eef7ff] text-[#146fc2]">
                <Building2 className="h-5 w-5" aria-hidden />
              </span>
              <span className="font-semibold text-slate-800 group-hover:text-[#146fc2]">
                {industry.label}
              </span>
            </Link>
          ))}
        </div>
      </AnimatedSection>

      <section className="bg-[#0f172a] py-14 text-white">
        <div className={`${PUBLIC_SHELL_INNER_CLASS} grid gap-6 md:grid-cols-[1fr_auto] md:items-center`}>
          <div>
            <p className="inline-flex items-center gap-2 text-sm font-semibold text-[#8fd0ff]">
              <ShieldCheck className="h-4 w-4" aria-hidden />
              Built for practical professional development
            </p>
            <h2 className="mt-3 text-2xl font-bold tracking-tight md:text-3xl">
              Ready to find the right CARSI course?
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300">
              Start with the catalogue, compare courses clearly, and enrol when the path is right.
            </p>
          </div>
          <Link
            href="/courses"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-[#ed9d24] px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-[#f2b14f]"
          >
            Browse the catalogue
            <CheckCircle2 className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </section>

      <PublicFooter />
      <FloatingChatGate />
    </div>
  );
}
