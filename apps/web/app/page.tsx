import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';
import {
  AnimatedHero,
  AnimatedStats,
  AnimatedCard,
  AnimatedSection,
} from '@/components/landing/AnimatedHero';
import { MobileNav } from '@/components/landing/MobileNav';

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

async function getFeaturedCourses(): Promise<Course[]> {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:8000';
  try {
    const res = await fetch(`${backendUrl}/api/lms/courses?limit=3`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.items ?? [];
  } catch {
    return [];
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

const stats = [
  { value: '24/7', label: 'Online Access' },
  { value: '12+', label: 'Industries Served' },
  { value: '91', label: 'Courses' },
  { value: '7', label: 'IICRC Disciplines' },
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
      className="group block overflow-hidden rounded-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-blue-500/5"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
      }}
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
            className="absolute top-3 left-3 rounded px-2 py-0.5 font-mono text-[10px] font-bold tracking-wide uppercase"
            style={{
              background: 'rgba(0,0,0,0.7)',
              color: '#2490ed',
              border: '1px solid rgba(36,144,237,0.3)',
            }}
          >
            {course.discipline}
          </span>
        )}
      </div>
      <div className="p-4">
        <h3
          className="mb-2 line-clamp-2 text-sm leading-snug font-semibold"
          style={{ color: 'rgba(255,255,255,0.9)' }}
        >
          {course.title}
        </h3>
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium" style={{ color: isFree ? '#27ae60' : '#ed9d24' }}>
            {isFree ? 'Free' : `$${priceNum.toFixed(0)} AUD`}
          </span>
          <span
            className="text-xs opacity-0 transition-opacity duration-200 group-hover:opacity-100"
            style={{ color: '#2490ed' }}
          >
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
      className="overflow-hidden rounded-lg"
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

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function Home() {
  const featuredCourses = await getFeaturedCourses();

  return (
    <div className="min-h-screen" style={{ background: '#0a0f1a' }}>
      {/* Single subtle gradient orb — much calmer than 3 animated blobs */}
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(36,144,237,0.08) 0%, transparent 50%)',
        }}
        aria-hidden="true"
      />

      {/* ── Navigation ─────────────────────────────────────────────────────── */}
      <nav
        className="sticky top-0 z-50"
        style={{
          background: 'rgba(10,15,26,0.9)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex h-16 items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <div
                className="flex h-8 w-8 items-center justify-center rounded-md font-bold text-white"
                style={{ background: '#2490ed' }}
              >
                C
              </div>
              <span className="font-semibold" style={{ color: 'rgba(255,255,255,0.9)' }}>
                CARSI
              </span>
            </Link>

            <div className="hidden items-center gap-8 md:flex">
              {['Courses', 'Industries', 'Pathways', 'Pricing'].map((item) => (
                <Link
                  key={item}
                  href={`/${item.toLowerCase()}`}
                  className="text-sm transition-colors duration-150 hover:text-white"
                  style={{ color: 'rgba(255,255,255,0.5)' }}
                >
                  {item}
                </Link>
              ))}
            </div>

            <div className="hidden items-center gap-4 md:flex">
              <Link
                href="/login"
                className="text-sm transition-colors duration-150 hover:text-white"
                style={{ color: 'rgba(255,255,255,0.5)' }}
              >
                Sign In
              </Link>
              <Link
                href="/courses"
                className="rounded-md px-4 py-2 text-sm font-medium text-white transition-all duration-200 hover:scale-[1.02]"
                style={{ background: '#ed9d24' }}
              >
                Browse Courses
              </Link>
            </div>

            {/* Mobile hamburger menu */}
            <MobileNav />
          </div>
        </div>
      </nav>

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
            IICRC Disciplines
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {disciplines.map((d) => (
              <Link
                key={d.code}
                href={`/courses?discipline=${d.code}`}
                className="rounded-md px-3 py-1.5 text-xs transition-all duration-200 hover:-translate-y-0.5 hover:text-white"
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
        <p className="mb-6 max-w-2xl text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
          From hospitals to hotels, government facilities to commercial buildings — CARSI provides
          industry-specific training pathways. Not just restoration. Every industry that needs IICRC
          credentials.
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {industries.map((industry, i) => (
            <AnimatedCard key={industry.slug} index={i}>
              <Link
                href={`/industries/${industry.slug}`}
                className="group flex items-center justify-between rounded-lg px-4 py-3 transition-all duration-200 hover:-translate-y-0.5"
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
              color: '#27ae60',
            },
            {
              title: 'Instant Credentials',
              desc: 'Complete a course, get your certificate. Verifiable digital credentials you can share immediately.',
              color: '#ed9d24',
            },
          ].map((item, i) => (
            <AnimatedCard key={item.title} index={i}>
              <div
                className="rounded-lg p-6"
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

      {/* ── NRPG Partnership ─────────────────────────────────────────────────── */}
      <section className="px-6 py-16" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="mx-auto max-w-6xl">
          <div
            className="rounded-lg p-8 sm:p-10"
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
                  className="flex h-14 w-14 items-center justify-center rounded-lg text-lg font-bold"
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

      {/* ── CTA ────────────────────────────────────────────────────────────── */}
      <section className="px-6 py-20" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="mb-4 text-3xl font-bold" style={{ color: 'rgba(255,255,255,0.95)' }}>
            Start learning today
          </h2>
          <p className="mb-8 text-base" style={{ color: 'rgba(255,255,255,0.5)' }}>
            Free courses available. Premium courses from just $20 AUD.
            <br />
            Or get full access to all 91 courses for $795 AUD/year.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/courses?filter=free"
              className="group inline-flex items-center gap-2 rounded-md px-8 py-3 font-medium transition-all duration-200 hover:scale-[1.02] hover:text-white"
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
              className="group inline-flex items-center gap-2 rounded-md px-8 py-3 font-medium text-white transition-all duration-200 hover:scale-[1.02]"
              style={{ background: '#ed9d24' }}
            >
              Browse All Courses{' '}
              <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <footer className="px-6 py-12" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="mx-auto max-w-6xl">
          <div className="mb-8 grid gap-8 sm:grid-cols-4">
            <div>
              <div className="mb-3 flex items-center gap-2">
                <div
                  className="flex h-6 w-6 items-center justify-center rounded text-xs font-bold text-white"
                  style={{ background: '#2490ed' }}
                >
                  C
                </div>
                <span className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.8)' }}>
                  CARSI
                </span>
              </div>
              <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.4)' }}>
                Australia&apos;s industry training leader.
                <br />
                24/7 online. IICRC-approved.
              </p>
            </div>

            <div>
              <p
                className="mb-3 text-[10px] font-semibold tracking-wide uppercase"
                style={{ color: 'rgba(255,255,255,0.3)' }}
              >
                Platform
              </p>
              <ul className="space-y-2 text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
                {['Courses', 'Pathways', 'Pricing', 'About'].map((item) => (
                  <li key={item}>
                    <Link href={`/${item.toLowerCase()}`} className="hover:text-white">
                      {item}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p
                className="mb-3 text-[10px] font-semibold tracking-wide uppercase"
                style={{ color: 'rgba(255,255,255,0.3)' }}
              >
                Industries
              </p>
              <ul className="space-y-2 text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
                {industries.slice(0, 4).map((industry) => (
                  <li key={industry.slug}>
                    <Link href={`/industries/${industry.slug}`} className="hover:text-white">
                      {industry.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p
                className="mb-3 text-[10px] font-semibold tracking-wide uppercase"
                style={{ color: 'rgba(255,255,255,0.3)' }}
              >
                Contact
              </p>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
                info@carsi.com.au
              </p>
            </div>
          </div>

          <div
            className="flex flex-col items-center justify-between gap-2 pt-6 sm:flex-row"
            style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
          >
            <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.25)' }}>
              © 2026 CARSI Pty Ltd. All rights reserved.
            </p>
            <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.25)' }}>
              IICRC-aligned continuing education — not an RTO
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
