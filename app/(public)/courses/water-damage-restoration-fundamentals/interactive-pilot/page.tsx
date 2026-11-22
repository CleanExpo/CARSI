import Link from 'next/link';

import { InteractiveExperiencePlayer } from '@/components/lms/interactive/InteractiveExperiencePlayer';
import { WATER_DAMAGE_INTERACTIVE_PILOT } from '@/lib/lms/interactive-experience-data';

export const metadata = {
  title: 'Interactive water damage pilot — CARSI',
  description:
    'Walk through a hazard-led job-site investigation for the CARSI Water Restoration Practitioner course (educational simulation).',
};

export default function WaterDamageInteractivePilotPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
      <p className="text-xs font-semibold tracking-wider text-slate-500 uppercase">Pilot demonstration</p>
      <h1 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">
        Interactive restoration learning — water damage
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-slate-600">
        This public walkthrough mirrors the experience enrolled learners see on Module&nbsp;3 lesson{' '}
        <strong className="font-semibold text-slate-800">Identify the hazards first</strong>. Progress is saved in
        this browser only.
      </p>
      <div className="mt-8">
        <InteractiveExperiencePlayer experience={WATER_DAMAGE_INTERACTIVE_PILOT} progressKey="public-demo" />
      </div>
      <p className="mt-8 text-sm text-slate-600">
        <Link href="/courses/water-damage-restoration-fundamentals" className="font-semibold text-[#146fc2] hover:underline">
          View the course
        </Link>{' '}
        or{' '}
        <Link href="/dashboard/learn/water-damage-restoration-fundamentals" className="font-semibold text-[#146fc2] hover:underline">
          open the learner shell
        </Link>{' '}
        when enrolled.
      </p>
    </main>
  );
}