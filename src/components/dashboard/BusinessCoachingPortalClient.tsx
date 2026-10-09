'use client';

import { ArrowLeft, Clock } from 'lucide-react';
import Link from 'next/link';

import { CoachingComingSoonBanner } from '@/components/ccw/CoachingComingSoonBanner';
import { carsiCoachingMonthlyPath } from '@/lib/marketing/carsi-coaching-monthly';
import { carsiCoachingPortalFeatures } from '@/lib/marketing/carsi-coaching-program';

const surface = 'learner-home-surface learner-home-card overflow-hidden rounded-[1.25rem]';
const heading = 'font-semibold tracking-[-0.02em] text-white';
const muted = 'text-slate-300/80';

export function BusinessCoachingPortalClient() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      <Link
        href="/dashboard/student"
        className="mb-6 inline-flex items-center gap-2 text-sm text-sky-200/90 hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Back to My Learning
      </Link>

      <header className={`${surface} px-6 py-8 sm:px-8`}>
        <div className="flex items-center gap-2 text-amber-300">
          <Clock className="h-5 w-5" aria-hidden />
          <p className="text-[11px] font-semibold tracking-[0.2em] uppercase">Coming soon</p>
        </div>
        <h1 className={`mt-2 text-2xl sm:text-3xl ${heading}`}>Business Coaching Portal</h1>
        <p className={`mt-3 text-sm leading-relaxed ${muted}`}>
          The subscriber portal is not live yet. If you have already subscribed, Phill&apos;s team
          will onboard you by email until this dashboard is ready.
        </p>
        <div className="mt-6 [&_p]:text-slate-200">
          <CoachingComingSoonBanner label="Portal launching soon" />
        </div>
        <Link
          href={carsiCoachingMonthlyPath}
          className="mt-6 inline-flex rounded-full border border-white/20 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/15"
        >
          View Business Coaching program
        </Link>
      </header>

      <section className={`${surface} mt-6 p-6`}>
        <h2 className={`text-lg ${heading}`}>What will be here</h2>
        <ul className="mt-4 space-y-3">
          {carsiCoachingPortalFeatures.map((f) => (
            <li
              key={f.title}
              className="rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm"
            >
              <p className="font-semibold text-white">{f.title}</p>
              <p className={`mt-1 text-xs leading-relaxed ${muted}`}>{f.detail}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
