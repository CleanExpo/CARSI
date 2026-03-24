import Link from 'next/link';
import type { Metadata } from 'next';

import { LearningPathwayCard } from '@/components/lms/LearningPathwayCard';
import { StudentJourneyMap } from '@/components/lms/diagrams/StudentJourneyMap';
import { AcronymTooltip } from '@/components/ui/AcronymTooltip';
import { getBackendOrigin } from '@/lib/env/public-url';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'IICRC Learning Pathways — Which Restoration Certification Path Is Right for You? | CARSI',
  description:
    'Explore structured IICRC certification pathways for water restoration, mould remediation, carpet cleaning and more. Find the right learning path for your career stage and earn CECs in the correct order.',
};

interface Pathway {
  id: string;
  slug: string;
  title: string;
  description?: string | null;
  iicrc_discipline?: string | null;
  target_certification?: string | null;
  estimated_hours?: string | null;
}

async function getPathways(): Promise<{ items: Pathway[]; total: number }> {
  const backendUrl = getBackendOrigin();
  try {
    const res = await fetch(`${backendUrl}/api/lms/pathways`, {
      next: { revalidate: 120 },
    });
    if (!res.ok) return { items: [], total: 0 };
    return res.json();
  } catch {
    return { items: [], total: 0 };
  }
}

export default async function PathwaysPage() {
  const { items: pathways, total } = await getPathways();

  return (
    <main id="main-content" className="relative min-h-screen" style={{ background: '#060a14' }}>
      {/* Mesh background */}
      <div className="mesh-bg" aria-hidden="true">
        <div className="mesh-blob mesh-blob-1" />
        <div className="mesh-blob mesh-blob-2" />
      </div>

      <div className="relative z-10 mx-auto max-w-[1600px] px-4 py-8 sm:px-6 lg:px-8">
        {/* ── Hero header ── */}
        <header className="mb-6">
          <h1
            className="font-display text-3xl font-bold tracking-tight sm:text-4xl"
            style={{ color: 'rgba(255,255,255,0.92)' }}
          >
            Certification Pathways
          </h1>
          <p className="mt-2 text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
            Structured learning journeys towards <AcronymTooltip term="IICRC" /> certification.{' '}
            {total > 0 && `${total} pathway${total !== 1 ? 's' : ''} available.`}
          </p>
        </header>

        {/* ── Pathway content or empty state ── */}
        {pathways.length > 0 ? (
          <section className="mb-10">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {pathways.map((p) => (
                <LearningPathwayCard key={p.id} pathway={p} />
              ))}
            </div>
          </section>
        ) : (
          <section className="mb-10">
            <div
              className="mx-auto max-w-xl rounded-sm px-6 py-16 text-center"
              style={{
                background: 'rgba(255,255,255,0.04)',
                backdropFilter: 'blur(24px) saturate(160%)',
                WebkitBackdropFilter: 'blur(24px) saturate(160%)',
                border: '1px solid rgba(255,255,255,0.07)',
              }}
            >
              {/* Graduation cap icon */}
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center">
                <svg
                  width="56"
                  height="56"
                  viewBox="0 0 56 56"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <path
                    d="M28 8L4 20L28 32L52 20L28 8Z"
                    stroke="#ed9d24"
                    strokeWidth="2"
                    strokeLinejoin="round"
                    fill="rgba(237,157,36,0.1)"
                  />
                  <path
                    d="M14 26V38C14 38 20 44 28 44C36 44 42 38 42 38V26"
                    stroke="#ed9d24"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />
                  <path d="M48 20V36" stroke="#ed9d24" strokeWidth="2" strokeLinecap="round" />
                  <circle cx="48" cy="38" r="2" fill="#ed9d24" />
                </svg>
              </div>

              <h2
                className="font-display mb-3 text-xl font-semibold"
                style={{ color: 'rgba(255,255,255,0.92)' }}
              >
                Pathways Coming Soon
              </h2>

              <p
                className="mx-auto mb-8 max-w-md text-sm leading-relaxed"
                style={{ color: 'rgba(255,255,255,0.55)' }}
              >
                We&apos;re building structured learning pathways for each{' '}
                <AcronymTooltip term="IICRC" /> discipline. In the meantime, browse our course
                catalogue to start earning <AcronymTooltip term="CEC">CECs</AcronymTooltip>.
              </p>

              <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link
                  href="/courses"
                  className="inline-flex items-center justify-center rounded-sm px-6 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                  style={{ background: '#ed9d24' }}
                >
                  Browse Courses
                </Link>
                <Link
                  href="/pricing"
                  className="inline-flex items-center justify-center rounded-sm px-6 py-2.5 text-sm font-semibold transition-opacity hover:opacity-80"
                  style={{
                    color: 'rgba(255,255,255,0.8)',
                    border: '1px solid rgba(255,255,255,0.15)',
                  }}
                >
                  View Pricing
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* ── Student Journey Map ── */}
        <section className="mb-10">
          <div
            className="rounded-sm p-5"
            style={{
              background: 'rgba(255,255,255,0.04)',
              backdropFilter: 'blur(24px) saturate(160%)',
              WebkitBackdropFilter: 'blur(24px) saturate(160%)',
              border: '1px solid rgba(255,255,255,0.07)',
            }}
          >
            <h2
              className="font-display mb-3 text-center text-lg font-semibold"
              style={{ color: 'rgba(255,255,255,0.88)' }}
            >
              Your Learning Journey
            </h2>
            <p
              className="mx-auto mb-4 max-w-xl text-center text-xs"
              style={{ color: 'rgba(255,255,255,0.4)' }}
            >
              From enrolment to credential — follow the structured path from first lesson to
              shareable digital certificate.
            </p>
            <StudentJourneyMap />
          </div>
        </section>

        {/* ── GEO Q&A Sections (collapsed accordions — below primary content) ── */}
        <section className="mb-8">
          <h2
            className="font-display mb-4 text-lg font-semibold"
            style={{ color: 'rgba(255,255,255,0.88)' }}
          >
            Frequently Asked Questions
          </h2>
          <div className="space-y-3">
            {/* Q1 — What is a learning pathway? */}
            <details
              className="group rounded-sm"
              style={{
                background: 'rgba(255,255,255,0.04)',
                backdropFilter: 'blur(24px) saturate(160%)',
                WebkitBackdropFilter: 'blur(24px) saturate(160%)',
                border: '1px solid rgba(255,255,255,0.07)',
              }}
            >
              <summary
                className="flex cursor-pointer items-center justify-between px-5 py-4 text-sm font-semibold select-none"
                style={{ color: 'rgba(255,255,255,0.88)' }}
              >
                <span>What is a learning pathway?</span>
                <svg
                  className="h-4 w-4 shrink-0 transition-transform duration-200 group-open:rotate-180"
                  style={{ color: 'rgba(255,255,255,0.4)' }}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <div className="px-5 pb-5">
                <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)' }}>
                  A learning pathway is a structured sequence of courses designed to build expertise
                  in a specific area of restoration or cleaning. Unlike individual courses, pathways
                  guide you through prerequisite knowledge, core competencies, and advanced
                  techniques in a logical progression. CARSI&apos;s pathways align with{' '}
                  <AcronymTooltip term="IICRC" /> certification requirements, ensuring you earn the
                  right Continuing Education Credits (
                  <AcronymTooltip term="CEC">CECs</AcronymTooltip>) in the right order to achieve
                  your professional goals. Each pathway maps directly to an{' '}
                  <AcronymTooltip term="IICRC" /> discipline such as Water Restoration (
                  <AcronymTooltip term="WRT" />
                  ), Applied Microbial Remediation (<AcronymTooltip term="AMRT" />
                  ), or Carpet Cleaning (<AcronymTooltip term="CCT" />
                  ), so every course you complete contributes meaningfully towards certification or
                  recertification. Pathways also eliminate guesswork — instead of choosing from
                  dozens of individual courses, you follow a curated sequence that builds knowledge
                  progressively, from foundational science through to advanced field techniques and
                  industry best practice.
                </p>
              </div>
            </details>

            {/* Q2 — Which CARSI pathway is right for me? */}
            <details
              className="group rounded-sm"
              style={{
                background: 'rgba(255,255,255,0.04)',
                backdropFilter: 'blur(24px) saturate(160%)',
                WebkitBackdropFilter: 'blur(24px) saturate(160%)',
                border: '1px solid rgba(255,255,255,0.07)',
              }}
            >
              <summary
                className="flex cursor-pointer items-center justify-between px-5 py-4 text-sm font-semibold select-none"
                style={{ color: 'rgba(255,255,255,0.88)' }}
              >
                <span>Which CARSI pathway is right for me?</span>
                <svg
                  className="h-4 w-4 shrink-0 transition-transform duration-200 group-open:rotate-180"
                  style={{ color: 'rgba(255,255,255,0.4)' }}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <div className="px-5 pb-5">
                <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)' }}>
                  Your ideal pathway depends on your current experience level and career objectives.
                  New technicians should start with the Water Restoration Fundamentals pathway,
                  which covers <AcronymTooltip term="IICRC" /> <AcronymTooltip term="WRT" />{' '}
                  certification preparation and provides the foundation for all other disciplines.
                  Experienced professionals looking to expand their service offering should consider
                  a multi-discipline pathway that combines <AcronymTooltip term="WRT" />,{' '}
                  <AcronymTooltip term="AMRT" />, and <AcronymTooltip term="ASD" /> for
                  comprehensive restoration capability. If you already hold{' '}
                  <AcronymTooltip term="IICRC" /> certifications and need to maintain them,
                  CARSI&apos;s <AcronymTooltip term="CEC" />
                  -approved courses let you accumulate credits within a structured pathway rather
                  than through ad-hoc training. Specialist contractors in carpet care, commercial
                  cleaning, or aged-care facility maintenance will find dedicated pathways tailored
                  to those sectors. Browse the pathways below, check the estimated hours and target
                  certification for each, and choose the one that matches where you are now and
                  where you want your career to go.
                </p>
              </div>
            </details>

            {/* Q3 — How do pathways help with career progression? */}
            <details
              className="group rounded-sm"
              style={{
                background: 'rgba(255,255,255,0.04)',
                backdropFilter: 'blur(24px) saturate(160%)',
                WebkitBackdropFilter: 'blur(24px) saturate(160%)',
                border: '1px solid rgba(255,255,255,0.07)',
              }}
            >
              <summary
                className="flex cursor-pointer items-center justify-between px-5 py-4 text-sm font-semibold select-none"
                style={{ color: 'rgba(255,255,255,0.88)' }}
              >
                <span>How do pathways help with career progression?</span>
                <svg
                  className="h-4 w-4 shrink-0 transition-transform duration-200 group-open:rotate-180"
                  style={{ color: 'rgba(255,255,255,0.4)' }}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <div className="px-5 pb-5">
                <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)' }}>
                  Structured pathways demonstrate systematic professional development to employers,
                  clients, and industry bodies. Completing a CARSI pathway shows you have mastered
                  not just isolated topics, but an integrated body of knowledge validated against{' '}
                  <AcronymTooltip term="IICRC" /> standards. Many insurance panels and government
                  tenders in Australia now require evidence of ongoing professional development, and
                  a completed pathway provides exactly that documentation. Pathways also make it
                  straightforward to track your <AcronymTooltip term="CEC" /> accumulation towards
                  certification renewal — you can see at a glance how many credits you have earned
                  and how many remain. For business owners, enrolling your team in pathways ensures
                  consistent training standards across all technicians, reducing callbacks and
                  improving customer satisfaction. Whether you are an independent operator building
                  credibility or a company training a workforce, pathways turn professional
                  development from a compliance burden into a competitive advantage.
                </p>
              </div>
            </details>
          </div>
        </section>
      </div>
    </main>
  );
}
