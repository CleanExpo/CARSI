'use client';

import Link from 'next/link';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { useMemo, useState } from 'react';

import {
  customerJourneyLoopStages,
  pathwayAdvisorOptions,
  type PathwayAdvisorOption,
} from '@/lib/customer-journey-loop';

function DisciplinePill({ code }: { code: string }) {
  return (
    <span className="rounded border border-[#2490ed]/30 bg-[#2490ed]/10 px-2 py-1 font-mono text-[11px] font-bold text-[#8fd0ff]">
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
      className="flex min-h-16 w-full items-center gap-3 rounded-lg border px-3 py-3 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2490ed]/70"
      style={{
        background: active ? 'rgba(36,144,237,0.16)' : 'rgba(255,255,255,0.045)',
        borderColor: active ? 'rgba(36,144,237,0.55)' : 'rgba(255,255,255,0.1)',
      }}
      aria-pressed={active}
    >
      <span
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border"
        style={{
          borderColor: active ? 'rgba(36,144,237,0.6)' : 'rgba(255,255,255,0.12)',
          background: active ? 'rgba(36,144,237,0.18)' : 'rgba(255,255,255,0.04)',
          color: active ? '#8fd0ff' : 'rgba(255,255,255,0.62)',
        }}
        aria-hidden
      >
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-white">{option.label}</span>
        <span className="mt-0.5 block text-xs leading-snug text-white/54">{option.eyebrow}</span>
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
          <li key={stage.id} className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
            <div className="flex items-center gap-2">
              <Icon className="h-4 w-4 shrink-0 text-[#7ec5ff]" aria-hidden />
              <p className="text-sm font-semibold text-white">{stage.title}</p>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-white/54">{stage.description}</p>
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
      className="relative overflow-hidden rounded-lg border border-white/10 bg-[#090f1a] p-4 shadow-[0_24px_80px_-50px_rgba(0,0,0,0.95)] sm:p-6 lg:p-7"
      aria-labelledby="pathway-advisor-heading"
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_55%_at_75%_0%,rgba(36,144,237,0.18),transparent_58%)]"
        aria-hidden
      />
      <div className="relative">
        <div className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.18em] text-[#7ec5ff] uppercase">
              Find your path
            </p>
            <h2
              id="pathway-advisor-heading"
              className="mt-2 text-2xl leading-tight font-bold tracking-tight text-white sm:text-3xl"
            >
              Choose the next best CARSI move
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-white/62">
              Start with the situation, not the catalogue. CARSI should always guide a learner from
              goal to course, then back into progress, credential proof, and the next
              recommendation.
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

          <div className="rounded-lg border border-white/10 bg-black/20 p-4 sm:p-5 lg:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex min-w-0 gap-3">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md border border-[#2490ed]/40 bg-[#2490ed]/14 text-[#8fd0ff]">
                  <SelectedIcon className="h-6 w-6" aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold tracking-[0.16em] text-[#ed9d24] uppercase">
                    {selected.eyebrow}
                  </p>
                  <h3 className="mt-1 text-xl font-semibold tracking-tight text-white">
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

            <p className="mt-5 max-w-3xl text-sm leading-relaxed text-white/68">
              {selected.summary}
            </p>

            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
                <p className="text-sm font-semibold text-white">Best for</p>
                <ul className="mt-3 space-y-2">
                  {selected.bestFor.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm text-white/62">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
                <p className="text-sm font-semibold text-white">Loop enforcement</p>
                <p className="mt-3 text-sm leading-relaxed text-white/62">
                  <span className="font-medium text-white/86">First action:</span>{' '}
                  {selected.firstAction}
                </p>
                <p className="mt-3 text-sm leading-relaxed text-white/62">
                  <span className="font-medium text-white/86">Retention cue:</span>{' '}
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
                className="inline-flex items-center justify-center rounded-lg border border-white/15 bg-white/[0.04] px-5 py-3 text-sm font-semibold text-white/86 transition-colors hover:border-white/25 hover:bg-white/[0.08]"
              >
                {selected.secondaryLabel}
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-6 border-t border-white/10 pt-6">
          <p className="mb-3 text-[11px] font-semibold tracking-[0.18em] text-white/42 uppercase">
            CARSI retention loop
          </p>
          <JourneyLoopStrip />
        </div>
      </div>
    </section>
  );
}
