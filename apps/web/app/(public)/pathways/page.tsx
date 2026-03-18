import type { Metadata } from 'next';

import { LearningPathwayCard } from '@/components/lms/LearningPathwayCard';
import { StudentJourneyMap } from '@/components/lms/diagrams/StudentJourneyMap';
import { AcronymTooltip } from '@/components/ui/AcronymTooltip';

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
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:8000';
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
    <main className="container mx-auto px-4 py-12">
      <h1 className="mb-2 text-4xl font-bold">Certification Pathways</h1>
      <p className="text-muted-foreground mb-8">
        Structured learning journeys towards <AcronymTooltip term="IICRC" /> certification.{' '}
        {total > 0 && `${total} pathway${total !== 1 ? 's' : ''} available.`}
      </p>

      {/* Question-based sections for GEO citability */}
      <section className="mb-12 max-w-3xl space-y-10">
        <div>
          <h2 className="mb-3 text-2xl font-semibold">What is a learning pathway?</h2>
          <p className="text-muted-foreground leading-relaxed">
            A learning pathway is a structured sequence of courses designed to build expertise in a
            specific area of restoration or cleaning. Unlike individual courses, pathways guide you
            through prerequisite knowledge, core competencies, and advanced techniques in a logical
            progression. CARSI&apos;s pathways align with <AcronymTooltip term="IICRC" />{' '}
            certification requirements, ensuring you earn the right Continuing Education Credits (
            <AcronymTooltip term="CEC">CECs</AcronymTooltip>) in the right order to achieve your
            professional goals. Each pathway maps directly to an <AcronymTooltip term="IICRC" />{' '}
            discipline such as Water Restoration (<AcronymTooltip term="WRT" />
            ), Applied Microbial Remediation (<AcronymTooltip term="AMRT" />
            ), or Carpet Cleaning (<AcronymTooltip term="CCT" />
            ), so every course you complete contributes meaningfully towards certification or
            recertification. Pathways also eliminate guesswork — instead of choosing from dozens of
            individual courses, you follow a curated sequence that builds knowledge progressively,
            from foundational science through to advanced field techniques and industry best
            practice.
          </p>
        </div>

        <div>
          <h2 className="mb-3 text-2xl font-semibold">Which CARSI pathway is right for me?</h2>
          <p className="text-muted-foreground leading-relaxed">
            Your ideal pathway depends on your current experience level and career objectives. New
            technicians should start with the Water Restoration Fundamentals pathway, which covers
            <AcronymTooltip term="IICRC" /> <AcronymTooltip term="WRT" /> certification preparation
            and provides the foundation for all other disciplines. Experienced professionals looking
            to expand their service offering should consider a multi-discipline pathway that
            combines <AcronymTooltip term="WRT" />, <AcronymTooltip term="AMRT" />, and{' '}
            <AcronymTooltip term="ASD" /> for comprehensive restoration capability. If you already
            hold <AcronymTooltip term="IICRC" /> certifications and need to maintain them,
            CARSI&apos;s <AcronymTooltip term="CEC" />
            -approved courses let you accumulate credits within a structured pathway rather than
            through ad-hoc training. Specialist contractors in carpet care, commercial cleaning, or
            aged-care facility maintenance will find dedicated pathways tailored to those sectors.
            Browse the pathways below, check the estimated hours and target certification for each,
            and choose the one that matches where you are now and where you want your career to go.
          </p>
        </div>

        <div>
          <h2 className="mb-3 text-2xl font-semibold">
            How do pathways help with career progression?
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            Structured pathways demonstrate systematic professional development to employers,
            clients, and industry bodies. Completing a CARSI pathway shows you have mastered not
            just isolated topics, but an integrated body of knowledge validated against{' '}
            <AcronymTooltip term="IICRC" /> standards. Many insurance panels and government tenders
            in Australia now require evidence of ongoing professional development, and a completed
            pathway provides exactly that documentation. Pathways also make it straightforward to
            track your <AcronymTooltip term="CEC" /> accumulation towards certification renewal —
            you can see at a glance how many credits you have earned and how many remain. For
            business owners, enrolling your team in pathways ensures consistent training standards
            across all technicians, reducing callbacks and improving customer satisfaction. Whether
            you are an independent operator building credibility or a company training a workforce,
            pathways turn professional development from a compliance burden into a competitive
            advantage.
          </p>
        </div>
      </section>

      {/* Student Journey Map */}
      <section className="mb-12">
        <h2 className="mb-4 text-2xl font-semibold">Your Learning Journey</h2>
        <p className="text-muted-foreground mb-4 max-w-2xl">
          From enrolment to credential — follow the structured path from first lesson to shareable
          digital certificate.
        </p>
        <StudentJourneyMap />
      </section>

      {pathways.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {pathways.map((p) => (
            <LearningPathwayCard key={p.id} pathway={p} />
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground mt-12 text-center">
          No pathways published yet. Check back soon.
        </p>
      )}
    </main>
  );
}
