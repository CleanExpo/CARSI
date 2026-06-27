'use client';

import { cn } from '@/lib/utils';

type Props = {
  percent: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
  sublabel?: string;
  className?: string;
};

export function OnboardingProgressRing({
  percent,
  size = 120,
  strokeWidth = 10,
  label,
  sublabel,
  className,
}: Props) {
  const clamped = Math.min(100, Math.max(0, percent));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div className={cn('relative inline-flex flex-col items-center', className)}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-slate-100"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="url(#onboardingProgressGrad)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-700 ease-out"
        />
        <defs>
          <linearGradient id="onboardingProgressGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#2490ed" />
            <stop offset="100%" stopColor="#146fc2" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-2xl font-bold tabular-nums text-slate-900">{clamped}%</span>
        {label ? <span className="mt-0.5 text-[10px] font-medium text-slate-500">{label}</span> : null}
      </div>
      {sublabel ? (
        <p className="mt-3 max-w-[10rem] text-center text-xs leading-snug text-slate-500">{sublabel}</p>
      ) : null}
    </div>
  );
}
