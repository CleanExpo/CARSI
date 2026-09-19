import Link from 'next/link';
import type { Metadata } from 'next';
import { Compass } from 'lucide-react';

import { HomeFaqSection } from '@/components/landing/HomeFaqSection';
import { HomeFinalCtaSection } from '@/components/landing/HomeFinalCtaSection';
import { HomeTrustStrip } from '@/components/landing/HomeTrustStrip';
import {
  LANDING_DISPLAY_H2_CLASS,
  LANDING_EYEBROW_CLASS,
  LANDING_LEAD_CLASS,
  PUBLIC_SHELL_INNER_CLASS,
} from '@/components/landing/public-shell-width';
import { LearningPathwayCard } from '@/components/lms/LearningPathwayCard';
import { PathwayAdvisor } from '@/components/lms/PathwayAdvisor';
import { StudentJourneyMap } from '@/components/lms/diagrams/StudentJourneyMap';
import { getBackendOrigin } from '@/lib/env/public-url';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'IICRC CEC Learning Pathways — Which Restoration Course Path Is Right for You?',
  description:
    'Explore structured IICRC CEC pathways for water restoration, mould remediation, carpet cleaning and more. Find the right learning path for your career stage and earn CECs in the correct order.',
  alternates: { canonical: '/pathways' },
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

const faqs = [
  {
    question: 'What is a learning pathway?',
    answer:
      'A learning pathway is a structured sequence of courses designed to build expertise in a specific area of restoration or cleaning. CARSI pathways guide you through prerequisite knowledge, core competencies, and advanced techniques in a logical order. They help you earn IICRC Continuing Education Credits (CECs) in a useful sequence toward maintaining an existing IICRC certification. IICRC certification itself is obtained through schools and examinations approved by the IICRC. Each pathway is a CARSI journey — CARSI-issued designations, not IICRC certification courses.',
  },
  {
    question: 'Which CARSI pathway is right for me?',
    answer:
      'Your ideal pathway depends on your current experience and career objectives. New technicians usually start with water restoration fundamentals. Experienced professionals looking to expand their offering should consider a multi-discipline path. If you already hold IICRC certifications and need to maintain them, approved CARSI courses let you accumulate CECs inside a structured pathway. Specialist contractors in carpet care, commercial cleaning, or facility maintenance will find dedicated journeys for those sectors.',
  },
  {
    question: 'How do pathways help with career progression?',
    answer:
      'Structured pathways show systematic professional development to employers, clients, and industry bodies. Completing a CARSI pathway shows you have mastered an integrated body of knowledge, not isolated topics. Many insurance panels and government tenders in Australia now require evidence of ongoing professional development. Pathways also make CEC accumulation toward certification renewal easier to track. For business owners, enrolling a team in pathways keeps training standards consistent across technicians.',
  },
];

export default async function PathwaysPage() {
  const { items: pathways, total } = await getPathways();

  return (
    <>
      <section className="relative overflow-hidden border-b border-slate-200/70 bg-white">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_55%_at_80%_0%,rgba(36,144,237,0.11),transparent_58%)]"
          aria-hidden
        />
        <div className={`relative ${PUBLIC_SHELL_INNER_CLASS} py-16 md:py-24`}>
          <p className={LANDING_EYEBROW_CLASS}>Pathways</p>
          <h1 className="mt-3 max-w-3xl font-[family-name:var(--font-display)] text-[2.15rem] leading-[1.1] font-semibold tracking-[-0.02em] text-slate-950 md:text-[3.1rem] md:leading-[1.06]">
            A structured path, not a pile of courses
          </h1>
          <p className={`mt-5 max-w-2xl text-pretty ${LANDING_LEAD_CLASS}`}>
            Guided journeys for IICRC CEC renewal, team readiness, and practical trade confidence.
            {total > 0 ? ` ${total} pathway${total !== 1 ? 's' : ''} available.` : ''}
          </p>
        </div>
      </section>

      <HomeTrustStrip
        stats={[
          { value: total > 0 ? String(total) : 'Advisor', label: 'Pathways' },
          { value: 'CEC', label: 'Renewal order' },
          { value: 'Team', label: 'Ready crews' },
          { value: '24/7', label: 'Study anytime' },
        ]}
      />

      <section className="border-t border-slate-200/70 bg-[#fafbfc] py-16 md:py-20">
        <div className={PUBLIC_SHELL_INNER_CLASS}>
          <p className={LANDING_EYEBROW_CLASS}>Advisor</p>
          <h2 className={`mt-3 mb-8 ${LANDING_DISPLAY_H2_CLASS}`}>Tell us the job, we name the path</h2>
          <PathwayAdvisor />
        </div>
      </section>

      <section className="border-t border-slate-200/70 bg-white py-16 md:py-24">
        <div className={PUBLIC_SHELL_INNER_CLASS}>
          <p className={LANDING_EYEBROW_CLASS}>Catalogue</p>
          <h2 className={`mt-3 ${LANDING_DISPLAY_H2_CLASS}`}>Saved pathways</h2>
          {pathways.length > 0 ? (
            <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {pathways.map((p) => (
                <LearningPathwayCard key={p.id} pathway={p} />
              ))}
            </div>
          ) : (
            <div className="mx-auto mt-12 max-w-xl text-center">
              <Compass className="mx-auto h-8 w-8 text-[#146fc2]" aria-hidden />
              <p className={`mt-4 ${LANDING_LEAD_CLASS}`}>
                The advisor above is live now. Saved pathway cards appear here as courses are linked
                to each journey.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <Link
                  href="/courses"
                  className="inline-flex min-h-11 items-center rounded-full bg-[#146fc2] px-6 text-sm font-semibold text-white hover:bg-[#0f5fa8]"
                >
                  Browse courses
                </Link>
                <Link
                  href="/pricing"
                  className="inline-flex min-h-11 items-center rounded-full border border-slate-200 bg-white px-6 text-sm font-semibold text-slate-800"
                >
                  View pricing
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="border-t border-slate-200/70 bg-[#fafbfc] py-16 md:py-24">
        <div className={PUBLIC_SHELL_INNER_CLASS}>
          <div className="mx-auto max-w-2xl text-center">
            <p className={LANDING_EYEBROW_CLASS}>Journey</p>
            <h2 className={`mt-3 ${LANDING_DISPLAY_H2_CLASS}`}>From enrolment to credential</h2>
            <p className={`mx-auto mt-4 ${LANDING_LEAD_CLASS}`}>
              First lesson through to a shareable digital certificate.
            </p>
          </div>
          <div className="mt-10 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm md:p-10">
            <StudentJourneyMap />
          </div>
        </div>
      </section>

      <HomeFaqSection faqs={faqs} />
      <HomeFinalCtaSection />
    </>
  );
}
