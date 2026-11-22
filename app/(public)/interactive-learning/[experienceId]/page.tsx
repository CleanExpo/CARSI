import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { InteractiveLearningExperienceView } from '@/components/lms/interactive/InteractiveLearningExperienceView';
import { PUBLIC_SHELL_INNER_CLASS } from '@/components/landing/public-shell-width';
import { getInteractiveLearningOffer } from '@/lib/lms/interactive-learning-catalog';
import { getInteractiveExperienceById } from '@/lib/lms/interactive-experience-registry';
import { marketingBtnPrimary, marketingBtnSecondary, marketingPanel } from '@/lib/marketing/marketing-ui';
import { cn } from '@/lib/utils';

type Props = { params: Promise<{ experienceId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { experienceId } = await params;
  const offer = getInteractiveLearningOffer(experienceId);
  if (!offer) return { title: 'Interactive experience' };
  return {
    title: `${offer.courseTitle} — interactive practice`,
    description: offer.teaser,
  };
}

export default async function InteractiveLearningExperiencePage({ params }: Props) {
  const { experienceId } = await params;
  const offer = getInteractiveLearningOffer(experienceId);
  if (!offer) notFound();

  if (offer.status === 'coming-soon') {
    return <ComingSoonExperience offer={offer} />;
  }

  const experience = getInteractiveExperienceById(offer.experienceId);
  if (!experience) notFound();

  return <InteractiveLearningExperienceView offer={offer} experience={experience} />;
}

function ComingSoonExperience({
  offer,
}: {
  offer: NonNullable<ReturnType<typeof getInteractiveLearningOffer>>;
}) {
  return (
    <div className={cn(PUBLIC_SHELL_INNER_CLASS, 'py-16 md:py-24')}>
      <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Interactive practice</p>
      <h1 className="mt-3 text-3xl font-semibold text-slate-950">{offer.courseTitle}</h1>
      <p className="mt-4 max-w-xl text-sm leading-relaxed text-slate-600">{offer.teaser}</p>
      <div className={cn(marketingPanel, 'mt-8 max-w-lg p-6')}>
        <p className="text-sm font-semibold text-slate-900">Experience coming soon</p>
        <p className="mt-2 text-sm text-slate-600">
          This discipline joins the same interactive framework as water restoration. Enrol in the course or try a live
          experience today.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href={`/courses/${offer.courseSlug}`} className={marketingBtnPrimary}>
            View course
          </Link>
          <Link href="/interactive-learning" className={marketingBtnSecondary}>
            Live experiences
          </Link>
        </div>
      </div>
    </div>
  );
}

export function generateStaticParams() {
  return [{ experienceId: 'water-damage-module-3-pilot' }];
}