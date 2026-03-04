import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, CheckCircle2 } from 'lucide-react';

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
  { slug: 'aged-care', label: 'Aged Care' },
  { slug: 'childcare', label: 'Childcare' },
  { slug: 'healthcare', label: 'Healthcare' },
  { slug: 'construction', label: 'Construction' },
  { slug: 'property-management', label: 'Property Management' },
  { slug: 'government-defence', label: 'Government & Defence' },
  { slug: 'commercial-cleaning', label: 'Commercial Cleaning' },
  { slug: 'mining', label: 'Mining' },
];

const benefits = [
  'IICRC CEC-approved courses',
  'Automatic credit tracking',
  'Verifiable digital credentials',
  'Self-paced online learning',
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
      className="group block overflow-hidden rounded-lg transition-transform duration-200 hover:-translate-y-1"
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
            className="object-cover opacity-80 transition-opacity duration-200 group-hover:opacity-100"
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

            <div className="flex items-center gap-4">
              <Link
                href="/login"
                className="text-sm transition-colors duration-150 hover:text-white"
                style={{ color: 'rgba(255,255,255,0.5)' }}
              >
                Sign In
              </Link>
              <Link
                href="/subscribe"
                className="rounded-md px-4 py-2 text-sm font-medium text-white transition-opacity duration-150 hover:opacity-90"
                style={{ background: '#ed9d24' }}
              >
                Start Free Trial
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* ── Hero ───────────────────────────────────────────────────────────── */}
      <section className="relative px-6 pt-24 pb-20">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-2xl">
            <div
              className="mb-6 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs"
              style={{
                background: 'rgba(36,144,237,0.1)',
                border: '1px solid rgba(36,144,237,0.2)',
                color: '#2490ed',
              }}
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: '#2490ed' }} />
              IICRC CEC Approved
            </div>

            <h1
              className="mb-6 text-4xl leading-tight font-bold tracking-tight sm:text-5xl"
              style={{ color: 'rgba(255,255,255,0.95)' }}
            >
              Professional restoration
              <br />
              training for Australia
            </h1>

            <p
              className="mb-8 max-w-lg text-lg leading-relaxed"
              style={{ color: 'rgba(255,255,255,0.5)' }}
            >
              Earn IICRC Continuing Education Credits with self-paced online courses. Built for
              cleaning and restoration professionals.
            </p>

            <div className="mb-10 flex flex-wrap gap-3">
              <Link
                href="/courses"
                className="inline-flex items-center gap-2 rounded-md px-6 py-3 font-medium text-white transition-opacity duration-150 hover:opacity-90"
                style={{ background: '#ed9d24' }}
              >
                Browse Courses <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/pathways"
                className="inline-flex items-center gap-2 rounded-md px-6 py-3 font-medium transition-colors duration-150 hover:text-white"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: 'rgba(255,255,255,0.7)',
                }}
              >
                View Pathways
              </Link>
            </div>

            {/* Simple benefit list — cleaner than animated cards */}
            <ul className="space-y-2">
              {benefits.map((benefit) => (
                <li
                  key={benefit}
                  className="flex items-center gap-2 text-sm"
                  style={{ color: 'rgba(255,255,255,0.5)' }}
                >
                  <CheckCircle2 className="h-4 w-4 flex-shrink-0" style={{ color: '#27ae60' }} />
                  {benefit}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ── Stats (simple, no animation) ───────────────────────────────────── */}
      <section className="px-6 py-12" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="mx-auto max-w-6xl">
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            {[
              { value: '261+', label: 'Professionals' },
              { value: '91', label: 'Courses' },
              { value: '7', label: 'Disciplines' },
              { value: '4.9', label: 'Avg Rating' },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-3xl font-bold" style={{ color: '#2490ed' }}>
                  {stat.value}
                </p>
                <p
                  className="mt-1 text-xs tracking-wide uppercase"
                  style={{ color: 'rgba(255,255,255,0.4)' }}
                >
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

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
                className="rounded-md px-3 py-1.5 text-xs transition-colors duration-150 hover:text-white"
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

      {/* ── Featured Courses ───────────────────────────────────────────────── */}
      <section className="px-6 py-16" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="mx-auto max-w-6xl">
          <div className="mb-8 flex items-end justify-between">
            <div>
              <p
                className="mb-1 text-xs tracking-wide uppercase"
                style={{ color: 'rgba(255,255,255,0.3)' }}
              >
                Featured
              </p>
              <h2 className="text-2xl font-bold" style={{ color: 'rgba(255,255,255,0.9)' }}>
                Popular Courses
              </h2>
            </div>
            <Link
              href="/courses"
              className="flex items-center gap-1 text-sm transition-colors duration-150 hover:text-white"
              style={{ color: '#2490ed' }}
            >
              All courses <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featuredCourses.length > 0
              ? featuredCourses.map((course) => <CourseCard key={course.id} course={course} />)
              : [1, 2, 3].map((i) => <SkeletonCard key={i} />)}
          </div>
        </div>
      </section>

      {/* ── Industries (new section with all 8) ────────────────────────────── */}
      <section className="px-6 py-16" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="mx-auto max-w-6xl">
          <div className="mb-8">
            <p
              className="mb-1 text-xs tracking-wide uppercase"
              style={{ color: 'rgba(255,255,255,0.3)' }}
            >
              Industry Solutions
            </p>
            <h2 className="text-2xl font-bold" style={{ color: 'rgba(255,255,255,0.9)' }}>
              Training for your sector
            </h2>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {industries.map((industry) => (
              <Link
                key={industry.slug}
                href={`/industries/${industry.slug}`}
                className="group rounded-lg px-4 py-3 transition-colors duration-150"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}
              >
                <span
                  className="text-sm font-medium transition-colors duration-150 group-hover:text-white"
                  style={{ color: 'rgba(255,255,255,0.7)' }}
                >
                  {industry.label}
                </span>
                <ArrowRight
                  className="ml-2 inline h-3 w-3 opacity-0 transition-opacity duration-150 group-hover:opacity-100"
                  style={{ color: '#2490ed' }}
                />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA (single, simple) ───────────────────────────────────────────── */}
      <section className="px-6 py-20" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="mb-4 text-3xl font-bold" style={{ color: 'rgba(255,255,255,0.95)' }}>
            Ready to get certified?
          </h2>
          <p className="mb-8 text-base" style={{ color: 'rgba(255,255,255,0.5)' }}>
            $795 AUD/year. 7-day free trial. Cancel anytime.
          </p>
          <Link
            href="/subscribe"
            className="inline-flex items-center gap-2 rounded-md px-8 py-3 font-medium text-white transition-opacity duration-150 hover:opacity-90"
            style={{ background: '#ed9d24' }}
          >
            Start Free Trial <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* ── Footer (simplified) ────────────────────────────────────────────── */}
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
                Australia&apos;s restoration training platform.
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
