'use client';

import { Award, BookOpen, ChevronRight, Target } from 'lucide-react';
import Link from 'next/link';

import { dash } from '@/lib/dashboard-light-ui';
import {
  computeProgressFromModules,
  type CurriculumModuleShape,
} from '@/lib/onboarding/enterprise';

import { OnboardingProgressRing } from './OnboardingProgressRing';

type Props = {
  slug: string;
  modules: CurriculumModuleShape[];
  certificateEligible?: boolean;
};

export function OnboardingLearnerDashboard({ slug, modules, certificateEligible }: Props) {
  const stats = computeProgressFromModules(modules);
  const modulesRemaining = stats.totalModules - stats.completedModules;
  const certMessage =
    stats.percent >= 100
      ? 'Certificate ready — view in Credentials'
      : stats.percent >= 80
        ? 'Certificate eligibility: almost achieved'
        : stats.percent >= 40
          ? 'Certificate eligibility: on track'
          : 'Complete all modules to earn your credential';

  const journeyItems = modules.map((mod) => {
    const done = mod.lessons.length > 0 && mod.lessons.every((l) => l.completed);
    const started = mod.lessons.some((l) => l.completed);
    const state = done ? 'complete' : started || mod.id === stats.currentModule?.id ? 'current' : 'upcoming';
    return { id: mod.id, title: mod.title.replace(/^Module \d+:\s*/i, ''), state };
  });

  const continueHref =
    stats.nextLessonId != null
      ? `/dashboard/learn/${slug}?lesson=${stats.nextLessonId}`
      : `/dashboard/learn/${slug}`;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,280px)_1fr]">
      <div className={`${dash.panel} flex flex-col items-center p-8`}>
        <OnboardingProgressRing
          percent={stats.percent}
          label="Complete"
          sublabel={
            modulesRemaining > 0
              ? `${modulesRemaining} module${modulesRemaining === 1 ? '' : 's'} remaining`
              : 'All modules complete'
          }
        />
        <Link href={continueHref} className={`${dash.btnPrimary} mt-8 w-full justify-center`}>
          {stats.percent >= 100 ? 'Review course' : 'Continue training'}
          <ChevronRight className="h-4 w-4" />
        </Link>
        {stats.percent >= 100 ? (
          <Link
            href="/dashboard/student/credentials"
            className={`${dash.btnSecondary} mt-3 w-full justify-center`}
          >
            <Award className="h-4 w-4" />
            View credential
          </Link>
        ) : null}
      </div>

      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            {
              icon: BookOpen,
              label: 'Current module',
              value: stats.currentModule?.title.replace(/^Module \d+:\s*/i, '') ?? 'Complete',
            },
            {
              icon: Target,
              label: 'Lessons',
              value: `${stats.completedLessons}/${stats.totalLessons}`,
            },
            {
              icon: Award,
              label: 'Credential',
              value: certificateEligible !== false ? certMessage.split('—')[0].trim() : 'In progress',
            },
          ].map((card) => (
            <div key={card.label} className={dash.statCard}>
              <card.icon className="mb-2 h-5 w-5 text-[#146fc2]" aria-hidden />
              <p className={dash.statLabel}>{card.label}</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{card.value}</p>
            </div>
          ))}
        </div>

        <div className={dash.panel}>
          <div className="border-b border-slate-200 px-6 py-4">
            <h3 className="text-base font-semibold text-slate-900">Training journey</h3>
            <p className="text-sm text-slate-500">{certMessage}</p>
          </div>
          <ul className="max-h-80 divide-y divide-slate-100 overflow-y-auto px-4 py-2">
            {journeyItems.map((item) => (
              <li key={item.id} className="flex items-center gap-3 py-3 text-sm">
                <span
                  className={
                    item.state === 'complete'
                      ? 'font-semibold text-emerald-600'
                      : item.state === 'current'
                        ? 'font-semibold text-[#146fc2]'
                        : 'text-slate-400'
                  }
                >
                  {item.state === 'complete' ? '✓' : item.state === 'current' ? '→' : '○'}
                </span>
                <span
                  className={
                    item.state === 'upcoming' ? 'text-slate-500' : 'font-medium text-slate-800'
                  }
                >
                  {item.title}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
