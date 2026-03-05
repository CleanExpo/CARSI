'use client';

import Image from 'next/image';

interface StreakTrackerProps {
  currentStreak: number;
  longestStreak: number;
}

type StreakMilestone = 7 | 30 | 90;

function getStreakMilestone(streak: number): StreakMilestone | null {
  if (streak >= 90) return 90;
  if (streak >= 30) return 30;
  if (streak >= 7) return 7;
  return null;
}

const STREAK_BADGES: Record<StreakMilestone, { src: string; label: string; colour: string }> = {
  7: { src: '/images/badges/streak-7day.webp', label: '7-Day Streak', colour: 'text-amber-400' },
  30: {
    src: '/images/badges/streak-30day.webp',
    label: '30-Day Streak',
    colour: 'text-orange-400',
  },
  90: { src: '/images/badges/streak-90day.webp', label: '90-Day Streak', colour: 'text-red-400' },
};

export function StreakTracker({ currentStreak, longestStreak }: StreakTrackerProps) {
  const isHot = currentStreak >= 7;
  const milestone = getStreakMilestone(currentStreak);

  return (
    <div className="flex items-center gap-4">
      {/* Badge image for milestone */}
      {milestone && (
        <div className="relative h-12 w-12 flex-shrink-0">
          <Image
            src={STREAK_BADGES[milestone].src}
            alt={STREAK_BADGES[milestone].label}
            fill
            className="object-contain drop-shadow-[0_0_8px_rgba(249,115,22,0.5)]"
            sizes="48px"
          />
        </div>
      )}

      <div className="flex items-center gap-1.5">
        <span
          className={`text-2xl transition-all ${isHot ? 'drop-shadow-[0_0_8px_#f97316]' : 'opacity-40'}`}
          aria-label="streak flame"
        >
          🔥
        </span>
        <div className="flex flex-col">
          <span className="font-mono text-xl leading-none font-bold text-white">
            {currentStreak}
          </span>
          <span className="text-xs text-white/40">day streak</span>
        </div>
      </div>

      {longestStreak > 0 && (
        <div className="flex flex-col border-l border-white/10 pl-4">
          <span className="font-mono text-sm leading-none text-white/60">{longestStreak}</span>
          <span className="text-xs text-white/30">best streak</span>
        </div>
      )}

      {milestone && (
        <span
          className={`rounded-sm bg-amber-950 px-2 py-0.5 font-mono text-xs ${STREAK_BADGES[milestone].colour}`}
        >
          {STREAK_BADGES[milestone].label}
        </span>
      )}
    </div>
  );
}
