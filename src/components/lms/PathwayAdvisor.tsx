'use client';

import Link from 'next/link';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { useMemo, useState } from 'react';

import {
  customerJourneyLoopStages,
  pathwayAdvisorOptions,
  type PathwayAdvisorOption,
} from '@/lib/customer-journey-loop';
import {
  marketingBodySm,
  marketingEyebrow,
  marketingEyebrowAmber,
  marketingPanel,
  marketingTextMuted,
  marketingTextStrong,
  marketingTextSubtle,
} from '@/lib/marketing/marketing-ui';

function DisciplinePill({ code }: { code: string }) {
  return (
    <span className="rounded border border-[#2490ed]/30 bg-[#eef7ff] px-2 py-1 font-mono text-[11px] font-bold text-[#146fc2] dark:bg-[#2490ed]/10 dark:text-[#8fd0ff]">
      {code}
    </span>
  );
}

function AdvisorOptionButton({
  option,
  active,
  onSelect,
}: {
  option: PathwayAdvisorOption;
  active: boolean;
  onSelect: () => void;
}) {
  const Icon = option.icon;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex min-h-16 w-full items-center gap-3 rounded-lg border px-3 py-3 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2490ed]/70 ${
        active
          ? 'border-[#2490ed]/55 bg-[#eef7ff] dark:bg-[#2490ed]/16'
          : 'border-slate-200 bg-slate-50 hover:border-slate-300 dark:border-white/10 dark:bg-white/[0.045] dark:hover:border-white/15'
      }`}
      aria-pressed={active}
    >
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md border ${
          active
            ? 'border-[#2490ed]/60 bg-[#2490ed]/15 text-[#146fc2] dark:bg-[#2490ed]/18 dark:text-[#8fd0ff]'
            : 'border-slate-200 bg-white text-slate-500 dark:border-white/12 dark:bg-white/[0.04] dark:text-white/62'
        }`}
        aria-hidden
      >
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0">
        <span className={`block text-sm font-semibold ${marketingTextStrong}`}>{option.label}</span>
        <span className={`mt-0.5 block text-xs leading-snug ${marketingTextMuted}`}>
          {option.eyebrow}
        </span>
      </span>
    </button>
  );
}

export function JourneyLoopStrip() {
  return (
    <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-7">
      {customerJourneyLoopStages.map((stage) => {
        const Icon = stage.icon;
        return (
          <li key={stage.id} className={`p-3 ${marketingPanel}`}>
            <div className="flex items-center gap-2">
              <Icon className="h-4 w-4 shrink-0 text-[#146fc2] dark:text-[#7ec5ff]" aria-hidden />
              <p className={`text-sm font-semibold ${marketingTextStrong}`}>{stage.title}</p>
            </div>
            <p className={`mt-2 text-xs leading-relaxed ${marketingTextMuted}`}>{stage.description}</p>
          </li>
        );
      })}
    </ol>
  );
}

export function PathwayAdvisor() {
  const [selectedId, setSelectedId] = useState(pathwayAdvisorOptions[0]?.id ?? '');

  const selected = useMemo(
    () =>
      pathwayAdvisorOptions.find((option) => option.id === selectedId) ?? pathwayAdvisorOptions[0],
    [selectedId]
  );

  if (!selected) return null;

  const SelectedIcon = selected.icon;

  return (
    <section
      className="relative overflow-hidden rounded-xl border border-slate-200/90 bg-white p-4 shadow-[0_24px_80px_-50px_rgba(15,23,42,0.15)] sm:p-6 lg:p-7 dark:border-white/10 dark:bg-[#090f1a] dark:shadow-[0_24px_80px_-50px_rgba(0,0,0,0.95)]"
      aria-labelledby="pathway-advisor-heading"
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_55%_at_75%_0%,rgba(36,144,237,0.12),transparent_58%)] dark:bg-[radial-gradient(ellipse_70%_55%_at_75%_0%,rgba(36,144,237,0.18),transparent_58%)]"
        aria-hidden
      />
      <div className="relative">
        <div className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
          <div>
            <p className={marketingEyebrow}>Find your path</p>
            <h2
              id="pathway-advisor-heading"
              className={`mt-2 text-2xl leading-tight font-bold tracking-tight sm:text-3xl ${marketingTextStrong}`}
            >
              Choose the next best CARSI move
            </h2>
            <p className={`mt-3 ${marketingBodySm}`}>
              Start with the situation, not the catalogue. CARSI should always guide a learner from
              goal to course, then back into progress, credential proof, and the next recommendation.
            </p>

            <div className="mt-5 grid gap-2">
              {pathwayAdvisorOptions.map((option) => (
                <AdvisorOptionButton
                  key={option.id}
                  option={option}
                  active={option.id === selected.id}
                  onSelect={() => setSelectedId(option.id)}
                />
              ))}
            </div>
          </div>

          <div className={`p-4 sm:p-5 lg:p-6 ${marketingPanel}`}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex min-w-0 gap-3">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md border border-[#2490ed]/40 bg-[#eef7ff] text-[#146fc2] dark:bg-[#2490ed]/14 dark:text-[#8fd0ff]">
                  <SelectedIcon className="h-6 w-6" aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className={marketingEyebrowAmber}>{selected.eyebrow}</p>
                  <h3 className={`mt-1 text-xl font-semibold tracking-tight ${marketingTextStrong}`}>
                    {selected.title}
                  </h3>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {selected.recommendedDisciplines.map((code) => (
                  <DisciplinePill key={code} code={code} />
                ))}
              </div>
            </div>

            <p className={`mt-5 max-w-3xl ${marketingBodySm}`}>{selected.summary}</p>

            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              <div className={`p-4 ${marketingPanel}`}>
                <p className={`text-sm font-semibold ${marketingTextStrong}`}>Best for</p>
                <ul className="mt-3 space-y-2">
                  {selected.bestFor.map((item) => (
                    <li key={item} className={`flex items-start gap-2 text-sm ${marketingTextMuted}`}>
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-300" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className={`p-4 ${marketingPanel}`}>
                <p className={`text-sm font-semibold ${marketingTextStrong}`}>Loop enforcement</p>
                <p className={`mt-3 text-sm leading-relaxed ${marketingTextMuted}`}>
                  <span className={`font-medium ${marketingTextStrong}`}>First action:</span>{' '}
                  {selected.firstAction}
                </p>
                <p className={`mt-3 text-sm leading-relaxed ${marketingTextMuted}`}>
                  <span className={`font-medium ${marketingTextStrong}`}>Retention cue:</span>{' '}
                  {selected.retentionCue}
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link
                href={selected.primaryHref}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#ed9d24] px-5 py-3 text-sm font-semibold text-[#1a1205] transition-transform hover:scale-[1.01]"
              >
                {selected.primaryLabel}
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              <Link
                href={selected.secondaryHref}
                className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-slate-50 px-5 py-3 text-sm font-semibold text-slate-800 transition-colors hover:border-slate-400 hover:bg-slate-100 dark:border-white/15 dark:bg-white/[0.04] dark:text-white/86 dark:hover:border-white/25 dark:hover:bg-white/[0.08]"
              >
                {selected.secondaryLabel}
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-6 border-t border-slate-200/80 pt-6 dark:border-white/10">
          <p className={`mb-3 text-[11px] font-semibold tracking-[0.18em] uppercase ${marketingTextSubtle}`}>
            CARSI retention loop
          </p>
          <JourneyLoopStrip />
        </div>
      </div>
    </section>
  );
}
