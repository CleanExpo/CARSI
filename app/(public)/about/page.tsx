import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export const metadata: Metadata = {
  title: 'About CARSI | Centre for Australian Restoration and Standards Information',
  description:
    "CARSI is Australia's leading online training platform for cleaning and restoration professionals. 40+ IICRC CEC-approved courses across 7 disciplines. 50+ years of combined industry experience.",
};

const disciplines = [
  { code: 'WRT', label: 'Water Restoration Technician' },
  { code: 'CRT', label: 'Carpet Repair and Reinstallation Technician' },
  { code: 'ASD', label: 'Applied Structural Drying' },
  { code: 'AMRT', label: 'Applied Microbial Remediation Technician' },
  { code: 'FSRT', label: 'Fire and Smoke Restoration Technician' },
  { code: 'OCT', label: 'Odour Control Technician' },
  { code: 'CCT', label: 'Commercial Carpet Cleaning Technician' },
];

const credentials = [
  {
    title: "Australia's Only CFO & CBFRS",
    desc: 'Certified Flooring Organisation and Certified Building Flood Recovery Specialist — the only holder of both credentials in Australia.',
  },
  {
    title: '50+ Years Combined Experience',
    desc: 'Our founders and instructors bring decades of hands-on experience across cleaning, water damage, and building restoration.',
  },
  {
    title: 'Raise the Bar',
    desc: 'We exist to lift industry standards through education. Every course is designed by practitioners, for practitioners.',
  },
];

const stats = [
  { value: '40+', label: 'IICRC CEC-approved courses' },
  { value: '7', label: 'IICRC disciplines covered' },
  { value: '12+', label: 'Industries served' },
];

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-[#050505]">
      {/* Subtle gradient orb */}
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            'radial-gradient(ellipse 60% 40% at 50% 0%, rgba(36,144,237,0.06) 0%, transparent 60%)',
        }}
        aria-hidden="true"
      />

      <div className="relative z-10 mx-auto max-w-4xl px-6 py-20">
        {/* ── Hero ─────────────────────────────────────────────── */}
        <div className="mb-16">
          <p
            className="mb-3 text-xs tracking-wide uppercase"
            style={{ color: 'rgba(255,255,255,0.3)' }}
          >
            About Us
          </p>
          <h1
            className="mb-4 text-4xl font-bold tracking-tight"
            style={{ color: 'rgba(255,255,255,0.95)' }}
          >
            Raising the bar for restoration professionals.
          </h1>
          <p
            className="max-w-2xl text-base leading-relaxed"
            style={{ color: 'rgba(255,255,255,0.55)' }}
          >
            CARSI — the Centre for Australian Restoration and Standards Information — is
            Australia&apos;s leading online training platform for cleaning and restoration
            professionals. We deliver IICRC CEC-approved courses that allow technicians to maintain
            their certification without leaving the job site.
          </p>
        </div>

        {/* ── Mission ──────────────────────────────────────────── */}
        <section className="mb-16 space-y-5" aria-label="Our mission">
          <h2 className="text-xl font-semibold" style={{ color: 'rgba(255,255,255,0.9)' }}>
            Growth. Support. Development.
          </h2>
          <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.6)' }}>
            The cleaning and restoration industry is demanding. Technicians work long hours, often
            interstate, responding to water damage, fire, and mould events. Finding time to complete
            the continuing education required to maintain IICRC certification has historically meant
            flights, hotels, and days away from active jobs. CARSI changes that.
          </p>
          <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.6)' }}>
            We believe professional development should fit around your work — not the other way
            around. Our platform is available 24 hours a day, 7 days a week, accessible from any
            device. Whether you&apos;re between jobs in regional Queensland or studying at midnight
            in Perth, CARSI is there.
          </p>
          <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.6)' }}>
            With over 40 IICRC CEC-approved courses across seven disciplines, and a full-access
            subscription at $795 AUD per year, we provide the most cost-effective path to IICRC
            certification maintenance in Australia.
          </p>
        </section>

        {/* ── Credentials grid ─────────────────────────────────── */}
        <section className="mb-16" aria-label="Our credentials">
          <div className="grid gap-4 sm:grid-cols-3">
            {credentials.map((item) => (
              <div
                key={item.title}
                className="rounded-sm p-5"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                <h3
                  className="mb-2 text-sm font-semibold"
                  style={{ color: 'rgba(255,255,255,0.85)' }}
                >
                  {item.title}
                </h3>
                <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ── The CARSI Difference ─────────────────────────────── */}
        <section className="mb-16 space-y-6" aria-label="Why CARSI">
          <div>
            <h2 className="text-xl font-semibold" style={{ color: 'rgba(255,255,255,0.9)' }}>
              Why CARSI?
            </h2>
            <p className="mt-3 text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.6)' }}>
              Traditional restoration training in Australia requires travel. A two-day face-to-face
              course in a capital city can cost over $2,000 in flights and accommodation alone — on
              top of course fees and lost billing days. CARSI&apos;s online platform eliminates
              these costs entirely. Courses are self-paced, certificates are instant, and your CEC
              progress is tracked automatically in your student dashboard.
            </p>
            <p className="mt-3 text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.6)' }}>
              CARSI is also a core pillar of the National Restoration Professionals Group (NRPG)
              onboarding pathway, ensuring trained technicians are recognised across the NRPG
              network from day one. Our training is recognised by major Australian insurers
              including IAG, Suncorp, and QBE as evidence of professional competency.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-sm p-5 text-center"
                style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}
              >
                <p className="text-3xl font-bold" style={{ color: '#2490ed' }}>
                  {stat.value}
                </p>
                <p className="mt-1 text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ── IICRC Disciplines ─────────────────────────────────── */}
        <section className="mb-16 space-y-5" aria-label="IICRC disciplines">
          <div>
            <h2 className="text-xl font-semibold" style={{ color: 'rgba(255,255,255,0.9)' }}>
              IICRC Discipline Coverage
            </h2>
            <p className="mt-2 text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)' }}>
              CARSI holds IICRC CEC approval across all seven core disciplines. Courses in each
              discipline count toward the continuing education credits required to maintain your
              certified technician status. Technicians must earn CECs every two years — CARSI makes
              that straightforward.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {disciplines.map((d) => (
              <div
                key={d.code}
                className="flex items-center gap-3 rounded-sm px-3 py-2"
                style={{
                  background: 'rgba(36,144,237,0.06)',
                  border: '1px solid rgba(36,144,237,0.15)',
                }}
              >
                <span
                  className="font-mono text-xs font-bold"
                  style={{ color: '#2490ed', minWidth: '3rem' }}
                >
                  {d.code}
                </span>
                <span className="text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>
                  {d.label}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* ── CTA ──────────────────────────────────────────────── */}
        <section
          className="mb-16 rounded-sm p-8"
          style={{
            background:
              'linear-gradient(135deg, rgba(36,144,237,0.08) 0%, rgba(237,157,36,0.08) 100%)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <h2 className="mb-2 text-lg font-semibold" style={{ color: 'rgba(255,255,255,0.95)' }}>
            Ready to advance your career?
          </h2>
          <p className="mb-6 text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
            Browse our full course catalogue or start with a 7-day free trial of Pro access.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/courses"
              className="inline-flex items-center gap-2 rounded-sm px-5 py-2.5 text-sm font-medium text-white transition-all duration-200 hover:scale-[1.02]"
              style={{ background: '#ed9d24' }}
            >
              Browse Courses <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center rounded-sm px-5 py-2.5 text-sm font-medium transition-all duration-200 hover:text-white"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'rgba(255,255,255,0.7)',
              }}
            >
              View Pricing
            </Link>
          </div>
        </section>

        {/* ── IICRC Disclaimer ─────────────────────────────────── */}
        <section
          className="rounded-sm p-5"
          style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.06)',
          }}
          aria-label="IICRC disclaimer"
        >
          <p className="text-xs leading-relaxed italic" style={{ color: 'rgba(255,255,255,0.35)' }}>
            The IICRC does not endorse any educational provider, product, offering, or service. The
            Institute expressly disclaims responsibility, endorsement or warranty for third-party
            publications, products, certifications, or instruction. The approved status does not
            award IICRC Certification, only qualified continuing education hours.
          </p>
          <p className="mt-3 text-xs font-medium" style={{ color: 'rgba(255,255,255,0.5)' }}>
            All CARSI courses carry IICRC CEC approval.
          </p>
        </section>
      </div>
    </main>
  );
}
