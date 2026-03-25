import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';
import {
  AnimatedHero,
  AnimatedStats,
  AnimatedCard,
  AnimatedSection,
} from '@/components/landing/AnimatedHero';
import { PublicNavbar } from '@/components/landing/PublicNavbar';
import { PublicFooter } from '@/components/landing/PublicFooter';
import { FAQSchema } from '@/components/seo/JsonLd';
import { IICRCDisciplineMap } from '@/components/lms/diagrams/IICRCDisciplineMap';
import { StudentJourneyMap } from '@/components/lms/diagrams/StudentJourneyMap';
import { AcronymTooltip } from '@/components/ui/AcronymTooltip';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Course {
  id: string;
  slug: string;
  title: string;
  short_description?: string | null;
  price_aud: number | string;
  is_free?: boolean;
  discipline?: string | null;
  thumbnail_url?: string | null;
}

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

async function getFeaturedCourses(): Promise<{ courses: Course[]; total: number }> {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:8000';
  try {
    const res = await fetch(`${backendUrl}/api/lms/courses?limit=3`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return { courses: [], total: 0 };
    const data = await res.json();
    return { courses: data.items ?? [], total: data.total ?? 0 };
  } catch {
    return { courses: [], total: 0 };
  }
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const disciplines = [
  { code: 'WRT', label: 'Water Restoration' },
  { code: 'CRT', label: 'Carpet Restoration' },
  { code: 'ASD', label: 'Structural Drying' },
  { code: 'AMRT', label: 'Microbial Remediation' },
  { code: 'FSRT', label: 'Fire & Smoke' },
];

const industries = [
  { slug: 'healthcare', label: 'Healthcare', highlight: true },
  { slug: 'hospitality', label: 'Hotels & Resorts', highlight: true },
  { slug: 'government-defence', label: 'Government & Defence', highlight: true },
  { slug: 'commercial-cleaning', label: 'Commercial Cleaning', highlight: true },
  { slug: 'aged-care', label: 'Aged Care', highlight: false },
  { slug: 'mining', label: 'Mining & Resources', highlight: false },
  { slug: 'education', label: 'Education', highlight: false },
  { slug: 'property-management', label: 'Property Management', highlight: false },
  { slug: 'strata', label: 'Strata & Body Corporate', highlight: false },
  { slug: 'retail', label: 'Retail & Shopping Centres', highlight: false },
  { slug: 'childcare', label: 'Childcare', highlight: false },
  { slug: 'construction', label: 'Construction', highlight: false },
  { slug: 'insurance', label: 'Insurance', highlight: false },
  { slug: 'plumbing-trades', label: 'Plumbing & Trades', highlight: false },
  { slug: 'ndis-disability', label: 'NDIS & Disability Services', highlight: false },
  { slug: 'gyms-fitness', label: 'Gyms & Fitness', highlight: false },
  { slug: 'real-estate', label: 'Real Estate', highlight: false },
  { slug: 'emergency-management', label: 'Emergency Management', highlight: false },
  { slug: 'caravan-parks', label: 'Caravan Parks', highlight: false },
];

const benefits = [
  '24/7 access — learn anytime, anywhere',
  'IICRC CEC-approved courses',
  'Automatic credit tracking',
  'Verifiable digital credentials',
  'No travel, no downtime, no waiting',
];

const BASE_STATS = [
  { value: '24/7', label: 'Online Access' },
  { value: '19', label: 'Industries Served' },
  { value: '7', label: 'IICRC Disciplines' },
];

const faqs = [
  {
    question: 'What is CARSI?',
    answer:
      'CARSI is an Australian online training platform offering IICRC CEC-approved courses for cleaning and restoration professionals. With over 140 courses and resources across seven IICRC disciplines, CARSI enables technicians to maintain their certification entirely online.',
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
      'CARSI serves 19 industries including healthcare, hospitality, aged care, mining and resources, commercial cleaning, government and defence, education, property management, strata, retail, childcare, construction, insurance, plumbing and trades, NDIS and disability services, gyms and fitness, real estate, emergency management, and caravan parks.',
  },
];

const testimonials = [
  {
    name: 'Klark Brown',
    company: 'Restoration Advisers',
    quote:
      "We've enrolled our entire team through CARSI. The IICRC discipline coverage is comprehensive, the course quality is consistently high, and the platform just works. It's our go-to for keeping technicians certified.",
  },
  {
    name: 'Shannon Benz',
    company: 'Mould Solutions Group',
    quote:
      "CARSI's mould remediation courses gave my team the IICRC-aligned knowledge we needed to tackle complex jobs with confidence. The CEC credit tracking is clear and the content is genuinely practical.",
  },
  {
    name: 'Yasser Mohamed',
    company: 'Black Gold Carpet Cleaning',
    quote:
      "Running my own carpet cleaning business means training has to fit around the job. CARSI's 24/7 online access let me complete my CRT preparation between callouts. Worth every dollar.",
  },
];

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function CourseCard({ course }: { course: Course }) {
  const priceNum =
    typeof course.price_aud === 'string' ? parseFloat(course.price_aud) : course.price_aud;
  const isFree = course.is_free || priceNum === 0;

  return (
    <Link
      href={`/courses/${course.slug}`}
      className="group block overflow-hidden rounded-sm border border-border bg-card transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-blue-500/5"
    >
      <div className="relative h-40 overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900">
        {course.thumbnail_url && (
          <Image
            src={course.thumbnail_url}
            alt={course.title}
            fill
            className="object-cover opacity-80 transition-all duration-300 group-hover:scale-105 group-hover:opacity-100"
            sizes="(max-width: 768px) 100vw, 33vw"
          />
        )}
        {course.discipline && (
          <span
            className="absolute top-3 left-3 rounded-sm bg-background/80 px-2 py-0.5 font-mono text-[10px] font-bold tracking-wide uppercase text-primary ring-1 ring-primary/30"
          >
            {course.discipline}
          </span>
        )}
      </div>
      <div className="p-4">
        <h3
          className="mb-2 line-clamp-2 text-sm leading-snug font-semibold text-foreground"
        >
          {course.title}
        </h3>
        <div className="flex items-center justify-between">
          <span className={`text-xs font-medium ${isFree ? 'text-green-500' : 'text-carsi-orange'}`}>
            {isFree ? 'Free' : `$${priceNum.toFixed(0)} AUD`}
          </span>
          <span className="text-xs text-primary opacity-0 transition-opacity duration-200 group-hover:opacity-100">
            View course →
          </span>
        </div>
      </div>
    </Link>
  );
}

function SkeletonCard() {
  return (
    <div
      className="overflow-hidden rounded-sm border border-border bg-card"
    >
      <div className="h-40 animate-pulse bg-muted/50" />
      <div className="space-y-2 p-4">
        <div className="h-4 w-3/4 animate-pulse rounded bg-muted/30" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-muted/30" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function Home() {
  const { courses: featuredCourses, total: courseTotal } = await getFeaturedCourses();

  const stats = [
    ...BASE_STATS,
    { value: courseTotal > 0 ? courseTotal.toString() : '140+', label: 'Courses' },
  ];

  return (
    <div id="main-content" className="min-h-screen bg-background">
      {/* FAQ structured data for GEO/AI search engines */}
      <FAQSchema questions={faqs} />

      {/* Single subtle gradient orb — much calmer than 3 animated blobs */}
      <div
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_0%,hsl(var(--primary)/0.07)_0%,transparent_55%)]"
        aria-hidden="true"
      />

      {/* ── Navigation ─────────────────────────────────────────────────────── */}
      <PublicNavbar />

      {/* ── Hero (Animated) ────────────────────────────────────────────────── */}
      <AnimatedHero benefits={benefits} />

      {/* ── Stats (Animated) ───────────────────────────────────────────────── */}
      <AnimatedStats stats={stats} />

      {/* ── Disciplines (compact pills) ────────────────────────────────────── */}
      <section className="border-t border-border px-6 py-12">
        <div className="mx-auto max-w-6xl">
          <p
            className="mb-4 text-center text-xs tracking-wide uppercase text-muted-foreground"
          >
            <AcronymTooltip term="IICRC" /> Disciplines
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {disciplines.map((d) => (
              <Link
                key={d.code}
                href={`/courses?discipline=${d.code}`}
                className="rounded-sm px-3 py-1.5 text-xs border border-border bg-card/60 text-muted-foreground transition-all duration-200 hover:-translate-y-0.5 hover:text-foreground"
              >
                <span className="font-mono font-bold text-primary">
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
          <p className="mb-6 text-center text-sm text-muted-foreground">
            Explore the seven IICRC disciplines. Hover over each node to see the full certification
            name.
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
            className="flex items-center gap-1 text-sm text-primary transition-colors duration-150 hover:text-foreground"
          >
            All courses <ArrowRight className="h-4 w-4" />
          </Link>
        }
      >
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {featuredCourses.length > 0
            ? featuredCourses.map((course, i) => (
                <AnimatedCard key={course.id} index={i}>
                  <CourseCard course={course} />
                </AnimatedCard>
              ))
            : [1, 2, 3].map((i) => (
                <AnimatedCard key={i} index={i}>
                  <SkeletonCard />
                </AnimatedCard>
              ))}
        </div>
      </AnimatedSection>

      {/* ── Industries ─────────────────────────────────────────────────────── */}
      <AnimatedSection label="Multi-Industry Training" title="Built for every sector">
        <p className="mb-6 max-w-2xl text-sm text-muted-foreground">
          From hospitals to hotels, government facilities to commercial buildings — CARSI provides
          industry-specific training pathways. Not just restoration. Every industry that needs{' '}
          <AcronymTooltip term="IICRC" /> credentials.
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {industries.map((industry, i) => (
            <AnimatedCard key={industry.slug} index={i}>
              <Link
                href={`/industries/${industry.slug}`}
                className={`group flex items-center justify-between rounded-sm px-4 py-3 transition-all duration-200 hover:-translate-y-0.5 border ${industry.highlight ? 'bg-primary/8 border-primary/20' : 'bg-card/60 border-border'}`}
              >
                <span
                  className={`text-sm font-medium transition-colors duration-150 group-hover:text-foreground ${industry.highlight ? 'text-primary' : 'text-muted-foreground'}`}
                >
                  {industry.label}
                </span>
                <ArrowRight
                  className="h-3 w-3 text-primary opacity-0 transition-all duration-200 group-hover:translate-x-0.5 group-hover:opacity-100"
                />
              </Link>
            </AnimatedCard>
          ))}
        </div>
        <div className="mt-6 text-center">
          <Link
            href="/industries"
            className="text-sm font-medium transition-colors hover:text-foreground text-muted-foreground"
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
              accentClass: 'bg-primary',
            },
            {
              title: 'No Travel Required',
              desc: 'No flights, no hotels, no time away from work. Train your entire team without leaving the office.',
              accentClass: 'bg-green-500',
            },
            {
              title: 'Instant Credentials',
              desc: 'Complete a course, get your certificate. Verifiable digital credentials you can share immediately.',
              accentClass: 'bg-carsi-orange',
            },
          ].map((item, i) => (
            <AnimatedCard key={item.title} index={i}>
              <div className="rounded-sm border border-border bg-card p-6">
                <div className={`mb-3 h-1 w-8 rounded-full ${item.accentClass}`} />
                <h3 className="mb-2 text-base font-semibold text-foreground">
                  {item.title}
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
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
          <p className="mb-6 text-center text-sm text-muted-foreground">
            From enrolment to credential — six steps to IICRC-recognised professional development.
          </p>
          <StudentJourneyMap />
        </div>
      </AnimatedSection>

      {/* ── Citable Passages (GEO-optimised) ─────────────────────────────── */}
      <AnimatedSection label="Industry Standards" title="What is IICRC Certification?">
        <div className="mx-auto max-w-3xl">
          <p
            className="text-sm leading-relaxed text-muted-foreground sm:text-base sm:leading-relaxed"
          >
            The Institute of Inspection Cleaning and Restoration Certification (
            <AcronymTooltip term="IICRC" />) is the global standard-setting body for the cleaning
            and restoration industry. Established in 1972 in the United States, the{' '}
            <AcronymTooltip term="IICRC" /> now operates across 25 countries and has certified over
            67,000 technicians worldwide{' '}
            <span className="text-xs text-muted-foreground">
              (source:{' '}
              <a
                href="https://www.iicrc.org/page/About-the-IICRC"
                target="_blank"
                rel="noopener noreferrer"
                className="underline decoration-dotted hover:text-foreground"
              >
                IICRC.org
              </a>
              )
            </span>
            . The organisation maintains standards across seven core disciplines including Water
            Damage Restoration (<AcronymTooltip term="WRT" />
            ), Carpet Repair and Reinstallation (<AcronymTooltip term="CRT" />
            ), Applied Structural Drying (<AcronymTooltip term="ASD" />
            ), Applied Microbial Remediation (<AcronymTooltip term="AMRT" />
            ), Odour Control (<AcronymTooltip term="OCT" />
            ), Carpet Cleaning (<AcronymTooltip term="CCT" />
            ), and Fire and Smoke Restoration (<AcronymTooltip term="FSRT" />
            ). In Australia, <AcronymTooltip term="IICRC" /> certification is recognised by major
            insurers such as IAG, Suncorp, and QBE as evidence of professional competency.
            Technicians must earn Continuing Education Credits (
            <AcronymTooltip term="CEC">CECs</AcronymTooltip>) every two years to maintain their
            certified status{' '}
            <span className="text-xs text-muted-foreground">
              (source:{' '}
              <a
                href="https://www.iicrc.org/page/IICRCGlobalLocations"
                target="_blank"
                rel="noopener noreferrer"
                className="underline decoration-dotted hover:text-foreground"
              >
                IICRC Global
              </a>
              )
            </span>
            . CARSI offers over 60 <AcronymTooltip term="IICRC" />{' '}
            <AcronymTooltip term="CEC" />-approved online courses across all seven disciplines,
            allowing Australian professionals to meet their renewal requirements without travelling
            interstate.
          </p>
          <p className="mt-4 text-xs italic text-muted-foreground">
            Last reviewed: March 2026
          </p>
        </div>
      </AnimatedSection>

      <AnimatedSection label="Online Learning" title="Why Choose Online Restoration Training?">
        <div className="mx-auto max-w-3xl">
          <p
            className="text-sm leading-relaxed text-muted-foreground sm:text-base sm:leading-relaxed"
          >
            Traditional face-to-face restoration training in Australia requires travel,
            accommodation, and time away from active job sites. For technicians in regional areas —
            from Cairns to Kalgoorlie — attending a two-day course in a capital city can cost over
            $2,000 in travel expenses alone, on top of course fees and lost billable hours.
            CARSI&apos;s online platform eliminates these barriers entirely. Courses are available
            24 hours a day, 7 days a week, accessible from any device with an internet connection.
            Learners can complete modules at their own pace, pause mid-lesson and resume between
            jobs, and fit study around shift work or on-call rosters. Upon completion, certificates
            are generated instantly as verifiable digital credentials that can be shared with
            employers or added to a LinkedIn profile within minutes. With courses starting from $20
            AUD and a Growth membership at $795 AUD per year (or Foundation from $495/year), CARSI provides the most
            cost-effective path to <AcronymTooltip term="IICRC" /> certification maintenance in
            Australia.
          </p>
          <p className="mt-4 text-xs italic text-muted-foreground">
            Last reviewed: March 2026
          </p>
        </div>
      </AnimatedSection>

      <AnimatedSection label="Industry Partnership" title="What is CARSI's Role in the NRPG?">
        <div className="mx-auto max-w-3xl">
          <p
            className="text-sm leading-relaxed text-muted-foreground sm:text-base sm:leading-relaxed"
          >
            CARSI is one of the four core pillars of the National Restoration Professionals Group
            (NRPG) onboarding pathway. The NRPG is Australia&apos;s peak body for the restoration
            and remediation industry, setting workforce standards that insurers, loss adjusters, and
            building managers rely on when selecting qualified contractors{' '}
            <span className="text-xs text-muted-foreground">
              (source:{' '}
              <a
                href="https://www.nrpg.com.au"
                target="_blank"
                rel="noopener noreferrer"
                className="underline decoration-dotted hover:text-foreground"
              >
                NRPG.com.au
              </a>
              )
            </span>
            . The NRPG onboarding pathway requires new technicians to complete foundational training
            before entering the field. CARSI fulfils the education pillar of this pathway, providing
            the <AcronymTooltip term="IICRC" /> <AcronymTooltip term="CEC" />
            -approved coursework that new entrants must complete alongside practical mentoring,
            equipment familiarisation, and workplace health and safety induction. This partnership
            means CARSI-trained technicians are recognised across the NRPG network from day one. For
            restoration companies, enrolling staff through CARSI ensures compliance with NRPG
            workforce standards without disrupting operations. With over 140 courses and resources
            spanning all seven <AcronymTooltip term="IICRC" /> disciplines, CARSI provides the most comprehensive
            online training library available to Australian restoration professionals.
          </p>
          <p className="mt-4 text-xs italic text-muted-foreground">
            Last reviewed: March 2026
          </p>
        </div>
      </AnimatedSection>

      {/* ── NRPG Partnership ─────────────────────────────────────────────────── */}
      <section className="border-t border-border px-6 py-16">
        <div className="mx-auto max-w-6xl">
          <div
            className="rounded-sm border border-border bg-card p-8 sm:p-10"
          >
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p
                  className="mb-2 text-xs tracking-wide uppercase text-muted-foreground"
                >
                  National Partnership
                </p>
                <h3 className="mb-2 text-xl font-bold text-foreground">
                  NRPG Onboarding Partner
                </h3>
                <p className="max-w-md text-sm text-muted-foreground">
                  CARSI is one of the four core pillars of the National Restoration Professionals
                  Group onboarding pathway. Industry-recognised training that meets NRPG standards.
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div
                  className="flex h-14 w-14 items-center justify-center rounded-sm border border-border bg-secondary text-lg font-bold text-primary"
                >
                  NRPG
                </div>
                <Link
                  href="/pathways"
                  className="text-sm font-medium text-primary transition-colors hover:text-foreground"
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
        <div className="mx-auto max-w-3xl space-y-4">
          {faqs.map((faq, i) => (
            <AnimatedCard key={faq.question} index={i}>
              <details
                className="group rounded-sm border border-border bg-card"
              >
                <summary
                  className="flex cursor-pointer items-center justify-between px-5 py-4 text-sm font-medium text-foreground select-none"
                >
                  {faq.question}
                  <span
                    className="ml-2 text-primary transition-transform duration-200 group-open:rotate-45"
                  >
                    +
                  </span>
                </summary>
                <div
                  className="px-5 pb-4 text-sm leading-relaxed text-muted-foreground"
                >
                  {faq.answer}
                </div>
              </details>
            </AnimatedCard>
          ))}
        </div>
      </AnimatedSection>

      {/* ── Testimonials ──────────────────────────────────────────────────── */}
      <AnimatedSection label="Student Reviews" title="What professionals say">
        <div className="grid gap-6 sm:grid-cols-3">
          {testimonials.map((t, i) => (
            <AnimatedCard key={t.name} index={i}>
              <div className="flex h-full flex-col rounded-sm border border-border bg-card p-6">
                <p className="mb-4 flex-1 text-sm leading-relaxed text-muted-foreground">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div className="border-t border-border pt-4">
                  <p className="text-sm font-semibold text-foreground">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.company}</p>
                </div>
              </div>
            </AnimatedCard>
          ))}
        </div>
        <div className="mt-6 text-center">
          <Link
            href="/testimonials"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Read all reviews →
          </Link>
        </div>
      </AnimatedSection>

      {/* ── Pricing Teaser ────────────────────────────────────────────────── */}
      <section className="border-t border-border px-6 py-16">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8">
            <p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground/60">Membership</p>
            <h2 className="text-2xl font-bold text-foreground">Simple, transparent pricing</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {/* Free */}
            <div className="rounded-sm border border-border bg-card p-6">
              <p className="mb-1 text-sm font-semibold text-foreground">Free Library</p>
              <p className="mb-3 text-3xl font-bold text-foreground">$0</p>
              <p className="mb-4 text-xs text-muted-foreground">Australian government resources, SOPs, guides &amp; free webinar series. No card required.</p>
              <Link href="/register" className="flex w-full items-center justify-center rounded-sm border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
                Get Started Free
              </Link>
            </div>
            {/* Foundation */}
            <div className="rounded-sm border border-primary/20 bg-primary/5 p-6">
              <p className="mb-1 text-sm font-semibold text-foreground">Foundation</p>
              <div className="mb-1 flex items-baseline gap-1">
                <span className="text-3xl font-bold text-foreground">$44</span>
                <span className="text-sm text-muted-foreground">/ month</span>
              </div>
              <p className="mb-4 text-xs text-muted-foreground">Entry-level CEC courses — PPE, moisture metering, Level 1 Mould, Carpet Cleaning Basics &amp; more. 7-day free trial.</p>
              <Link href="/subscribe?plan=foundation" className="flex w-full items-center justify-center rounded-sm bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90">
                Start Free Trial
              </Link>
            </div>
            {/* Growth */}
            <div className="relative rounded-sm border border-primary/20 bg-primary/5 p-6">
              <span className="absolute -top-3 left-5 rounded-sm bg-green-500 px-3 py-0.5 text-xs font-semibold uppercase tracking-wide text-black">Most Popular</span>
              <p className="mb-1 text-sm font-semibold text-foreground">Growth</p>
              <div className="mb-1 flex items-baseline gap-1">
                <span className="text-3xl font-bold text-foreground">$99</span>
                <span className="text-sm text-muted-foreground">/ month</span>
              </div>
              <p className="mb-4 text-xs text-muted-foreground">Unlock all 140+ courses — Level 2 Mould, Admin, Social Media, NeoSan Labs, IICRC CEC dashboard &amp; shareable credentials. 7-day free trial.</p>
              <Link href="/subscribe?plan=growth" className="flex w-full items-center justify-center rounded-sm bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90">
                Start Free Trial
              </Link>
            </div>
          </div>
          <p className="mt-4 text-center text-xs text-muted-foreground/50">
            Annual plans available — Foundation $495/yr, Growth $795/yr.{' '}
            <Link href="/pricing" className="underline hover:text-muted-foreground">See full pricing →</Link>
          </p>
        </div>
      </section>

      {/* ── CTA ────────────────────────────────────────────────────────────── */}
      <section className="border-t border-border px-6 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="mb-4 text-3xl font-bold text-foreground">
            Start learning today
          </h2>
          <p className="mb-8 text-base text-muted-foreground">
            Free courses available. Premium courses from just $20 AUD.
            <br />
            Or get full access with Growth membership for $795 AUD/year.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/courses?filter=free"
              className="group inline-flex items-center gap-2 rounded-sm px-8 py-3 font-medium border border-border bg-secondary text-muted-foreground transition-all duration-200 hover:scale-[1.02] hover:text-foreground"
            >
              Free Courses
            </Link>
            <Link
              href="/courses"
              className="group inline-flex items-center gap-2 rounded-sm bg-carsi-orange px-8 py-3 font-medium text-white transition-all duration-200 hover:scale-[1.02]"
            >
              Browse All Courses{' '}
              <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <PublicFooter />
    </div>
  );
}
