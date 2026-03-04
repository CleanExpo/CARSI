import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Shield, Zap, Users } from 'lucide-react';

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
  category?: string | null;
  lesson_count?: number | null;
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
// Data constants
// ---------------------------------------------------------------------------

const disciplines = [
  { code: 'WRT', label: 'Water Restoration', color: '#2490ed' },
  { code: 'CRT', label: 'Carpet Restoration', color: '#26c4a0' },
  { code: 'ASD', label: 'Applied Structural Drying', color: '#6c63ff' },
  { code: 'OCT', label: 'Odour Control', color: '#9b59b6' },
  { code: 'CCT', label: 'Commercial Carpet', color: '#17b8d4' },
  { code: 'FSRT', label: 'Fire & Smoke', color: '#f05a35' },
  { code: 'AMRT', label: 'Applied Microbial', color: '#27ae60' },
];

const whyCarsi = [
  {
    Icon: Shield,
    title: 'IICRC Aligned',
    desc: 'Every course built around IICRC technical standards. Earn CECs that count toward your annual maintenance requirements.',
    color: '#2490ed',
    glow: 'rgba(36,144,237,0.15)',
  },
  {
    Icon: Zap,
    title: 'Automatic CEC Tracking',
    desc: 'Per-discipline CEC ledger updated in real-time. Download your transcript for IICRC submission at any time.',
    color: '#ed9d24',
    glow: 'rgba(237,157,36,0.15)',
  },
  {
    Icon: Users,
    title: 'Industry Recognised',
    desc: 'Trusted by restoration contractors and insurance assessors across Australia, referencing AS/NZS standards.',
    color: '#26c4a0',
    glow: 'rgba(38,196,160,0.15)',
  },
];

const stats = [
  { value: '261+', label: 'Professionals' },
  { value: '91', label: 'Courses' },
  { value: '7', label: 'Disciplines' },
  { value: '4.9★', label: 'Avg Rating' },
];

const disciplineGrads: Record<string, string> = {
  WRT: 'from-blue-700 to-blue-900',
  CRT: 'from-teal-600 to-teal-900',
  ASD: 'from-indigo-700 to-indigo-900',
  OCT: 'from-purple-700 to-purple-900',
  CCT: 'from-cyan-600 to-cyan-900',
  FSRT: 'from-orange-700 to-red-900',
  AMRT: 'from-green-700 to-green-900',
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function GlassStatCard({ value, label }: { value: string; label: string }) {
  return (
    <div
      className="animate-float rounded-xl px-5 py-4 text-center"
      style={{
        background: 'rgba(255,255,255,0.05)',
        backdropFilter: 'blur(20px) saturate(160%)',
        WebkitBackdropFilter: 'blur(20px) saturate(160%)',
        border: '1px solid rgba(255,255,255,0.1)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)',
      }}
    >
      <p className="text-gradient font-display text-2xl font-bold">{value}</p>
      <p className="mt-0.5 text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
        {label}
      </p>
    </div>
  );
}

function FeaturedCourseCard({ course }: { course: Course }) {
  const priceNum =
    typeof course.price_aud === 'string' ? parseFloat(course.price_aud) : course.price_aud;
  const isFree = course.is_free || priceNum === 0;
  const discipline = course.discipline ?? null;
  const grad = (discipline && disciplineGrads[discipline]) ?? 'from-blue-700 to-blue-900';

  return (
    <Link
      href={`/courses/${course.slug}`}
      className="glass-card card-3d group flex flex-col overflow-hidden rounded-xl"
    >
      <div className={`relative h-36 bg-gradient-to-br ${grad} flex-shrink-0 overflow-hidden`}>
        {course.thumbnail_url && (
          <Image
            src={course.thumbnail_url}
            alt={course.title}
            fill
            className="object-cover opacity-75 transition-opacity duration-300 group-hover:opacity-95"
            sizes="(max-width: 768px) 100vw, 33vw"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        {discipline && (
          <span
            className="absolute top-2 left-2 rounded-md px-2 py-0.5 font-mono text-xs font-bold"
            style={{
              color: disciplines.find((d) => d.code === discipline)?.color ?? '#2490ed',
              background: 'rgba(0,0,0,0.65)',
              border: `1px solid ${disciplines.find((d) => d.code === discipline)?.color ?? '#2490ed'}40`,
            }}
          >
            {discipline}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h3
          className="mb-2 line-clamp-2 text-sm font-semibold"
          style={{ color: 'rgba(255,255,255,0.9)' }}
        >
          {course.title}
        </h3>
        {course.short_description && (
          <p className="mb-3 line-clamp-2 text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>
            {course.short_description}
          </p>
        )}
        <div className="mt-auto flex items-center justify-between">
          <span
            className="rounded-md px-2 py-0.5 text-xs font-semibold"
            style={
              isFree
                ? {
                    color: '#27ae60',
                    background: 'rgba(39,174,96,0.15)',
                    border: '1px solid rgba(39,174,96,0.3)',
                  }
                : {
                    color: '#ed9d24',
                    background: 'rgba(237,157,36,0.15)',
                    border: '1px solid rgba(237,157,36,0.3)',
                  }
            }
          >
            {isFree ? 'Free' : `$${priceNum.toFixed(0)} AUD`}
          </span>
          <span className="text-xs" style={{ color: '#2490ed' }}>
            View →
          </span>
        </div>
      </div>
    </Link>
  );
}

// Skeleton card for when backend unavailable
function SkeletonCard() {
  return (
    <div
      className="overflow-hidden rounded-xl"
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
    >
      <div className="shimmer h-36" />
      <div className="space-y-2 p-4">
        <div className="shimmer h-3.5 w-3/4 rounded" />
        <div className="shimmer h-3 w-1/2 rounded" />
        <div className="shimmer h-3 w-2/3 rounded" />
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
    <div className="relative min-h-screen" style={{ background: '#060a14' }}>
      {/* ── Animated mesh background ───────────────────────────────────────── */}
      <div className="mesh-bg" aria-hidden="true">
        <div className="mesh-blob mesh-blob-1" />
        <div className="mesh-blob mesh-blob-2" />
        <div className="mesh-blob mesh-blob-3" />
      </div>

      {/* ── Sticky glass nav ───────────────────────────────────────────────── */}
      <nav
        className="sticky top-0 z-50"
        style={{
          background: 'rgba(6,10,20,0.8)',
          backdropFilter: 'blur(20px) saturate(160%)',
          WebkitBackdropFilter: 'blur(20px) saturate(160%)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-14 items-center justify-between">
            {/* Logo */}
            <Link href="/" className="group flex items-center gap-2.5">
              <div
                className="flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-200 group-hover:scale-105"
                style={{
                  background: 'linear-gradient(135deg, #2490ed 0%, #38a8ff 100%)',
                  boxShadow: '0 0 16px rgba(36,144,237,0.4)',
                }}
              >
                <span className="text-sm leading-none font-bold text-white">C</span>
              </div>
              <span
                className="font-display text-sm font-bold"
                style={{ color: 'rgba(255,255,255,0.9)' }}
              >
                CARSI
              </span>
            </Link>

            {/* Links */}
            <div
              className="hidden items-center gap-6 text-sm md:flex"
              style={{ color: 'rgba(255,255,255,0.5)' }}
            >
              {['Courses|/courses', 'Pathways|/pathways', 'Pricing|/subscribe', 'About|/about'].map(
                (item) => {
                  const [label, href] = item.split('|');
                  return (
                    <Link
                      key={href}
                      href={href}
                      className="transition-colors duration-150 hover:text-white"
                    >
                      {label}
                    </Link>
                  );
                }
              )}
            </div>

            {/* CTA */}
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="hidden px-3 py-1.5 text-sm transition-colors duration-150 sm:inline"
                style={{ color: 'rgba(255,255,255,0.5)' }}
              >
                Sign In
              </Link>
              <Link
                href="/subscribe"
                className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-white transition-all duration-200 hover:scale-[1.02]"
                style={{
                  background: 'linear-gradient(135deg, #ed9d24 0%, #d4891e 100%)',
                  boxShadow: '0 0 20px rgba(237,157,36,0.3)',
                }}
              >
                Enrol Now
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* ── Hero ───────────────────────────────────────────────────────────── */}
      <section className="relative mx-auto max-w-7xl px-4 pt-20 pb-16 sm:px-6 lg:px-8">
        <div className="grid items-center gap-16 lg:grid-cols-2">
          {/* Left: text */}
          <div className="animate-slide-up">
            {/* IICRC pill */}
            <div
              className="mb-8 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
              style={{
                background: 'rgba(36,144,237,0.12)',
                border: '1px solid rgba(36,144,237,0.3)',
                color: '#2490ed',
                boxShadow: '0 0 12px rgba(36,144,237,0.1)',
              }}
            >
              <span
                className="animate-pulse-soft h-1.5 w-1.5 rounded-full"
                style={{ background: '#2490ed' }}
              />
              IICRC CEC Approved Platform
            </div>

            <h1
              className="font-display mb-6 text-5xl leading-[1.08] font-bold tracking-tight sm:text-6xl"
              style={{ color: 'rgba(255,255,255,0.95)' }}
            >
              Australia&apos;s Leading
              <br />
              Restoration Training
              <br />
              <span className="text-gradient">Platform</span>
            </h1>

            <p
              className="mb-10 max-w-md text-lg leading-relaxed"
              style={{ color: 'rgba(255,255,255,0.55)' }}
            >
              IICRC-aligned CEC training for cleaning and restoration professionals. Earn recognised
              credits and grow your career.
            </p>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/courses"
                className="inline-flex items-center gap-2 rounded-lg px-6 py-3 text-sm font-semibold text-white transition-all duration-200 hover:scale-[1.03]"
                style={{
                  background: 'linear-gradient(135deg, #ed9d24 0%, #d4891e 100%)',
                  boxShadow: '0 0 24px rgba(237,157,36,0.35)',
                }}
              >
                Browse Courses <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/pathways"
                className="inline-flex items-center gap-2 rounded-lg px-6 py-3 text-sm font-semibold transition-all duration-200 hover:scale-[1.02]"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  color: 'rgba(255,255,255,0.8)',
                  backdropFilter: 'blur(12px)',
                }}
              >
                View Pathways
              </Link>
            </div>
          </div>

          {/* Right: floating glass stats grid */}
          <div className="relative">
            {/* Large glass card — centre piece */}
            <div
              className="relative mb-4 overflow-hidden rounded-2xl"
              style={{
                background: 'rgba(255,255,255,0.05)',
                backdropFilter: 'blur(24px)',
                WebkitBackdropFilter: 'blur(24px)',
                border: '1px solid rgba(255,255,255,0.1)',
                boxShadow: '0 24px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)',
                height: '200px',
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-blue-900/30 to-indigo-900/20" />
              <Image
                src="https://carsi.com.au/wp-content/uploads/2024/01/water-damage-restoration-course.jpg"
                alt="CARSI restoration training"
                fill
                className="object-cover opacity-40"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
              <div className="absolute right-5 bottom-4 left-5">
                <p
                  className="mb-1 text-xs font-semibold tracking-widest uppercase"
                  style={{ color: 'rgba(255,255,255,0.4)' }}
                >
                  IICRC-Aligned Training
                </p>
                <p
                  className="font-display text-lg font-bold"
                  style={{ color: 'rgba(255,255,255,0.95)' }}
                >
                  Restoration Professionals
                </p>
              </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-4 gap-3">
              {stats.map((s) => (
                <GlassStatCard key={s.label} value={s.value} label={s.label} />
              ))}
            </div>

            {/* Floating IICRC badge */}
            <div
              className="mt-4 flex items-center gap-3 rounded-xl px-4 py-3"
              style={{
                background: 'rgba(36,144,237,0.08)',
                border: '1px solid rgba(36,144,237,0.2)',
                boxShadow: '0 0 20px rgba(36,144,237,0.08)',
              }}
            >
              <span className="text-2xl">🏷</span>
              <div>
                <p className="text-sm font-semibold" style={{ color: '#2490ed' }}>
                  IICRC CEC Approved
                </p>
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>
                  Earn Continuing Education Credits as you progress
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Discipline pills strip ─────────────────────────────────────────── */}
      <section
        className="relative py-6"
        style={{
          borderTop: '1px solid rgba(255,255,255,0.04)',
          borderBottom: '1px solid rgba(255,255,255,0.04)',
        }}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap justify-center gap-2">
            {disciplines.map((d) => (
              <Link
                key={d.code}
                href={`/courses?discipline=${d.code}`}
                className="inline-flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-medium transition-all duration-200 hover:scale-[1.03]"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: `1px solid ${d.color}30`,
                  color: 'rgba(255,255,255,0.65)',
                }}
              >
                <span
                  className="h-1.5 w-1.5 flex-shrink-0 rounded-full"
                  style={{ backgroundColor: d.color, boxShadow: `0 0 5px ${d.color}` }}
                />
                <span className="font-mono text-[10px] font-bold" style={{ color: d.color }}>
                  {d.code}
                </span>
                <span className="hidden sm:inline">{d.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Why CARSI ──────────────────────────────────────────────────────── */}
      <section className="relative py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12">
            <p
              className="mb-3 text-xs font-semibold tracking-widest uppercase"
              style={{ color: 'rgba(255,255,255,0.3)' }}
            >
              Why Choose CARSI
            </p>
            <h2
              className="font-display text-3xl font-bold"
              style={{ color: 'rgba(255,255,255,0.92)' }}
            >
              Built for the <span className="text-gradient">restoration industry</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            {whyCarsi.map((item) => (
              <div key={item.title} className="glass-card card-3d rounded-xl p-6">
                <div
                  className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg"
                  style={{ background: item.glow, border: `1px solid ${item.color}30` }}
                >
                  <item.Icon className="h-5 w-5" style={{ color: item.color }} />
                </div>
                <h3
                  className="font-display mb-2 text-sm font-bold"
                  style={{ color: 'rgba(255,255,255,0.9)' }}
                >
                  {item.title}
                </h3>
                <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.45)' }}>
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Featured Courses ───────────────────────────────────────────────── */}
      <section className="relative py-20" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-10 flex items-end justify-between">
            <div>
              <p
                className="mb-2 text-xs font-semibold tracking-widest uppercase"
                style={{ color: 'rgba(255,255,255,0.3)' }}
              >
                Featured Courses
              </p>
              <h2
                className="font-display text-3xl font-bold"
                style={{ color: 'rgba(255,255,255,0.92)' }}
              >
                Start your journey
              </h2>
            </div>
            <Link
              href="/courses"
              className="flex items-center gap-1.5 text-sm font-medium transition-colors duration-150"
              style={{ color: '#2490ed' }}
            >
              All courses <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {featuredCourses.length > 0
              ? featuredCourses.map((course) => (
                  <FeaturedCourseCard key={course.id} course={course} />
                ))
              : [1, 2, 3].map((i) => <SkeletonCard key={i} />)}
          </div>
        </div>
      </section>

      {/* ── CTA Banner ─────────────────────────────────────────────────────── */}
      <section className="relative py-20">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <div
            className="relative overflow-hidden rounded-2xl px-8 py-14"
            style={{
              background: 'rgba(255,255,255,0.04)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              border: '1px solid rgba(36,144,237,0.2)',
              boxShadow: '0 0 60px rgba(36,144,237,0.08), inset 0 1px 0 rgba(255,255,255,0.08)',
            }}
          >
            {/* Glow orb */}
            <div
              className="pointer-events-none absolute top-1/2 left-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={{
                background: 'radial-gradient(circle, rgba(36,144,237,0.12) 0%, transparent 70%)',
                filter: 'blur(40px)',
              }}
            />
            <p
              className="relative z-10 mb-4 text-xs font-semibold tracking-widest uppercase"
              style={{ color: 'rgba(255,255,255,0.3)' }}
            >
              Get Started Today
            </p>
            <h2
              className="font-display relative z-10 mb-4 text-4xl font-bold"
              style={{ color: 'rgba(255,255,255,0.95)' }}
            >
              Ready to earn your <span className="text-gradient">IICRC CECs?</span>
            </h2>
            <p
              className="relative z-10 mx-auto mb-8 max-w-lg text-base"
              style={{ color: 'rgba(255,255,255,0.5)' }}
            >
              Join 261+ restoration professionals. $795 AUD/year — 7-day free trial.
            </p>
            <div className="relative z-10 flex justify-center gap-3">
              <Link
                href="/subscribe"
                className="inline-flex items-center gap-2 rounded-lg px-8 py-3 font-semibold text-white transition-all duration-200 hover:scale-[1.03]"
                style={{
                  background: 'linear-gradient(135deg, #ed9d24 0%, #d4891e 100%)',
                  boxShadow: '0 0 30px rgba(237,157,36,0.4)',
                }}
              >
                Start Free Trial <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/courses"
                className="inline-flex items-center gap-2 rounded-lg px-8 py-3 font-semibold transition-all duration-200"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  color: 'rgba(255,255,255,0.8)',
                }}
              >
                Browse First
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <footer className="relative py-12" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-10 grid grid-cols-2 gap-8 sm:grid-cols-4">
            <div className="col-span-2 sm:col-span-1">
              <div className="mb-4 flex items-center gap-2">
                <div
                  className="flex h-7 w-7 items-center justify-center rounded-lg"
                  style={{
                    background: 'linear-gradient(135deg, #2490ed 0%, #38a8ff 100%)',
                    boxShadow: '0 0 12px rgba(36,144,237,0.35)',
                  }}
                >
                  <span className="text-xs font-bold text-white">C</span>
                </div>
                <span
                  className="font-display text-sm font-bold"
                  style={{ color: 'rgba(255,255,255,0.8)' }}
                >
                  CARSI
                </span>
              </div>
              <p
                className="max-w-[160px] text-xs leading-relaxed"
                style={{ color: 'rgba(255,255,255,0.35)' }}
              >
                Australia&apos;s dedicated restoration training platform.
              </p>
            </div>

            {[
              {
                heading: 'Disciplines',
                links: disciplines.slice(0, 4).map((d) => ({
                  label: `${d.code} — ${d.label}`,
                  href: `/courses?discipline=${d.code}`,
                })),
              },
              {
                heading: 'Platform',
                links: [
                  { label: 'Pathways', href: '/pathways' },
                  { label: 'Subscription', href: '/subscribe' },
                  { label: 'Sign In', href: '/login' },
                  { label: 'Credentials', href: '/student/credentials' },
                ],
              },
              {
                heading: 'Contact',
                links: [{ label: 'info@carsi.com.au', href: 'mailto:info@carsi.com.au' }],
              },
            ].map((col) => (
              <div key={col.heading}>
                <p
                  className="mb-3 text-[10px] font-semibold tracking-widest uppercase"
                  style={{ color: 'rgba(255,255,255,0.3)' }}
                >
                  {col.heading}
                </p>
                <ul className="space-y-2">
                  {col.links.map((l) => (
                    <li key={l.label}>
                      <Link
                        href={l.href}
                        className="text-xs transition-colors duration-150 hover:text-white"
                        style={{ color: 'rgba(255,255,255,0.4)' }}
                      >
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div
            className="flex flex-col items-center justify-between gap-2 pt-6 sm:flex-row"
            style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
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
