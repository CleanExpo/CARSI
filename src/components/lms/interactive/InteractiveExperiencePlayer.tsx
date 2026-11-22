'use client';

import { CheckCircle2, Circle, Lock } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { InteractiveActivityView } from '@/components/lms/interactive/InteractiveActivityView';
import type { InteractiveExperience } from '@/lib/lms/interactive-experience-types';
import {
  canOpenActivityIndex,
  maxXpForExperience,
  nextActivityIndex,
  normalizeInteractiveProgress,
  readInteractiveProgress,
  storageKey,
  writeInteractiveProgress,
  type InteractiveProgressSnapshot,
} from '@/lib/lms/interactive-progress';
import { cn } from '@/lib/utils';

interface InteractiveExperiencePlayerProps {
  experience: InteractiveExperience;
  /** Lesson id or `demo` for the public walkthrough. */
  progressKey?: string;
  label?: string;
  enterprise?: boolean;
  lessonCompleted?: boolean;
  onAllComplete?: () => void;
}

export function InteractiveExperiencePlayer({
  experience,
  progressKey = 'demo',
  label,
  enterprise,
  lessonCompleted,
  onAllComplete,
}: InteractiveExperiencePlayerProps) {
  const key = useMemo(() => storageKey(experience.id, progressKey), [experience.id, progressKey]);
  const maxXp = maxXpForExperience(experience);
  const completionBannerRef = useRef<HTMLDivElement>(null);
  const liveRef = useRef<HTMLParagraphElement>(null);

  const emptySnapshot = useMemo(
    (): InteractiveProgressSnapshot =>
      normalizeInteractiveProgress(experience, {
        activityIndex: 0,
        completedActivityIds: [],
        earnedXp: 0,
      }),
    [experience]
  );

  const [snapshot, setSnapshot] = useState<InteractiveProgressSnapshot>(emptySnapshot);
  const [hydrated, setHydrated] = useState(false);
  const [completionNotified, setCompletionNotified] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const stored = readInteractiveProgress(experience.id, progressKey, experience);
    setSnapshot(stored ?? emptySnapshot);
    setHydrated(true);
  }, [experience, progressKey, emptySnapshot]);

  useEffect(() => {
    if (!hydrated) return;
    writeInteractiveProgress(key, snapshot);
  }, [hydrated, key, snapshot]);

  const activity = experience.activities[snapshot.activityIndex];
  const allDone = snapshot.completedActivityIds.length >= experience.activities.length;
  const activitiesDone = snapshot.completedActivityIds.length;

  useEffect(() => {
    if (!allDone || completionNotified) return;
    setCompletionNotified(true);
    onAllComplete?.();
    completionBannerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [allDone, completionNotified, onAllComplete]);

  const announce = useCallback((message: string) => {
    setToast(message);
    if (liveRef.current) liveRef.current.textContent = message;
  }, []);

  const completeActivity = useCallback(
    (activityId: string, xp: number) => {
      setSnapshot((prev) => {
        if (prev.completedActivityIds.includes(activityId)) return prev;
        const completedActivityIds = [...prev.completedActivityIds, activityId];
        const act = experience.activities.find((a) => a.id === activityId);
        const title = act?.title ?? 'Activity';
        queueMicrotask(() => announce(`${title} complete. +${xp} XP.`));

        const normalized = normalizeInteractiveProgress(experience, {
          ...prev,
          completedActivityIds,
          earnedXp: prev.earnedXp + xp,
          activityIndex: prev.activityIndex,
        });
        return normalized;
      });
    },
    [announce, experience]
  );

  const selectActivity = (index: number) => {
    if (!canOpenActivityIndex(index, snapshot.completedActivityIds, experience)) return;
    setSnapshot((prev) => ({ ...prev, activityIndex: index }));
  };

  const goToNextOpen = () => {
    const next = nextActivityIndex(experience, snapshot.completedActivityIds);
    if (next === null) return;
    setSnapshot((prev) => ({ ...prev, activityIndex: next }));
  };

  const reset = () => {
    setSnapshot(emptySnapshot);
    setCompletionNotified(false);
    announce('Experience restarted.');
  };

  if (!hydrated) {
    return (
      <section
        aria-busy="true"
        aria-label="Loading interactive experience"
        className={cn(
          'rounded-xl border p-5 sm:p-6',
          enterprise ? 'border-slate-200 bg-white' : 'border-slate-200 bg-slate-50'
        )}
      >
        <div className="h-4 w-40 animate-pulse rounded bg-slate-200" />
        <div className="mt-4 h-8 w-3/4 animate-pulse rounded bg-slate-200" />
        <div className="mt-6 h-32 animate-pulse rounded-lg bg-slate-100" />
      </section>
    );
  }

  if (!activity) return null;

  const progressPct = maxXp > 0 ? Math.round((snapshot.earnedXp / maxXp) * 100) : 0;
  const nextIndex = nextActivityIndex(experience, snapshot.completedActivityIds);
  const currentDone = snapshot.completedActivityIds.includes(activity.id);

  return (
    <section
      aria-label={label ?? experience.title}
      className={cn(
        'rounded-xl border p-5 sm:p-6',
        enterprise
          ? 'border-slate-200 bg-white shadow-sm'
          : 'border-[#2490ed]/25 bg-gradient-to-b from-[#f4f9ff] to-white'
      )}
    >
      <p ref={liveRef} className="sr-only" aria-live="polite" />
      {toast ? (
        <p className="mb-2 text-xs font-medium text-emerald-800" role="status">
          {toast}
        </p>
      ) : null}

      <header className="space-y-2">
        <p className="text-xs font-semibold tracking-wider text-slate-500 uppercase">
          {label ?? 'Interactive experience'}
        </p>
        <h2 className="text-lg font-bold text-slate-900 sm:text-xl">{experience.title}</h2>
        {experience.subtitle ? (
          <p className="text-sm text-slate-600">{experience.subtitle}</p>
        ) : null}
        <p className="text-xs leading-relaxed text-slate-500">{experience.disclaimer}</p>
      </header>

      <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-slate-700">
        <span className="font-semibold text-[#146fc2]">
          {snapshot.earnedXp} / {maxXp} XP
        </span>
        <div className="h-2 min-w-[8rem] flex-1 overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-[#146fc2] transition-[width]"
            style={{ width: `${progressPct}%` }}
            role="progressbar"
            aria-valuenow={progressPct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Experience progress"
          />
        </div>
        <span className="text-xs text-slate-500">
          {activitiesDone} of {experience.activities.length} activities mastered
        </span>
      </div>

      <nav aria-label="Activities" className="mt-4 flex gap-2 overflow-x-auto pb-1">
        {experience.activities.map((a, i) => {
          const done = snapshot.completedActivityIds.includes(a.id);
          const active = i === snapshot.activityIndex;
          const locked = !canOpenActivityIndex(i, snapshot.completedActivityIds, experience);
          return (
            <button
              key={a.id}
              type="button"
              disabled={locked}
              onClick={() => selectActivity(i)}
              className={cn(
                'flex shrink-0 items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium',
                active
                  ? 'border-[#146fc2] bg-[#146fc2]/10 text-[#146fc2]'
                  : 'border-slate-200 bg-white text-slate-600',
                locked && 'cursor-not-allowed opacity-50'
              )}
            >
              {locked ? (
                <Lock className="h-3.5 w-3.5" aria-hidden />
              ) : done ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" aria-hidden />
              ) : (
                <Circle className="h-3.5 w-3.5 opacity-40" aria-hidden />
              )}
              <span className="max-w-[10rem] truncate">{a.title}</span>
            </button>
          );
        })}
      </nav>

      <div className="mt-5 rounded-lg border border-slate-200 bg-white p-4 sm:p-5">
        <h3 className="text-sm font-semibold text-slate-900">{activity.title}</h3>
        <div className="mt-3">
          <InteractiveActivityView
            key={`${activity.id}-${currentDone ? 'done' : 'active'}`}
            activity={activity}
            mastered={currentDone}
            onComplete={(xp) => completeActivity(activity.id, xp)}
          />
        </div>
        {currentDone && nextIndex !== null ? (
          <button
            type="button"
            onClick={goToNextOpen}
            className="mt-4 w-full rounded-lg bg-[#146fc2] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#125da3] sm:w-auto"
          >
            Continue to next activity
          </button>
        ) : null}
      </div>

      <div ref={completionBannerRef}>
        {allDone ? (
          <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-950">
            <p className="font-semibold">All activities mastered</p>
            <p className="mt-1">
              {lessonCompleted
                ? 'You have finished this lesson and the interactive practice. Continue to the next lesson when ready.'
                : 'You have practised hazard-led investigation end to end. Use Mark lesson complete below to record progress and continue the course.'}
            </p>
          </div>
        ) : null}
      </div>

      <button
        type="button"
        onClick={reset}
        className="mt-4 text-xs font-semibold text-[#146fc2] hover:underline"
      >
        Restart experience
      </button>
    </section>
  );
}
