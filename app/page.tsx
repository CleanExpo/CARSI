import type { Metadata } from 'next';
import {
  AnimatedCard,
  AnimatedHero,
  AnimatedSection,
  AnimatedStats,
} from '@/components/landing/AnimatedHero';
import { PublicFooter } from '@/components/landing/PublicFooter';
import { PublicNavbar } from '@/components/landing/PublicNavbar';
import { CourseBrowseProvider } from '@/components/lms/CourseBrowseContext';
import { CourseCard } from '@/components/lms/CourseCard';
import FloatingChat from '@/components/lms/FloatingChat';
import { CertificatePreview } from '@/components/lms/diagrams/CertificatePreview';
import { IICRCDisciplineMap } from '@/components/lms/diagrams/IICRCDisciplineMap';
import { StudentJourneyMap } from '@/components/lms/diagrams/StudentJourneyMap';
import { FAQSchema } from '@/components/seo/JsonLd';
import { AcronymTooltip } from '@/components/ui/AcronymTooltip';
import { disciplinePillsFromCodes } from '@/lib/iicrc-discipline-display';
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
  BookOpen,
  Clock,
  DollarSign,
  ExternalLink,
  Laptop,
  MapPin,
  Sparkles,
  Users,
} from 'lucide-react';
import Link from 'next/link';

/** Always render homepage on the server so featured courses load from `DATABASE_URL` at request time (not a static build snapshot). */
export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const facts = await getPublicCatalogueFacts();
  return {
    description: catalogueMetaDescription(facts),
  };
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Course = CourseListItem;

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

/**
 * Homepage featured strip: mould/microbial, water, air — see `getHomepageFeaturedCourses`.
 * `force-dynamic` avoids shipping a build-time empty snapshot when `DATABASE_URL` is only available at runtime.
 */
async function getFeaturedCourses(): Promise<Course[]> {
  try {
    return await getHomepageFeaturedCourses();
  } catch (e) {
    console.error('[home] Failed to load featured courses from database', e);
    return [];
  }
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

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

const benefits = [
  '24/7 access — learn anytime, anywhere',
  'IICRC CEC-approved courses',
  'Automatic credit tracking',
  'Verifiable digital credentials',
  'No travel, no downtime, no waiting',
];

const geoDisciplineCodes = [
  { code: 'WRT', label: 'Water Damage Restoration' },
  { code: 'CRT', label: 'Carpet Repair & Reinstallation' },
  { code: 'ASD', label: 'Applied Structural Drying' },
  { code: 'AMRT', label: 'Applied Microbial Remediation' },
  { code: 'OCT', label: 'Odour Control' },
  { code: 'CCT', label: 'Carpet Cleaning' },
  { code: 'FSRT', label: 'Fire & Smoke Restoration' },
] as const;

const onlineHighlights = [
  {
    icon: MapPin,
    title: 'No travel barrier',
    text: 'Ideal for regional techs — Cairns to Kalgoorlie without capital-city trips.',
  },
  {
    icon: Clock,
    title: '24/7 access',
    text: 'Learn on your schedule; pause and resume between jobs.',
  },
  {
    icon: Laptop,
    title: 'Any device',
    text: 'Phone, tablet, or desktop — wherever you have connectivity.',
  },
  {
    icon: Award,
    title: 'Instant credentials',
    text: 'Verifiable certificates ready for employers or LinkedIn.',
  },
] as const;

function buildHomeFaqs(facts: {
  publishedCourseCount: number;
  disciplineCodes: string[];
}) {
  const n = facts.publishedCourseCount;
  const d = facts.disciplineCodes.length;
  const coursePhrase =
    n > 0
      ? `${n} published course${n === 1 ? '' : 's'}`
      : 'IICRC CEC-approved courses';
  const discPhrase =
    d > 0
      ? `${d} IICRC discipline${d === 1 ? '' : 's'}`
      : 'the core IICRC disciplines';

  return [
  {
    question: 'What is CARSI?',
    answer: `CARSI is an Australian online training platform offering IICRC CEC-approved courses for cleaning and restoration professionals. With ${coursePhrase} across ${discPhrase}, CARSI enables technicians to maintain their certification entirely online.`,
  },
  {
    question: 'How do IICRC CECs work?',
    answer:
      'IICRC Continuing Education Credits (CECs) are required every two years to maintain certified technician status. Each CARSI course awards a specific number of CECs upon completion. Credits are tracked automatically in your student dashboard and can be reported to the IICRC for renewal.',
  },
  {
    question: 'Is CARSI training recognised by insurers?',
    answer:
      'CARSI courses are IICRC CEC-approved, and IICRC certification is recognised by major Australian insurers including IAG, Suncorp, and QBE as evidence of professional competency. CARSI is also a core pillar of the NRPG onboarding pathway.',
  },
  {
    question: 'Can I complete training at my own pace?',
    answer:
      'Yes. All CARSI courses are available 24/7 and fully self-paced. You can pause mid-lesson, resume between jobs, and fit study around shift work or on-call rosters. There are no deadlines or scheduled class times.',
  },
  {
    question: 'What industries does CARSI serve?',
    answer:
      'CARSI serves over 12 industries including healthcare, hospitality, aged care, mining and resources, commercial cleaning, government and defence, education, property management, strata, retail, childcare, and construction.',
  },
];
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SkeletonCard() {
  return (
    <div
      className="overflow-hidden rounded-sm"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      <div className="h-40 animate-pulse bg-slate-800/50" />
      <div className="space-y-2 p-4">
        <div className="h-4 w-3/4 animate-pulse rounded bg-slate-700/30" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-slate-700/30" />
      </div>
    </div>
  );
}

/** Inline GEO citation link — keeps sources visible without breaking reading flow. */
function SourceLink({ href, label }: { href: string; label: string }) {
  return (
    <span className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
      (source:{' '}
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="underline decoration-dotted underline-offset-2 transition-colors hover:text-white"
      >
        {label}
      </a>
      )
    </span>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

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
          : '—',
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
  const disciplinePills = disciplinePillsFromCodes(
    catalogueFacts.disciplineCodes.length > 0
      ? catalogueFacts.disciplineCodes
      : ['WRT', 'CRT', 'ASD', 'AMRT', 'FSRT', 'OCT', 'CCT']
  );
  const disciplineCountLabel =
    catalogueFacts.disciplineCodes.length > 0
      ? catalogueFacts.disciplineCodes.length
      : 7;

  return (
    <div id="main-content" className="relative z-10 min-h-screen bg-[#050505]">
      {/* FAQ structured data for GEO/AI search engines */}
      <FAQSchema questions={faqs} />

      {/* Single subtle gradient orb — much calmer than 3 animated blobs */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(36,144,237,0.07) 0%, transparent 55%)',
        }}
        aria-hidden="true"
      />

      {/* ── Navigation ─────────────────────────────────────────────────────── */}
      <PublicNavbar />

      {/* ── Hero (Animated) ────────────────────────────────────────────────── */}
      <AnimatedHero benefits={benefits} />

      {/* ── Stats (Animated) ───────────────────────────────────────────────── */}
      <AnimatedStats stats={stats} />

      {/* ── Disciplines (compact pills) ────────────────────────────────────── */}
      <section className="px-6 py-12" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="mx-auto max-w-6xl">
          <p
            className="mb-4 text-center text-xs tracking-wide uppercase"
            style={{ color: 'rgba(255,255,255,0.3)' }}
          >
            <AcronymTooltip term="IICRC" /> Disciplines
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {disciplinePills.map((d) => (
              <Link
                key={d.code}
                href={`/courses?discipline=${d.code}`}
                className="rounded-sm px-3 py-1.5 text-xs transition-all duration-200 hover:-translate-y-0.5 hover:text-white"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: 'rgba(255,255,255,0.6)',
                }}
              >
                <span className="font-mono font-bold" style={{ color: '#2490ed' }}>
                  {d.code}
                </span>
                <span className="ml-1.5 hidden sm:inline">{d.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── IICRC Discipline Map ────────────────────────────────────────── */}
      <AnimatedSection label="Certifications" title="IICRC Discipline Map">
        <div className="mx-auto max-w-xl">
          <p className="mb-6 text-center text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
            Explore the {disciplineCountLabel} IICRC disciplines. Hover over each node to see the
            full certification name.
          </p>
          <IICRCDisciplineMap />
        </div>
      </AnimatedSection>

      {/* ── Featured Courses (Animated) ────────────────────────────────────── */}
      <AnimatedSection
        label="Featured"
        title="Popular Courses"
        rightContent={
          <Link
            href="/courses"
            className="flex items-center gap-1 text-sm transition-colors duration-150 hover:text-white"
            style={{ color: '#2490ed' }}
          >
            All courses <ArrowRight className="h-4 w-4" />
          </Link>
        }
      >
        <CourseBrowseProvider courseLinkBase="/courses">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featuredCourses.length > 0
              ? featuredCourses.map((course, i) => (
                  <AnimatedCard key={course.id} index={i}>
                    <CourseCard course={course} priorityImage={i < 9} />
                  </AnimatedCard>
                ))
              : [1, 2, 3].map((i) => (
                  <AnimatedCard key={i} index={i}>
                    <SkeletonCard />
                  </AnimatedCard>
                ))}
          </div>
        </CourseBrowseProvider>
      </AnimatedSection>

      {/* ── Industries ─────────────────────────────────────────────────────── */}
      <AnimatedSection label="Multi-Industry Training" title="Built for every sector">
        <p className="mb-6 max-w-2xl text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
          From hospitals to hotels, government facilities to commercial buildings — CARSI provides
          industry-specific training pathways. Not just restoration. Every industry that needs{' '}
          <AcronymTooltip term="IICRC" /> credentials.
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {industries.map((industry, i) => (
            <AnimatedCard key={industry.slug} index={i}>
              <Link
                href={`/industries/${industry.slug}`}
                className="group flex items-center justify-between rounded-sm px-4 py-3 transition-all duration-200 hover:-translate-y-0.5"
                style={{
                  background: industry.highlight
                    ? 'rgba(36,144,237,0.08)'
                    : 'rgba(255,255,255,0.03)',
                  border: industry.highlight
                    ? '1px solid rgba(36,144,237,0.2)'
                    : '1px solid rgba(255,255,255,0.06)',
                }}
              >
                <span
                  className="text-sm font-medium transition-colors duration-150 group-hover:text-white"
                  style={{ color: industry.highlight ? '#2490ed' : 'rgba(255,255,255,0.7)' }}
                >
                  {industry.label}
                </span>
                <ArrowRight
                  className="h-3 w-3 opacity-0 transition-all duration-200 group-hover:translate-x-0.5 group-hover:opacity-100"
                  style={{ color: '#2490ed' }}
                />
              </Link>
            </AnimatedCard>
          ))}
        </div>
        <div className="mt-6 text-center">
          <Link
            href="/industries"
            className="text-sm font-medium transition-colors hover:text-white"
            style={{ color: 'rgba(255,255,255,0.5)' }}
          >
            View all industries →
          </Link>
        </div>
      </AnimatedSection>

      {/* ── Why Online ─────────────────────────────────────────────────────── */}
      <AnimatedSection label="The Online Advantage" title="Why professionals choose CARSI">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              title: '24/7 Access',
              desc: 'Learn at 2am or 2pm. Our platform never closes. Complete courses around your work schedule.',
              color: '#2490ed',
            },
            {
              title: 'No Travel Required',
              desc: 'No flights, no hotels, no time away from work. Train your entire team without leaving the office.',
              color: '#00FF88',
            },
            {
              title: 'Instant Credentials',
              desc: 'Complete a course, get your certificate. Verifiable digital credentials you can share immediately.',
              color: '#ed9d24',
            },
          ].map((item, i) => (
            <AnimatedCard key={item.title} index={i}>
              <div
                className="rounded-sm p-6"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}
              >
                <div className="mb-3 h-1 w-8 rounded-full" style={{ background: item.color }} />
                <h3
                  className="mb-2 text-base font-semibold"
                  style={{ color: 'rgba(255,255,255,0.9)' }}
                >
                  {item.title}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  {item.desc}
                </p>
              </div>
            </AnimatedCard>
          ))}
        </div>
      </AnimatedSection>

      {/* ── How It Works (Student Journey Map) ──────────────────────────── */}
      <AnimatedSection label="How It Works" title="Your Learning Journey">
        <div className="mx-auto max-w-3xl">
          <p className="mb-6 text-center text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
            From enrolment to credential — six steps to IICRC-recognised professional development.
          </p>
          <StudentJourneyMap />
        </div>
      </AnimatedSection>

      {/* ── Citable passages (GEO) — editorial cards, scannable stats & sources ─ */}
      <AnimatedSection label="Expert content" title="Standards, training & industry alignment">
        <div className="mx-auto max-w-5xl space-y-8">
          {/* IICRC */}
          <article
            className="overflow-hidden rounded-sm"
            style={{
              background:
                'linear-gradient(165deg, rgba(36,144,237,0.06) 0%, rgba(255,255,255,0.02) 45%)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[minmax(0,220px)_1fr] lg:gap-12">
              <div className="space-y-4">
                <div
                  className="inline-flex items-center gap-2 rounded-sm px-2.5 py-1 text-[10px] font-semibold tracking-wide uppercase"
                  style={{
                    background: 'rgba(36,144,237,0.12)',
                    border: '1px solid rgba(36,144,237,0.25)',
                    color: '#2490ed',
                  }}
                >
                  <BookOpen className="h-3.5 w-3.5" aria-hidden />
                  Industry standards
                </div>
                <h3
                  className="text-lg leading-snug font-semibold sm:text-xl"
                  style={{ color: 'rgba(255,255,255,0.95)' }}
                >
                  What is <AcronymTooltip term="IICRC" /> Certification?
                </h3>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { k: 'Founded', v: '1972', sub: 'United States' },
                    { k: 'Global reach', v: '25+', sub: 'Countries' },
                    { k: 'Certified', v: '67k+', sub: 'Technicians worldwide' },
                  ].map((s) => (
                    <div
                      key={s.k}
                      className="rounded-sm px-2 py-2.5 text-center"
                      style={{
                        background: 'rgba(0,0,0,0.25)',
                        border: '1px solid rgba(255,255,255,0.06)',
                      }}
                    >
                      <p
                        className="text-[10px] tracking-wider uppercase"
                        style={{ color: 'rgba(255,255,255,0.35)' }}
                      >
                        {s.k}
                      </p>
                      <p className="text-sm font-bold tabular-nums" style={{ color: '#2490ed' }}>
                        {s.v}
                      </p>
                      <p
                        className="text-[10px] leading-tight"
                        style={{ color: 'rgba(255,255,255,0.4)' }}
                      >
                        {s.sub}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="min-w-0 space-y-4">
                <p
                  className="text-sm leading-relaxed sm:text-[15px] sm:leading-relaxed"
                  style={{ color: 'rgba(255,255,255,0.68)' }}
                >
                  The Institute of Inspection Cleaning and Restoration Certification (
                  <AcronymTooltip term="IICRC" />) is the global standard-setting body for the
                  cleaning and restoration industry. Established in 1972 in the United States, the{' '}
                  <AcronymTooltip term="IICRC" /> now operates across 25 countries and has certified
                  over 67,000 technicians worldwide{' '}
                  <SourceLink href="https://www.iicrc.org/page/About-the-IICRC" label="IICRC.org" />
                  .
                </p>
                <p
                  className="text-sm leading-relaxed sm:text-[15px] sm:leading-relaxed"
                  style={{ color: 'rgba(255,255,255,0.68)' }}
                >
                  The organisation maintains standards across seven core disciplines. In Australia,{' '}
                  <AcronymTooltip term="IICRC" /> certification is recognised by major insurers such
                  as IAG, Suncorp, and QBE as evidence of professional competency. Technicians must
                  earn Continuing Education Credits (
                  <AcronymTooltip term="CEC">CECs</AcronymTooltip>) every two years to maintain
                  certified status{' '}
                  <SourceLink
                    href="https://www.iicrc.org/page/IICRCGlobalLocations"
                    label="IICRC Global"
                  />
                  .{' '}
                  {catalogueFacts.publishedCourseCount > 0 ? (
                    <>
                      CARSI offers {formatCourseCountForCopy(catalogueFacts.publishedCourseCount)}{' '}
                    </>
                  ) : (
                    <>CARSI offers </>
                  )}
                  <AcronymTooltip term="IICRC" /> <AcronymTooltip term="CEC" />
                  -approved online courses across {disciplineCountLabel}{' '}
                  {disciplineCountLabel === 1 ? 'discipline' : 'disciplines'}, allowing Australian
                  professionals to meet renewal requirements without travelling interstate.
                </p>
                <div
                  className="flex flex-wrap gap-1.5 pt-1"
                  role="list"
                  aria-label="IICRC disciplines covered"
                >
                  {geoDisciplineCodes.map((d) => (
                    <span
                      key={d.code}
                      role="listitem"
                      className="inline-flex items-center gap-1 rounded-sm px-2 py-1 text-[11px]"
                      style={{
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        color: 'rgba(255,255,255,0.75)',
                      }}
                      title={d.label}
                    >
                      <span className="font-mono font-bold" style={{ color: '#2490ed' }}>
                        {d.code}
                      </span>
                    </span>
                  ))}
                </div>
                <p className="text-xs not-italic" style={{ color: 'rgba(255,255,255,0.28)' }}>
                  Last reviewed: March 2026
                </p>
              </div>
            </div>
          </article>

          {/* Online learning */}
          <article
            className="rounded-sm p-6 sm:p-8"
            style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div
                  className="mb-2 inline-flex items-center gap-2 text-[10px] font-semibold tracking-wide uppercase"
                  style={{ color: 'rgba(255,255,255,0.4)' }}
                >
                  <Laptop className="h-3.5 w-3.5" style={{ color: '#ed9d24' }} aria-hidden />
                  Online learning
                </div>
                <h3
                  className="text-lg font-semibold sm:text-xl"
                  style={{ color: 'rgba(255,255,255,0.95)' }}
                >
                  Why choose online restoration training?
                </h3>
              </div>
              <div
                className="flex shrink-0 items-center gap-2 rounded-sm px-3 py-2 text-xs"
                style={{
                  background: 'rgba(237,157,36,0.08)',
                  border: '1px solid rgba(237,157,36,0.2)',
                  color: 'rgba(255,255,255,0.75)',
                }}
              >
                <DollarSign className="h-4 w-4 shrink-0" style={{ color: '#ed9d24' }} aria-hidden />
                <span>
                  From <strong className="text-white/90">$20 AUD</strong> · All-access{' '}
                  <strong className="text-white/90">$795/yr</strong>
                </span>
              </div>
            </div>
            <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {onlineHighlights.map(({ icon: Icon, title, text }) => (
                <div
                  key={title}
                  className="flex gap-3 rounded-sm p-3 transition-colors duration-200 hover:bg-white/3"
                  style={{ border: '1px solid rgba(255,255,255,0.05)' }}
                >
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm"
                    style={{
                      background: 'rgba(36,144,237,0.1)',
                      border: '1px solid rgba(36,144,237,0.2)',
                    }}
                  >
                    <Icon className="h-4 w-4" style={{ color: '#2490ed' }} aria-hidden />
                  </div>
                  <div>
                    <p
                      className="text-xs font-semibold"
                      style={{ color: 'rgba(255,255,255,0.88)' }}
                    >
                      {title}
                    </p>
                    <p
                      className="mt-0.5 text-[11px] leading-snug"
                      style={{ color: 'rgba(255,255,255,0.45)' }}
                    >
                      {text}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <p
              className="text-sm leading-relaxed sm:text-[15px] sm:leading-relaxed"
              style={{ color: 'rgba(255,255,255,0.68)' }}
            >
              Traditional face-to-face restoration training in Australia requires travel,
              accommodation, and time away from active job sites. For technicians in regional areas
              — from Cairns to Kalgoorlie — attending a two-day course in a capital city can cost
              over $2,000 in travel expenses alone, on top of course fees and lost billable hours.
              CARSI&apos;s online platform eliminates these barriers entirely. Courses are available
              24 hours a day, 7 days a week, accessible from any device with an internet connection.
              Learners can complete modules at their own pace, pause mid-lesson and resume between
              jobs, and fit study around shift work or on-call rosters. Upon completion,
              certificates are generated instantly as verifiable digital credentials that can be
              shared with employers or added to a LinkedIn profile within minutes. With courses
              starting from $20 AUD and a full all-access subscription at $795 AUD per year, CARSI
              provides the most cost-effective path to <AcronymTooltip term="IICRC" /> certification
              maintenance in Australia.
            </p>
            <p className="mt-4 text-xs not-italic" style={{ color: 'rgba(255,255,255,0.28)' }}>
              Last reviewed: March 2026
            </p>
          </article>

          {/* NRPG */}
          <article
            className="relative overflow-hidden rounded-sm p-6 sm:p-8"
            style={{
              background:
                'linear-gradient(125deg, rgba(36,144,237,0.1) 0%, rgba(5,5,5,0.9) 55%, rgba(237,157,36,0.06) 100%)',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            <div
              className="pointer-events-none absolute -top-16 -right-16 h-48 w-48 rounded-full blur-3xl"
              style={{ background: 'rgba(36,144,237,0.15)' }}
              aria-hidden
            />
            <div className="relative flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-10">
              <div className="flex shrink-0 items-start gap-4">
                <div
                  className="flex h-14 w-14 items-center justify-center rounded-sm text-lg font-bold"
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    color: '#2490ed',
                  }}
                >
                  <Sparkles className="h-6 w-6" aria-hidden />
                </div>
                <div>
                  <div
                    className="mb-1 inline-flex items-center gap-1.5 text-[10px] font-semibold tracking-wide uppercase"
                    style={{ color: 'rgba(255,255,255,0.45)' }}
                  >
                    <Users className="h-3 w-3" aria-hidden />
                    Industry partnership
                  </div>
                  <h3
                    className="text-lg font-semibold sm:text-xl"
                    style={{ color: 'rgba(255,255,255,0.95)' }}
                  >
                    What is CARSI&apos;s role in the NRPG?
                  </h3>
                </div>
              </div>
              <div className="min-w-0 flex-1 space-y-4">
                <p
                  className="text-sm leading-relaxed sm:text-[15px] sm:leading-relaxed"
                  style={{ color: 'rgba(255,255,255,0.68)' }}
                >
                  CARSI is one of the four core pillars of the National Restoration Professionals
                  Group (NRPG) onboarding pathway. The NRPG is Australia&apos;s peak body for the
                  restoration and remediation industry, setting workforce standards that insurers,
                  loss adjusters, and building managers rely on when selecting qualified contractors{' '}
                  <SourceLink href="https://www.nrpg.com.au" label="NRPG.com.au" />.
                </p>
                <p
                  className="text-sm leading-relaxed sm:text-[15px] sm:leading-relaxed"
                  style={{ color: 'rgba(255,255,255,0.68)' }}
                >
                  The NRPG onboarding pathway requires new technicians to complete foundational
                  training before entering the field. CARSI fulfils the education pillar of this
                  pathway, providing the <AcronymTooltip term="IICRC" />{' '}
                  <AcronymTooltip term="CEC" />
                  -approved coursework that new entrants must complete alongside practical
                  mentoring, equipment familiarisation, and workplace health and safety induction.
                  This partnership means CARSI-trained technicians are recognised across the NRPG
                  network from day one. For restoration companies, enrolling staff through CARSI
                  ensures compliance with NRPG workforce standards without disrupting operations.
                  {catalogueFacts.publishedCourseCount > 0 ? (
                    <>
                      With {formatCourseCountForCopy(catalogueFacts.publishedCourseCount)} courses
                      spanning {disciplineCountLabel} <AcronymTooltip term="IICRC" /> disciplines,
                      CARSI provides the most comprehensive online training library available to
                      Australian restoration professionals.
                    </>
                  ) : (
                    <>
                      With courses spanning the core <AcronymTooltip term="IICRC" /> disciplines,
                      CARSI provides the most comprehensive online training library available to
                      Australian restoration professionals.
                    </>
                  )}
                </p>
                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <Link
                    href="/pathways"
                    className="inline-flex items-center gap-1.5 text-sm font-medium transition-colors hover:text-white"
                    style={{ color: '#2490ed' }}
                  >
                    Explore pathways <ArrowRight className="h-4 w-4" />
                  </Link>
                  <a
                    href="https://www.nrpg.com.au"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs transition-colors hover:text-white/90"
                    style={{ color: 'rgba(255,255,255,0.4)' }}
                  >
                    NRPG website <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                <p className="text-xs not-italic" style={{ color: 'rgba(255,255,255,0.28)' }}>
                  Last reviewed: March 2026
                </p>
              </div>
            </div>
          </article>
        </div>
      </AnimatedSection>

      {/* ── NRPG Partnership ─────────────────────────────────────────────────── */}
      <section className="px-6 py-16" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="mx-auto max-w-6xl">
          <div
            className="rounded-sm p-8 sm:p-10"
            style={{
              background:
                'linear-gradient(135deg, rgba(36,144,237,0.08) 0%, rgba(237,157,36,0.08) 100%)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p
                  className="mb-2 text-xs tracking-wide uppercase"
                  style={{ color: 'rgba(255,255,255,0.4)' }}
                >
                  National Partnership
                </p>
                <h3 className="mb-2 text-xl font-bold" style={{ color: 'rgba(255,255,255,0.95)' }}>
                  NRPG Onboarding Partner
                </h3>
                <p className="max-w-md text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  CARSI is one of the four core pillars of the National Restoration Professionals
                  Group onboarding pathway. Industry-recognised training that meets NRPG standards.
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div
                  className="flex h-14 w-14 items-center justify-center rounded-sm text-lg font-bold"
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: '#2490ed',
                  }}
                >
                  NRPG
                </div>
                <Link
                  href="/pathways"
                  className="text-sm font-medium transition-colors hover:text-white"
                  style={{ color: '#2490ed' }}
                >
                  View Pathways →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ (visible + schema) ─────────────────────────────────────────── */}
      <AnimatedSection label="Common Questions" title="Frequently Asked Questions">
        <div className="mx-auto max-w-6xl space-y-4">
          {faqs.map((faq, i) => (
            <AnimatedCard key={faq.question} index={i}>
              <details
                className="group rounded-sm"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}
              >
                <summary
                  className="flex cursor-pointer items-center justify-between px-5 py-4 text-sm font-medium select-none"
                  style={{ color: 'rgba(255,255,255,0.85)' }}
                >
                  {faq.question}
                  <span
                    className="ml-2 transition-transform duration-200 group-open:rotate-45"
                    style={{ color: '#2490ed' }}
                  >
                    +
                  </span>
                </summary>
                <div
                  className="px-5 pb-4 text-sm leading-relaxed"
                  style={{ color: 'rgba(255,255,255,0.55)' }}
                >
                  {faq.answer}
                </div>
              </details>
            </AnimatedCard>
          ))}
        </div>
      </AnimatedSection>

      {/* ── Certificate Preview ──────────────────────────────────────────── */}
      <AnimatedSection label="Credentials" title="Verifiable Digital Certificates">
        <div className="mx-auto max-w-xl">
          <p className="mb-6 text-center text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
            Every completed course earns you a verifiable digital certificate with a public URL you
            can share with employers and clients.
          </p>
          <CertificatePreview />
        </div>
      </AnimatedSection>

      {/* ── CTA ────────────────────────────────────────────────────────────── */}
      <section className="px-6 py-20" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="mb-4 text-3xl font-bold" style={{ color: 'rgba(255,255,255,0.95)' }}>
            Start learning today
          </h2>
          <p className="mb-8 text-base" style={{ color: 'rgba(255,255,255,0.5)' }}>
            Free courses available. Premium courses from just $20 AUD.
            <br />
            {catalogueFacts.publishedCourseCount > 0 ? (
              <>
                Or get full access to all{' '}
                {formatCourseCountForCopy(catalogueFacts.publishedCourseCount)} courses for $795
                AUD/year.
              </>
            ) : (
              <>Or get full access to the full catalogue for $795 AUD/year.</>
            )}
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/courses?filter=free"
              className="group inline-flex items-center gap-2 rounded-sm px-8 py-3 font-medium transition-all duration-200 hover:scale-[1.02] hover:text-white"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'rgba(255,255,255,0.7)',
              }}
            >
              Free Courses
            </Link>
            <Link
              href="/courses"
              className="group inline-flex items-center gap-2 rounded-sm px-8 py-3 font-medium text-white transition-all duration-200 hover:scale-[1.02]"
              style={{ background: '#ed9d24' }}
            >
              Browse All Courses{' '}
              <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <PublicFooter />

      <FloatingChat />
    </div>
  );
}
