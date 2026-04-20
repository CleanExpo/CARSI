import type { Metadata } from 'next';
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
  Baby,
  BadgeCheck,
  BookOpen,
  Building2,
  ChevronDown,
  Clock,
  DollarSign,
  ExternalLink,
  Globe,
  GraduationCap,
  HardHat,
  Heart,
  Landmark,
  Laptop,
  Layers,
  MapPin,
  ShoppingBag,
  Sparkles,
  Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
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

const industryIconBySlug: Record<string, LucideIcon> = {
  healthcare: Heart,
  hospitality: Building2,
  'government-defence': Landmark,
  'commercial-cleaning': Sparkles,
  'aged-care': Heart,
  mining: HardHat,
  education: GraduationCap,
  'property-management': Building2,
  strata: Layers,
  retail: ShoppingBag,
  childcare: Baby,
  construction: HardHat,
};

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

      <div
        className="border-t border-white/[0.08] bg-gradient-to-r from-[#2490ed]/12 via-[#0a1624]/80 to-[#ed9d24]/10 py-5"
        style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className={PUBLIC_SHELL_INNER_CLASS}>
          <Link
            href="/ccw-training"
            className="group flex flex-col items-center gap-3 sm:flex-row sm:justify-center md:justify-start"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/10 shadow-[0_8px_32px_-12px_rgba(36,144,237,0.4)] transition-transform group-hover:scale-105">
              <Award className="h-5 w-5 text-[#7ec5ff]" aria-hidden />
            </span>
            <div className="text-center sm:text-left">
              <p className="text-[10px] font-semibold tracking-[0.18em] text-[#2490ed]/90 uppercase">
                In-person workshop
              </p>
              <p className="text-sm font-medium text-white/90 transition-colors group-hover:text-white">
                2-Day Carpet Cleaning Workshop (CCW) — participant resources
              </p>
              <p className="mt-0.5 text-xs text-white/40">Tap to view schedules &amp; materials</p>
            </div>
            <ArrowRight className="ml-auto hidden h-5 w-5 shrink-0 text-[#2490ed] opacity-60 transition-transform group-hover:translate-x-1 md:block" />
          </Link>
        </div>
      </div>

      {/* ── Disciplines (compact pills) ────────────────────────────────────── */}
      <section
        className="relative py-14 md:py-16"
        style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.15]"
          aria-hidden
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)`,
            backgroundSize: '56px 56px',
          }}
        />
        <div className={`relative ${PUBLIC_SHELL_INNER_CLASS}`}>
          <div className="mb-8 text-center">
            <p className="mb-2 inline-flex items-center rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-semibold tracking-[0.14em] text-white/50 uppercase">
              Explore by discipline
            </p>
            <h2 className="text-xl font-bold text-white md:text-2xl">
              <AcronymTooltip term="IICRC" /> pathways
            </h2>
            <p className="mx-auto mt-2 max-w-lg text-sm text-white/45">
              Jump straight into the credential track you need — same discovery pattern as global
              learning platforms.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-2.5 md:gap-3">
            {disciplinePills.map((d) => (
              <Link
                key={d.code}
                href={`/courses?discipline=${d.code}`}
                className="group rounded-full border border-white/10 bg-gradient-to-b from-white/[0.08] to-white/[0.02] px-4 py-2 text-xs shadow-[0_8px_32px_-20px_rgba(0,0,0,0.9)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#2490ed]/40 hover:shadow-[0_12px_40px_-16px_rgba(36,144,237,0.35)]"
              >
                <span className="font-mono font-bold text-[#2490ed]">{d.code}</span>
                <span className="ml-2 hidden text-white/65 sm:inline">{d.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── IICRC Discipline Map ────────────────────────────────────────── */}
      <AnimatedSection
        label="Certifications"
        title="IICRC discipline map & pathways"
        className="bg-gradient-to-b from-[#2490ed]/[0.08] via-[#050505] to-transparent"
      >
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-14 lg:items-start">
          <div className="space-y-6 lg:col-span-4">
            <p className="text-base leading-relaxed text-white/60 md:text-lg">
              Seven core pathways orbit <AcronymTooltip term="IICRC" /> standards — the same mental
              model as browsing categories on major learning platforms, built for restoration and
              cleaning credentials.
            </p>
            <ul className="space-y-3 text-sm text-white/45">
              <li className="flex gap-3">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#2490ed]" aria-hidden />
                <span>
                  <strong className="text-white/70">Interactive hub</strong> — hover or tap any node
                  to see the full certification name and jump into filtered courses.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#00d4aa]" aria-hidden />
                <span>
                  <strong className="text-white/70">{disciplineCountLabel} disciplines</strong> in
                  this view, aligned with CARSI&apos;s published catalogue.
                </span>
              </li>
            </ul>
            <Link
              href="/courses"
              className="inline-flex items-center gap-2 rounded-full border border-[#2490ed]/40 bg-[#2490ed]/10 px-5 py-2.5 text-sm font-semibold text-[#7ec5ff] transition-all hover:border-[#2490ed]/60 hover:bg-[#2490ed]/18"
            >
              Full course catalogue <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="lg:col-span-8">
            <IICRCDisciplineMap />
          </div>
        </div>
      </AnimatedSection>

      {/* ── Featured Courses (Animated) ────────────────────────────────────── */}
      <AnimatedSection
        label="Featured"
        title="Popular courses learners start with"
        className="bg-white/[0.015]"
        rightContent={
          <Link
            href="/courses"
            className="inline-flex items-center gap-2 rounded-full border border-[#2490ed]/35 bg-[#2490ed]/10 px-5 py-2.5 text-sm font-semibold text-[#7ec5ff] transition-all hover:border-[#2490ed]/50 hover:bg-[#2490ed]/18"
          >
            View all courses <ArrowRight className="h-4 w-4" />
          </Link>
        }
      >
        <CourseBrowseProvider courseLinkBase="/courses">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
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
      <AnimatedSection
        label="Multi-industry training"
        title="Built for every sector you serve"
        className="bg-gradient-to-b from-transparent via-white/[0.02] to-transparent"
      >
        <p className="mb-8 max-w-2xl text-sm leading-relaxed text-white/50 md:text-base">
          From hospitals to hotels, government facilities to commercial buildings — CARSI provides
          industry-specific training pathways. Not just restoration. Every industry that needs{' '}
          <AcronymTooltip term="IICRC" /> credentials.
        </p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {industries.map((industry, i) => {
            const Icon = industryIconBySlug[industry.slug] ?? Building2;
            return (
              <AnimatedCard key={industry.slug} index={i}>
                <Link
                  href={`/industries/${industry.slug}`}
                  className={`group flex items-center gap-3 rounded-2xl border p-4 transition-all duration-300 hover:-translate-y-1 ${
                    industry.highlight
                      ? 'border-[#2490ed]/35 bg-gradient-to-br from-[#2490ed]/15 to-[#0a1524]/90 shadow-[0_16px_48px_-28px_rgba(36,144,237,0.35)] hover:border-[#2490ed]/50'
                      : 'border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05]'
                  }`}
                >
                  <span
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${
                      industry.highlight
                        ? 'border-[#2490ed]/30 bg-[#2490ed]/15 text-[#7ec5ff]'
                        : 'border-white/10 bg-white/[0.05] text-white/55 group-hover:text-[#7ec5ff]'
                    }`}
                  >
                    <Icon className="h-5 w-5" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1 text-sm font-semibold text-white/85 transition-colors group-hover:text-white">
                    {industry.label}
                  </span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-[#2490ed] opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100" />
                </Link>
              </AnimatedCard>
            );
          })}
        </div>
        <div className="mt-10 text-center">
          <Link
            href="/industries"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#7ec5ff] transition-colors hover:text-white"
          >
            View all industries <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </AnimatedSection>

      {/* ── Why Online ─────────────────────────────────────────────────────── */}
      <AnimatedSection
        label="The online advantage"
        title="Why crews choose flexible learning"
        className="bg-white/[0.015]"
      >
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
          {(
            [
              {
                title: '24/7 access',
                desc: 'Learn at 2am or 2pm. Our platform never closes. Complete courses around your work schedule.',
                color: '#2490ed',
                Icon: Clock,
              },
              {
                title: 'No travel required',
                desc: 'No flights, no hotels, no time away from work. Train your entire team without leaving the office.',
                color: '#00d4aa',
                Icon: Globe,
              },
              {
                title: 'Instant credentials',
                desc: 'Complete a course, get your certificate. Verifiable digital credentials you can share immediately.',
                color: '#ed9d24',
                Icon: BadgeCheck,
              },
            ] as const
          ).map((item, i) => (
            <AnimatedCard key={item.title} index={i}>
              <div className="group relative h-full overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-transparent p-6 shadow-[0_20px_60px_-40px_rgba(0,0,0,0.85)] transition-all duration-300 hover:border-white/18">
                <div
                  className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full opacity-30 blur-2xl transition-opacity group-hover:opacity-50"
                  style={{ background: item.color }}
                  aria-hidden
                />
                <div
                  className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border-2 bg-[#050505]/60"
                  style={{ borderColor: `${item.color}55` }}
                >
                  <item.Icon className="h-7 w-7" style={{ color: item.color }} aria-hidden />
                </div>
                <h3 className="mb-2 text-lg font-bold text-white">{item.title}</h3>
                <p className="text-sm leading-relaxed text-white/50">{item.desc}</p>
              </div>
            </AnimatedCard>
          ))}
        </div>
      </AnimatedSection>

      {/* ── How It Works (Student Journey Map) ──────────────────────────── */}
      <AnimatedSection
        label="How it works"
        title="Your learning journey, step by step"
        className="bg-gradient-to-b from-[#2490ed]/[0.05] to-transparent"
      >
        <div className="relative mx-auto max-w-3xl">
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-[#2490ed]/20 to-transparent opacity-40 blur-3xl" aria-hidden />
          <div className="relative rounded-2xl border border-white/10 bg-gradient-to-b from-[#0a1524]/95 to-[#050505] p-6 shadow-[0_28px_90px_-48px_rgba(36,144,237,0.45)] sm:p-10">
            <div
              className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-[#2490ed]/60 to-transparent"
              aria-hidden
            />
            <p className="mb-8 text-center text-sm leading-relaxed text-white/55">
              From enrolment to credential — six steps to IICRC-recognised professional development.
            </p>
            <StudentJourneyMap />
          </div>
        </div>
      </AnimatedSection>

      {/* ── Citable passages (GEO) — editorial cards, scannable stats & sources ─ */}
      <AnimatedSection
        label="Expert content"
        title="Standards, training & industry alignment"
        className="bg-white/[0.02]"
      >
        <div className="w-full space-y-10">
          {/* IICRC */}
          <article
            className="overflow-hidden rounded-2xl shadow-[0_24px_80px_-48px_rgba(36,144,237,0.35)]"
            style={{
              background:
                'linear-gradient(165deg, rgba(36,144,237,0.12) 0%, rgba(255,255,255,0.03) 50%, rgba(5,5,5,0.4) 100%)',
              border: '1px solid rgba(255,255,255,0.12)',
            }}
          >
            <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[minmax(0,220px)_1fr] lg:gap-12">
              <div className="space-y-4">
                <div
                  className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[10px] font-semibold tracking-wide uppercase"
                  style={{
                    background: 'rgba(36,144,237,0.18)',
                    border: '1px solid rgba(36,144,237,0.35)',
                    color: '#7ec5ff',
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
                      className="rounded-xl px-2 py-3 text-center transition-transform hover:scale-[1.02]"
                      style={{
                        background: 'rgba(0,0,0,0.35)',
                        border: '1px solid rgba(36,144,237,0.15)',
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
            className="rounded-2xl p-6 shadow-[0_20px_70px_-50px_rgba(237,157,36,0.25)] sm:p-8"
            style={{
              background:
                'linear-gradient(145deg, rgba(255,255,255,0.05) 0%, rgba(10,15,24,0.95) 60%)',
              border: '1px solid rgba(255,255,255,0.1)',
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
                className="flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-xs shadow-[0_8px_24px_-12px_rgba(237,157,36,0.35)]"
                style={{
                  background: 'rgba(237,157,36,0.14)',
                  border: '1px solid rgba(237,157,36,0.35)',
                  color: 'rgba(255,255,255,0.85)',
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
                  className="flex gap-3 rounded-xl border border-white/8 bg-white/[0.03] p-3 transition-all duration-200 hover:border-[#2490ed]/25 hover:bg-[#2490ed]/[0.06]"
                >
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                    style={{
                      background: 'rgba(36,144,237,0.15)',
                      border: '1px solid rgba(36,144,237,0.3)',
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
            className="relative overflow-hidden rounded-2xl p-6 shadow-[0_28px_90px_-50px_rgba(36,144,237,0.4)] sm:p-8"
            style={{
              background:
                'linear-gradient(125deg, rgba(36,144,237,0.18) 0%, rgba(5,5,5,0.92) 45%, rgba(237,157,36,0.1) 100%)',
              border: '1px solid rgba(255,255,255,0.14)',
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
                  className="flex h-14 w-14 items-center justify-center rounded-2xl text-lg font-bold shadow-[0_12px_40px_-16px_rgba(36,144,237,0.5)]"
                  style={{
                    background: 'linear-gradient(135deg, rgba(36,144,237,0.25), rgba(255,255,255,0.06))',
                    border: '1px solid rgba(255,255,255,0.2)',
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
      <section
        className="relative py-16 md:py-20"
        style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-30"
          aria-hidden
          style={{
            background:
              'radial-gradient(ellipse 60% 50% at 80% 50%, rgba(36,144,237,0.15), transparent 55%)',
          }}
        />
        <div className={`relative ${PUBLIC_SHELL_INNER_CLASS}`}>
          <div
            className="relative overflow-hidden rounded-3xl p-8 sm:p-10 md:p-12"
            style={{
              background:
                'linear-gradient(135deg, rgba(36,144,237,0.14) 0%, rgba(10,18,32,0.98) 42%, rgba(237,157,36,0.1) 100%)',
              border: '1px solid rgba(255,255,255,0.12)',
              boxShadow: '0 32px 100px -48px rgba(36,144,237,0.45)',
            }}
          >
            <div
              className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full blur-3xl"
              style={{ background: 'rgba(36,144,237,0.2)' }}
              aria-hidden
            />
            <div className="relative flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-xl">
                <p className="mb-2 inline-flex items-center rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[10px] font-semibold tracking-[0.15em] text-[#7ec5ff] uppercase">
                  National partnership
                </p>
                <h3 className="mb-3 text-2xl font-bold tracking-tight text-white md:text-3xl">
                  NRPG onboarding partner
                </h3>
                <p className="text-sm leading-relaxed text-white/55 md:text-base">
                  CARSI is one of the four core pillars of the National Restoration Professionals
                  Group onboarding pathway. Industry-recognised training that meets NRPG standards.
                </p>
              </div>
              <div className="flex flex-col items-stretch gap-4 sm:flex-row sm:items-center">
                <div
                  className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl text-base font-bold tracking-tight shadow-[0_16px_48px_-20px_rgba(36,144,237,0.45)]"
                  style={{
                    background: 'linear-gradient(145deg, rgba(255,255,255,0.12), rgba(36,144,237,0.2))',
                    border: '1px solid rgba(255,255,255,0.2)',
                    color: '#fff',
                  }}
                >
                  NRPG
                </div>
                <Link
                  href="/pathways"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-[#ed9d24] px-8 py-3.5 text-sm font-bold text-[#1a1205] shadow-[0_12px_36px_-12px_rgba(237,157,36,0.55)] transition-transform hover:scale-[1.02]"
                >
                  View pathways <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ (visible + schema) ─────────────────────────────────────────── */}
      <AnimatedSection
        label="Common questions"
        title="Frequently asked questions"
        className="bg-gradient-to-b from-white/[0.02] to-transparent"
      >
        <div className="w-full space-y-3">
          {faqs.map((faq, i) => (
            <AnimatedCard key={faq.question} index={i}>
              <details className="group overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] shadow-[0_12px_40px_-32px_rgba(0,0,0,0.9)] transition-colors open:border-[#2490ed]/30">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-sm font-semibold text-white/90 select-none sm:px-6 sm:py-5 sm:text-[15px]">
                  {faq.question}
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 transition-all group-open:border-[#2490ed]/35 group-open:bg-[#2490ed]/10">
                    <ChevronDown className="h-4 w-4 text-[#2490ed] transition-transform duration-200 group-open:rotate-180" />
                  </span>
                </summary>
                <div className="border-t border-white/8 px-5 py-4 text-sm leading-relaxed text-white/55 sm:px-6 sm:pb-5">
                  {faq.answer}
                </div>
              </details>
            </AnimatedCard>
          ))}
        </div>
      </AnimatedSection>

      {/* ── Certificate Preview ──────────────────────────────────────────── */}
      <AnimatedSection
        label="Credentials"
        title="Verifiable Digital Certificates"
        minimalHeader
      >
        <div className="mx-auto max-w-xl">
          <p className="mb-6 text-center text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
            Every completed course earns you a verifiable digital certificate with a public URL you
            can share with employers and clients.
          </p>
          <CertificatePreview />
        </div>
      </AnimatedSection>

      {/* ── CTA ────────────────────────────────────────────────────────────── */}
      <section className="py-16 md:py-24" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div className={PUBLIC_SHELL_INNER_CLASS}>
          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#2490ed]/25 via-[#0a1528] to-[#050505] px-6 py-14 shadow-[0_40px_120px_-50px_rgba(36,144,237,0.55)] sm:px-12 sm:py-16">
            <div
              className="pointer-events-none absolute inset-0 opacity-40"
              aria-hidden
              style={{
                backgroundImage: `linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px),
                  linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)`,
                backgroundSize: '40px 40px',
              }}
            />
            <div
              className="pointer-events-none absolute -right-24 top-1/2 h-72 w-72 -translate-y-1/2 rounded-full blur-3xl"
              style={{ background: 'rgba(237,157,36,0.12)' }}
              aria-hidden
            />
            <div className="relative mx-auto max-w-2xl text-center">
              <p className="mb-3 text-[11px] font-semibold tracking-[0.2em] text-[#7ec5ff] uppercase">
                Get started
              </p>
              <h2 className="mb-4 text-3xl font-bold tracking-tight text-white md:text-4xl">
                Start learning today
              </h2>
              <p className="mb-10 text-base leading-relaxed text-white/55">
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
                  className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-8 py-3.5 text-sm font-semibold text-white backdrop-blur-sm transition-all hover:border-white/35 hover:bg-white/15"
                >
                  Free courses
                </Link>
                <Link
                  href="/courses"
                  className="inline-flex items-center gap-2 rounded-full bg-[#ed9d24] px-8 py-3.5 text-sm font-bold text-[#1a1205] shadow-[0_12px_40px_-12px_rgba(237,157,36,0.55)] transition-transform hover:scale-[1.02]"
                >
                  Browse all courses{' '}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <PublicFooter />

      <FloatingChatGate />
    </div>
  );
}
