import Link from 'next/link';
import { ArrowRight, Stethoscope, Shield, Flame, Droplets } from 'lucide-react';
import { CourseGrid } from '@/components/lms/CourseGrid';

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

async function getIndustryCourses() {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:8000';
  try {
    const [amrtRes, wrtRes, fsrtRes, asdRes] = await Promise.all([
      fetch(`${backendUrl}/api/lms/courses?discipline=AMRT&limit=8`, { next: { revalidate: 60 } }),
      fetch(`${backendUrl}/api/lms/courses?discipline=WRT&limit=8`, { next: { revalidate: 60 } }),
      fetch(`${backendUrl}/api/lms/courses?discipline=FSRT&limit=8`, { next: { revalidate: 60 } }),
      fetch(`${backendUrl}/api/lms/courses?discipline=ASD&limit=8`, { next: { revalidate: 60 } }),
    ]);

    const amrtData = amrtRes.ok ? await amrtRes.json() : { items: [] };
    const wrtData = wrtRes.ok ? await wrtRes.json() : { items: [] };
    const fsrtData = fsrtRes.ok ? await fsrtRes.json() : { items: [] };
    const asdData = asdRes.ok ? await asdRes.json() : { items: [] };

    const amrtCourses = amrtData.items ?? amrtData ?? [];
    const wrtCourses = wrtData.items ?? wrtData ?? [];
    const fsrtCourses = fsrtData.items ?? fsrtData ?? [];
    const asdCourses = asdData.items ?? asdData ?? [];

    const seen = new Set<string>();
    const combined = [];
    for (const c of [...amrtCourses, ...wrtCourses, ...fsrtCourses, ...asdCourses]) {
      if (!seen.has(c.id)) {
        seen.add(c.id);
        combined.push(c);
      }
    }
    return combined;
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function GlassStatCard({ value, label }: { value: string; label: string }) {
  return (
    <div
      className="rounded-xl px-5 py-4 text-center"
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

function DisciplinePill({ code, label, color }: { code: string; label: string; color: string }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded px-2.5 py-1 font-mono text-xs font-bold"
      style={{
        color,
        background: `${color}15`,
        border: `1px solid ${color}40`,
      }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: color, boxShadow: `0 0 6px ${color}` }}
      />
      {code} — {label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function HealthcareIndustryPage() {
  const courses = await getIndustryCourses();

  return (
    <main className="relative min-h-screen" style={{ background: '#060a14' }}>
      {/* Mesh background */}
      <div className="mesh-bg" aria-hidden="true">
        <div className="mesh-blob mesh-blob-1" />
        <div className="mesh-blob mesh-blob-2" />
      </div>

      <div className="relative z-10">
        {/* Hero */}
        <section className="mx-auto max-w-7xl px-4 pt-20 pb-16 sm:px-6 lg:px-8">
          <div className="animate-slide-up">
            {/* Industry pill */}
            <div
              className="mb-6 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
              style={{
                background: 'rgba(0,150,136,0.12)',
                border: '1px solid rgba(0,150,136,0.3)',
                color: '#009688',
                boxShadow: '0 0 12px rgba(0,150,136,0.1)',
              }}
            >
              <Stethoscope className="h-3.5 w-3.5" />
              Healthcare Industry
            </div>

            <h1
              className="font-display mb-6 text-4xl leading-[1.1] font-bold tracking-tight sm:text-5xl"
              style={{ color: 'rgba(255,255,255,0.95)' }}
            >
              Healthcare Facility
              <br />
              <span className="text-gradient">Restoration Training</span>
            </h1>

            <p
              className="mb-8 max-w-xl text-lg leading-relaxed"
              style={{ color: 'rgba(255,255,255,0.55)' }}
            >
              NSQHS-aligned training for Australia&apos;s 2,050+ public and private hospitals. IICRC
              credentials support Standard 3 (Preventing and Controlling Infections) compliance and
              JCI accreditation audits.
            </p>

            {/* Discipline pills */}
            <div className="mb-10 flex flex-wrap gap-2">
              <DisciplinePill code="AMRT" label="Applied Microbial Remediation" color="#009688" />
              <DisciplinePill code="WRT" label="Water Damage Restoration" color="#00796b" />
              <DisciplinePill code="FSRT" label="Fire & Smoke Restoration" color="#00695c" />
              <DisciplinePill code="ASD" label="Applied Structural Drying" color="#004d40" />
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <GlassStatCard value="2,050+" label="Hospitals" />
            <GlassStatCard value="NSQHS" label="Standard 3" />
            <GlassStatCard value="IICRC" label="CEC Approved" />
          </div>
        </section>

        {/* Why this matters */}
        <section className="py-16" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-10">
              <p
                className="mb-3 text-xs font-semibold tracking-widest uppercase"
                style={{ color: 'rgba(255,255,255,0.3)' }}
              >
                Why Healthcare Facilities Choose CARSI
              </p>
              <h2
                className="font-display text-3xl font-bold"
                style={{ color: 'rgba(255,255,255,0.92)' }}
              >
                Built for <span className="text-gradient">patient safety</span>
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
              {[
                {
                  Icon: Shield,
                  title: 'NSQHS Alignment',
                  desc: 'Training supports National Safety & Quality Health Service Standards compliance, particularly Standard 3 (Preventing and Controlling Infections).',
                  color: '#009688',
                  glow: 'rgba(0,150,136,0.15)',
                },
                {
                  Icon: Droplets,
                  title: 'Water Damage Response',
                  desc: 'Water damage in clinical areas, plant rooms, and basement services requires immediate, standards-based response. Train your environmental services team.',
                  color: '#00796b',
                  glow: 'rgba(0,121,107,0.15)',
                },
                {
                  Icon: Flame,
                  title: 'Fire & Smoke',
                  desc: 'Fire & smoke response in clinical environments and equipment rooms. IICRC credentials provide verifiable evidence for JCI accreditation audits.',
                  color: '#ed9d24',
                  glow: 'rgba(237,157,36,0.15)',
                },
              ].map((item) => (
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
                  <p
                    className="text-xs leading-relaxed"
                    style={{ color: 'rgba(255,255,255,0.45)' }}
                  >
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Course grid */}
        <section className="py-16" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
          <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8">
            <div className="mb-8">
              <p
                className="mb-2 text-xs font-semibold tracking-widest uppercase"
                style={{ color: 'rgba(255,255,255,0.3)' }}
              >
                Healthcare-Relevant Courses
              </p>
              <h2
                className="font-display text-3xl font-bold"
                style={{ color: 'rgba(255,255,255,0.92)' }}
              >
                AMRT, WRT, FSRT &amp; ASD Training
              </h2>
            </div>

            <div
              className="rounded-xl p-5"
              style={{
                background: 'rgba(255,255,255,0.04)',
                backdropFilter: 'blur(24px) saturate(160%)',
                WebkitBackdropFilter: 'blur(24px) saturate(160%)',
                border: '1px solid rgba(255,255,255,0.07)',
              }}
            >
              <CourseGrid courses={courses} initialTab="All" />
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20">
          <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
            <div
              className="relative overflow-hidden rounded-2xl px-8 py-14"
              style={{
                background: 'rgba(255,255,255,0.04)',
                backdropFilter: 'blur(24px)',
                WebkitBackdropFilter: 'blur(24px)',
                border: '1px solid rgba(0,150,136,0.2)',
                boxShadow: '0 0 60px rgba(0,150,136,0.08), inset 0 1px 0 rgba(255,255,255,0.08)',
              }}
            >
              <div
                className="pointer-events-none absolute top-1/2 left-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full"
                style={{
                  background: 'radial-gradient(circle, rgba(0,150,136,0.12) 0%, transparent 70%)',
                  filter: 'blur(40px)',
                }}
              />
              <p
                className="relative z-10 mb-4 text-xs font-semibold tracking-widest uppercase"
                style={{ color: 'rgba(255,255,255,0.3)' }}
              >
                Healthcare Facility Training
              </p>
              <h2
                className="font-display relative z-10 mb-4 text-4xl font-bold"
                style={{ color: 'rgba(255,255,255,0.95)' }}
              >
                Healthcare Bundle <span className="text-gradient">$295</span>
              </h2>
              <p
                className="relative z-10 mx-auto mb-8 max-w-lg text-base"
                style={{ color: 'rgba(255,255,255,0.5)' }}
              >
                WRT + AMRT + FSRT training + Healthcare-Specific Mould Risk Assessment bonus module.
                Online, self-paced — fits around 24/7 hospital shift patterns.
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
                  Train Your Team <ArrowRight className="h-4 w-4" />
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
                  Browse All Courses
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
