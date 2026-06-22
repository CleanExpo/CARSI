import Link from 'next/link';
import type { Metadata } from 'next';
import { ChevronDown, GraduationCap } from 'lucide-react';

import { PathwayAdvisor } from '@/components/lms/PathwayAdvisor';
import { LearningPathwayCard } from '@/components/lms/LearningPathwayCard';
import { StudentJourneyMap } from '@/components/lms/diagrams/StudentJourneyMap';
import { MarketingPageShell } from '@/components/marketing/MarketingPageShell';
import { AcronymTooltip } from '@/components/ui/AcronymTooltip';
import { getBackendOrigin } from '@/lib/env/public-url';
import {
  marketingBodySm,
  marketingBtnPrimary,
  marketingBtnSecondary,
  marketingHeading,
  marketingPanel,
  marketingTextMuted,
  marketingTextStrong,
  marketingTextSubtle,
} from '@/lib/marketing/marketing-ui';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'IICRC CEC Learning Pathways — Which Restoration Course Path Is Right for You? | CARSI',
  description:
    'Explore structured IICRC CEC pathways for water restoration, mould remediation, carpet cleaning and more. Find the right learning path for your career stage and earn CECs in the correct order.',
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

const faqItems = [
  {
    question: 'What is a learning pathway?',
    answer: (
      <>
        A learning pathway is a structured sequence of courses designed to build expertise in a
        specific area of restoration or cleaning. Unlike individual courses, pathways guide you
        through prerequisite knowledge, core competencies, and advanced techniques in a logical
        progression. CARSI&apos;s pathways align with <AcronymTooltip term="IICRC" /> certification
        requirements, ensuring you earn the right Continuing Education Credits (
        <AcronymTooltip term="CEC">CECs</AcronymTooltip>) in the right order to achieve your
        professional goals. Each pathway maps directly to an <AcronymTooltip term="IICRC" /> discipline
        such as Water Restoration (<AcronymTooltip term="WRT" />
        ), Applied Microbial Remediation (<AcronymTooltip term="AMRT" />
        ), or Carpet Cleaning (<AcronymTooltip term="CCT" />
        ), so every course you complete contributes meaningfully towards certification or
        recertification. Pathways also eliminate guesswork — instead of choosing from dozens of
        individual courses, you follow a curated sequence that builds knowledge progressively, from
        foundational science through to advanced field techniques and industry best practice.
      </>
    ),
  },
  {
    question: 'Which CARSI pathway is right for me?',
    answer: (
      <>
        Your ideal pathway depends on your current experience level and career objectives. New
        technicians should start with the Water Restoration Fundamentals pathway, which covers{' '}
        <AcronymTooltip term="IICRC" /> <AcronymTooltip term="WRT" /> certification preparation and
        provides the foundation for all other disciplines. Experienced professionals looking to
        expand their service offering should consider a multi-discipline pathway that combines{' '}
        <AcronymTooltip term="WRT" />, <AcronymTooltip term="AMRT" />, and{' '}
        <AcronymTooltip term="ASD" /> for comprehensive restoration capability. If you already hold{' '}
        <AcronymTooltip term="IICRC" /> certifications and need to maintain them, CARSI&apos;s{' '}
        <AcronymTooltip term="CEC" />
        -approved courses let you accumulate credits within a structured pathway rather than through
        ad-hoc training. Specialist contractors in carpet care, commercial cleaning, or aged-care
        facility maintenance will find dedicated pathways tailored to those sectors. Browse the
        pathways below, check the estimated hours and target certification for each, and choose the
        one that matches where you are now and where you want your career to go.
      </>
    ),
  },
  {
    question: 'How do pathways help with career progression?',
    answer: (
      <>
        Structured pathways demonstrate systematic professional development to employers, clients,
        and industry bodies. Completing a CARSI pathway shows you have mastered not just isolated
        topics, but an integrated body of knowledge validated against{' '}
        <AcronymTooltip term="IICRC" /> standards. Many insurance panels and government tenders in
        Australia now require evidence of ongoing professional development, and a completed pathway
        provides exactly that documentation. Pathways also make it straightforward to track your{' '}
        <AcronymTooltip term="CEC" /> accumulation towards certification renewal — you can see at a
        glance how many credits you have earned and how many remain. For business owners, enrolling
        your team in pathways ensures consistent training standards across all technicians, reducing
        callbacks and improving customer satisfaction. Whether you are an independent operator
        building credibility or a company training a workforce, pathways turn professional
        development from a compliance burden into a competitive advantage.
      </>
    ),
  },
];

export default async function PathwaysPage() {
  const { items: pathways, total } = await getPathways();

  return (
    <MarketingPageShell id="main-content">
      <header className="mb-6">
        <h1 className={marketingHeading}>CEC Pathways</h1>
        <p className={`mt-2 max-w-2xl ${marketingBodySm}`}>
          Structured learning journeys for <AcronymTooltip term="IICRC" /> CEC renewal, team readiness
          and practical trade confidence.{' '}
          {total > 0 && `${total} pathway${total !== 1 ? 's' : ''} available.`}
        </p>
      </header>

      <div className="mb-10">
        <PathwayAdvisor />
      </div>

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
          <div className={`mx-auto max-w-xl px-6 py-16 text-center ${marketingPanel}`}>
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-[#ed9d24]/30 bg-[#ed9d24]/10">
              <GraduationCap className="h-9 w-9 text-[#ed9d24]" aria-hidden />
            </div>

            <h2 className={`font-display mb-3 text-xl font-semibold ${marketingTextStrong}`}>
              Database pathways are being linked
            </h2>

            <p className={`mx-auto mb-8 max-w-md ${marketingBodySm}`}>
              The guided advisor above is live now. Saved pathway cards will appear here as courses
              are linked to each <AcronymTooltip term="IICRC" /> discipline and team training
              journey.
            </p>

            <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href="/courses" className={marketingBtnPrimary}>
                Browse Courses
              </Link>
              <Link href="/pricing" className={marketingBtnSecondary}>
                View Pricing
              </Link>
            </div>
          </div>
        </section>
      )}

      <section className="mb-10">
        <div className={`p-5 sm:p-6 ${marketingPanel}`}>
          <h2 className={`font-display mb-3 text-center text-lg font-semibold ${marketingTextStrong}`}>
            Your Learning Journey
          </h2>
          <p className={`mx-auto mb-4 max-w-xl text-center text-xs ${marketingTextSubtle}`}>
            From enrolment to credential — follow the structured path from first lesson to shareable
            digital certificate.
          </p>
          <StudentJourneyMap />
        </div>
      </section>

      <section className="mb-8">
        <h2 className={`font-display mb-4 text-lg font-semibold ${marketingTextStrong}`}>
          Frequently Asked Questions
        </h2>
        <div className="space-y-3">
          {faqItems.map((item) => (
            <details key={item.question} className={`group ${marketingPanel}`}>
              <summary
                className={`flex cursor-pointer list-none items-center justify-between px-5 py-4 text-sm font-semibold select-none [&::-webkit-details-marker]:hidden ${marketingTextStrong}`}
              >
                <span>{item.question}</span>
                <ChevronDown
                  className={`h-4 w-4 shrink-0 transition-transform duration-200 group-open:rotate-180 ${marketingTextSubtle}`}
                  aria-hidden
                />
              </summary>
              <div className="px-5 pb-5">
                <p className={`text-sm leading-relaxed ${marketingTextMuted}`}>{item.answer}</p>
              </div>
            </details>
          ))}
        </div>
      </section>
    </MarketingPageShell>
  );
}
