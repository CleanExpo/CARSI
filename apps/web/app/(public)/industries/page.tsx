import Link from 'next/link';
import {
  ArrowRight,
  Building2,
  Baby,
  Stethoscope,
  HardHat,
  Building,
  Shield,
  Sparkles,
  Pickaxe,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const industries = [
  {
    slug: 'aged-care',
    label: 'Aged Care',
    description: 'NQF-compliant infection control training for residential aged care facilities.',
    Icon: Shield,
    color: '#27ae60',
    disciplines: ['CRT', 'AMRT'],
  },
  {
    slug: 'childcare',
    label: 'Childcare',
    description: 'ACECQA-aligned hygiene training for early childhood centres.',
    Icon: Baby,
    color: '#e91e63',
    disciplines: ['AMRT', 'CRT', 'WRT'],
  },
  {
    slug: 'healthcare',
    label: 'Healthcare',
    description: 'NSQHS Standard 3 training for hospital facility teams.',
    Icon: Stethoscope,
    color: '#009688',
    disciplines: ['AMRT', 'WRT', 'FSRT', 'ASD'],
  },
  {
    slug: 'construction',
    label: 'Construction',
    description: 'NCC-compliant moisture and mould management for site teams.',
    Icon: HardHat,
    color: '#ff9800',
    disciplines: ['WRT', 'ASD', 'AMRT'],
  },
  {
    slug: 'property-management',
    label: 'Property Management',
    description: 'Residential Tenancies Act compliance for property managers.',
    Icon: Building,
    color: '#673ab7',
    disciplines: ['AMRT', 'WRT', 'CRT', 'ASD'],
  },
  {
    slug: 'government-defence',
    label: 'Government & Defence',
    description: 'WHS-compliant training for councils and defence facilities.',
    Icon: Building2,
    color: '#2196f3',
    disciplines: ['AMRT', 'WRT', 'ASD', 'FSRT'],
  },
  {
    slug: 'commercial-cleaning',
    label: 'Commercial Cleaning',
    description: 'Professional certification for cleaning contractors.',
    Icon: Sparkles,
    color: '#2490ed',
    disciplines: ['CRT', 'CCT', 'OCT'],
  },
  {
    slug: 'mining',
    label: 'Mining',
    description: 'Site restoration training for mining and resources sector.',
    Icon: Pickaxe,
    color: '#ed9d24',
    disciplines: ['WRT', 'AMRT', 'ASD'],
  },
];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function IndustriesPage() {
  return (
    <main className="min-h-screen" style={{ background: '#0a0f1a' }}>
      {/* Subtle gradient */}
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(36,144,237,0.08) 0%, transparent 50%)',
        }}
        aria-hidden="true"
      />

      <div className="relative z-10">
        {/* Header */}
        <section className="mx-auto max-w-6xl px-6 pt-20 pb-12">
          <p
            className="mb-2 text-xs tracking-wide uppercase"
            style={{ color: 'rgba(255,255,255,0.3)' }}
          >
            Industry Solutions
          </p>
          <h1
            className="mb-4 text-4xl font-bold tracking-tight"
            style={{ color: 'rgba(255,255,255,0.95)' }}
          >
            Training for your sector
          </h1>
          <p
            className="max-w-2xl text-lg leading-relaxed"
            style={{ color: 'rgba(255,255,255,0.5)' }}
          >
            IICRC-aligned restoration training tailored to your industry&apos;s compliance
            requirements. Each pathway includes sector-specific courses and verifiable credentials.
          </p>
        </section>

        {/* Industry Grid */}
        <section className="mx-auto max-w-6xl px-6 pb-20">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {industries.map((industry) => (
              <Link
                key={industry.slug}
                href={`/industries/${industry.slug}`}
                className="group rounded-lg p-6 transition-all duration-200 hover:-translate-y-1"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                <div
                  className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg"
                  style={{
                    background: `${industry.color}15`,
                    border: `1px solid ${industry.color}30`,
                  }}
                >
                  <industry.Icon className="h-5 w-5" style={{ color: industry.color }} />
                </div>

                <h2
                  className="mb-2 text-lg font-semibold transition-colors duration-150 group-hover:text-white"
                  style={{ color: 'rgba(255,255,255,0.9)' }}
                >
                  {industry.label}
                  <ArrowRight
                    className="ml-2 inline h-4 w-4 opacity-0 transition-opacity duration-150 group-hover:opacity-100"
                    style={{ color: '#2490ed' }}
                  />
                </h2>

                <p
                  className="mb-4 text-sm leading-relaxed"
                  style={{ color: 'rgba(255,255,255,0.45)' }}
                >
                  {industry.description}
                </p>

                <div className="flex flex-wrap gap-1.5">
                  {industry.disciplines.map((code) => (
                    <span
                      key={code}
                      className="rounded px-2 py-0.5 font-mono text-[10px] font-bold"
                      style={{
                        background: 'rgba(36,144,237,0.1)',
                        color: '#2490ed',
                        border: '1px solid rgba(36,144,237,0.2)',
                      }}
                    >
                      {code}
                    </span>
                  ))}
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="px-6 py-16" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="mb-4 text-2xl font-bold" style={{ color: 'rgba(255,255,255,0.95)' }}>
              Not sure which pathway?
            </h2>
            <p className="mb-6 text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
              Browse all courses by IICRC discipline or contact us for guidance.
            </p>
            <div className="flex justify-center gap-3">
              <Link
                href="/courses"
                className="inline-flex items-center gap-2 rounded-md px-6 py-2.5 text-sm font-medium text-white transition-opacity duration-150 hover:opacity-90"
                style={{ background: '#ed9d24' }}
              >
                Browse All Courses
              </Link>
              <Link
                href="/pathways"
                className="inline-flex items-center gap-2 rounded-md px-6 py-2.5 text-sm font-medium transition-colors duration-150 hover:text-white"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: 'rgba(255,255,255,0.7)',
                }}
              >
                View Pathways
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
