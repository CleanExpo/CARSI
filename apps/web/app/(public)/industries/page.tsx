import type { Metadata } from 'next';
import Link from 'next/link';
import { OrganizationSchema } from '@/components/seo/JsonLd';
import {
  ArrowRight,
  Baby,
  Building,
  Building2,
  FileCheck,
  GraduationCap,
  HardHat,
  Hotel,
  Layers,
  Pickaxe,
  Shield,
  Sparkles,
  Stethoscope,
  Store,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export const metadata: Metadata = {
  title: 'Industry Training Solutions | CARSI',
  description:
    'IICRC-certified training for 12+ industries across Australia. Sector-specific restoration courses with verifiable credentials for healthcare, hospitality, mining, construction, and more.',
};

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const industries = [
  {
    slug: 'healthcare',
    label: 'Healthcare',
    description: 'Hospitals, clinics, medical facilities',
    Icon: Stethoscope,
    color: '#009688',
    disciplines: ['AMRT', 'WRT', 'FSRT'],
  },
  {
    slug: 'hospitality',
    label: 'Hotels & Resorts',
    description: 'Hotels, resorts, casinos, cruise ships',
    Icon: Hotel,
    color: '#8e44ad',
    disciplines: ['WRT', 'CRT', 'ASD', 'OCT'],
  },
  {
    slug: 'government-defence',
    label: 'Government & Defence',
    description: 'Councils, state agencies, defence',
    Icon: Building2,
    color: '#2196f3',
    disciplines: ['AMRT', 'WRT', 'ASD', 'FSRT'],
  },
  {
    slug: 'commercial-cleaning',
    label: 'Commercial Cleaning',
    description: 'Cleaning contractors, facility services',
    Icon: Sparkles,
    color: '#2490ed',
    disciplines: ['CCT', 'CRT', 'WRT', 'AMRT'],
  },
  {
    slug: 'aged-care',
    label: 'Aged Care',
    description: 'Residential aged care facilities',
    Icon: Shield,
    color: '#27ae60',
    disciplines: ['CRT', 'AMRT', 'WRT'],
  },
  {
    slug: 'education',
    label: 'Education',
    description: 'Schools, universities',
    Icon: GraduationCap,
    color: '#3498db',
    disciplines: ['AMRT', 'WRT', 'CRT', 'ASD'],
  },
  {
    slug: 'insurance',
    label: 'Insurance',
    description: 'Loss adjusters, claims assessors',
    Icon: FileCheck,
    color: '#16a085',
    disciplines: ['WRT', 'FSRT', 'AMRT', 'ASD'],
  },
  {
    slug: 'strata',
    label: 'Strata & Body Corporate',
    description: 'Building managers, body corporate',
    Icon: Layers,
    color: '#9b59b6',
    disciplines: ['WRT', 'CRT', 'AMRT', 'ASD'],
  },
  {
    slug: 'mining',
    label: 'Mining & Resources',
    description: 'Mine camps, remote facilities',
    Icon: Pickaxe,
    color: '#ed9d24',
    disciplines: ['WRT', 'ASD', 'AMRT'],
  },
  {
    slug: 'retail',
    label: 'Retail & Shopping Centres',
    description: 'Shopping centres, major landlords',
    Icon: Store,
    color: '#e74c3c',
    disciplines: ['WRT', 'CRT', 'OCT', 'FSRT'],
  },
  {
    slug: 'childcare',
    label: 'Childcare',
    description: 'Early childhood centres',
    Icon: Baby,
    color: '#e91e63',
    disciplines: ['CRT', 'AMRT'],
  },
  {
    slug: 'construction',
    label: 'Construction',
    description: 'Builders, construction sites',
    Icon: HardHat,
    color: '#ff9800',
    disciplines: ['WRT', 'ASD'],
  },
  {
    slug: 'property-management',
    label: 'Property Management',
    description: 'Property managers, real estate',
    Icon: Building,
    color: '#673ab7',
    disciplines: ['WRT', 'CRT', 'ASD'],
  },
];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function IndustriesPage() {
  return (
    <main className="min-h-screen" style={{ background: '#060a14' }}>
      <OrganizationSchema />

      {/* Mesh background */}
      <div className="mesh-bg" aria-hidden="true">
        <div className="mesh-blob mesh-blob-1" />
        <div className="mesh-blob mesh-blob-2" />
      </div>

      <div className="relative z-10">
        {/* Hero */}
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
            Industry Training Solutions
          </h1>
          <p
            className="max-w-2xl text-lg leading-relaxed"
            style={{ color: 'rgba(255,255,255,0.5)' }}
          >
            IICRC-certified training for 12+ industries across Australia. Each pathway includes
            sector-specific courses, verifiable credentials, and continuing education credits.
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
