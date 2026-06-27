'use client';

import { Check, Circle, MapPin } from 'lucide-react';

import { dash } from '@/lib/dashboard-light-ui';
import {
  FLOOR_CARE_PHASES,
  type CurriculumModuleShape,
  type OnboardingPhase,
} from '@/lib/onboarding/enterprise';
import { cn } from '@/lib/utils';

function statusesForPhases(
  phases: OnboardingPhase[],
  modules: CurriculumModuleShape[]
): Record<string, 'complete' | 'current' | 'upcoming'> {
  const out: Record<string, 'complete' | 'current' | 'upcoming'> = {};
  let currentAssigned = false;
  for (const phase of phases) {
    const phaseMods = phase.moduleIndexes.map((i) => modules[i]).filter(Boolean);
    const allDone =
      phaseMods.length > 0 &&
      phaseMods.every((m) => m.lessons.length > 0 && m.lessons.every((l) => l.completed));
    if (allDone) {
      out[phase.id] = 'complete';
      continue;
    }
    if (!currentAssigned) {
      out[phase.id] = 'current';
      currentAssigned = true;
    } else {
      out[phase.id] = 'upcoming';
    }
  }
  return out;
}

type Props = {
  modules: CurriculumModuleShape[];
  phases?: OnboardingPhase[];
  onSelectModule?: (moduleId: string) => void;
};

export function OnboardingLearningRoadmap({
  modules,
  phases = FLOOR_CARE_PHASES,
  onSelectModule,
}: Props) {
  const statuses = statusesForPhases(phases, modules);

  return (
    <div className={dash.panel}>
      <div className="border-b border-slate-200 px-6 py-5">
        <p className={dash.eyebrow}>Learning journey</p>
        <h2 className={`${dash.h2} mt-1`}>Your operational readiness roadmap</h2>
        <p className={`${dash.lead} mt-2 max-w-2xl`}>
          Four phases guide technicians from foundation standards through to quality assurance and final
          assessment.
        </p>
      </div>
      <ol className="divide-y divide-slate-100">
        {phases.map((phase, idx) => {
          const status = statuses[phase.id] ?? 'upcoming';
          const phaseMods = phase.moduleIndexes
            .map((i) => modules[i])
            .filter(Boolean);
          const lessonsTotal = phaseMods.reduce((s, m) => s + m.lessons.length, 0);
          const lessonsDone = phaseMods.reduce(
            (s, m) => s + m.lessons.filter((l) => l.completed).length,
            0
          );
          const phasePct =
            lessonsTotal > 0 ? Math.round((lessonsDone / lessonsTotal) * 100) : 0;

          return (
            <li key={phase.id} className="px-6 py-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">
                <div
                  className={cn(
                    'flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border text-sm font-bold',
                    status === 'complete' && 'border-emerald-200 bg-emerald-50 text-emerald-700',
                    status === 'current' && 'border-[#2490ed]/30 bg-[#eef7ff] text-[#146fc2]',
                    status === 'upcoming' && 'border-slate-200 bg-slate-50 text-slate-400'
                  )}
                  aria-hidden
                >
                  {status === 'complete' ? <Check className="h-5 w-5" /> : idx + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-semibold text-slate-900">{phase.title}</h3>
                    <span
                      className={cn(
                        'rounded-full px-2.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase',
                        status === 'complete' && 'bg-emerald-100 text-emerald-800',
                        status === 'current' && 'bg-[#eef7ff] text-[#146fc2]',
                        status === 'upcoming' && 'bg-slate-100 text-slate-500'
                      )}
                    >
                      {status === 'complete'
                        ? 'Complete'
                        : status === 'current'
                          ? 'In progress'
                          : 'Upcoming'}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">{phase.subtitle}</p>
                  <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#2490ed] to-[#146fc2] transition-all duration-500"
                      style={{ width: `${phasePct}%` }}
                    />
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    {lessonsDone} of {lessonsTotal} lessons · {phasePct}%
                  </p>
                  <ul className="mt-4 space-y-2">
                    {phaseMods.map((mod) => {
                      const modDone =
                        mod.lessons.length > 0 && mod.lessons.every((l) => l.completed);
                      const modStarted = mod.lessons.some((l) => l.completed);
                      return (
                        <li key={mod.id}>
                          <button
                            type="button"
                            disabled={!onSelectModule}
                            onClick={() => onSelectModule?.(mod.id)}
                            className={cn(
                              'flex w-full items-start gap-2 rounded-xl border px-3 py-2.5 text-left text-sm transition',
                              modDone && 'border-emerald-100 bg-emerald-50/50',
                              !modDone && modStarted && 'border-[#2490ed]/20 bg-[#eef7ff]/40',
                              !modDone && !modStarted && 'border-slate-100 bg-white',
                              onSelectModule && 'hover:border-[#2490ed]/30 hover:shadow-sm'
                            )}
                          >
                            {modDone ? (
                              <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                            ) : modStarted ? (
                              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#146fc2]" />
                            ) : (
                              <Circle className="mt-0.5 h-4 w-4 shrink-0 text-slate-300" />
                            )}
                            <span className="text-slate-800">{mod.title}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
