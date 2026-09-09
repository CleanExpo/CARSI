import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

import { industryHubCards } from '@/lib/marketing/industry-hub';

export const metadata: Metadata = {
  title: 'Industry Training Solutions',
  description: `IICRC CEC Accredited training for ${industryHubCards.length} industries across Australia. Sector-specific restoration courses with verifiable credentials for healthcare, hospitality, mining, plumbing, NDIS, real estate, and more.`,
  alternates: { canonical: '/industries' },
};

export default function IndustriesPage() {
  return (
    <main className="min-h-screen" style={{ background: '#060a14' }}>
      <div className="mesh-bg" aria-hidden="true">
        <div className="mesh-blob mesh-blob-1" />
        <div className="mesh-blob mesh-blob-2" />
      </div>

      <div className="relative z-10">
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
            IICRC CEC Accredited training for {industryHubCards.length} industries across Australia.
            Each pathway uses CARSI course areas, verifiable credentials, and CEC hours only where
            the IICRC has approved the course.
          </p>
        </section>

        <section className="mx-auto max-w-6xl px-6 pb-20">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {industryHubCards.map((industry) => (
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
                  {industry.areas.map((area) => (
                    <span
                      key={area}
                      className="rounded px-2 py-0.5 text-[10px] font-semibold"
                      style={{
                        background: 'rgba(36,144,237,0.1)',
                        color: '#2490ed',
                        border: '1px solid rgba(36,144,237,0.2)',
                      }}
                    >
                      {area}
                    </span>
                  ))}
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="px-6 py-16" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="mb-4 text-2xl font-bold" style={{ color: 'rgba(255,255,255,0.95)' }}>
              Not sure which pathway?
            </h2>
            <p className="mb-6 text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
              Browse all courses by CARSI course area or contact us for guidance.
            </p>
            <div className="flex justify-center gap-3">
              <Link
                href="/courses"
                className="inline-flex items-center gap-2 rounded-md px-6 py-2.5 text-sm font-medium text-white transition-opacity duration-150 hover:opacity-90"
                style={{ background: '#a85500' }}
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
