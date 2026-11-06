'use client';

import { useEffect, useState } from 'react';

import { coachingInfoBanner, coachingMuted } from '@/components/coaching-portal/coaching-ui';

export function CoachingBuildProgressStrip({
  active,
  steps,
  testId = 'coaching-build-progress',
}: {
  active: boolean;
  steps: readonly string[];
  testId?: string;
}) {
  const [index, setIndex] = useState(0);
  const [wasActive, setWasActive] = useState(active);
  // Reset to the first step when the build stops (state adjusted during render, not in an effect).
  if (active !== wasActive) {
    setWasActive(active);
    if (!active) setIndex(0);
  }

  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % steps.length);
    }, 2200);
    return () => window.clearInterval(id);
  }, [active, steps.length]);

  if (!active) return null;

  return (
    <div
      className={`mt-4 ${coachingInfoBanner}`}
      role="status"
      aria-live="polite"
      data-testid={testId}
    >
      <p className="text-sm font-medium text-sky-50">{steps[index] ?? steps[0]}</p>
      <div className="mt-2 flex gap-1" aria-hidden>
        {steps.map((_, i) => (
          <span
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
              i <= index ? 'bg-sky-400/80' : 'bg-white/10'
            }`}
          />
        ))}
      </div>
      <p className={`mt-2 text-[11px] ${coachingMuted}`}>
        Step {Math.min(index + 1, steps.length)} of {steps.length}
      </p>
    </div>
  );
}
