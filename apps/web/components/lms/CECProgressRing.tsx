'use client';

import { AcronymTooltip } from '@/components/ui/AcronymTooltip';

interface CECProgressRingProps {
  cecEarned: number;
  cecRequired?: number; // default: 8 (IICRC standard 3-year cycle)
  discipline?: string;
}

export function CECProgressRing({ cecEarned, cecRequired = 8, discipline }: CECProgressRingProps) {
  const radius = 40;
  const stroke = 6;
  const normalised = Math.min(cecEarned / cecRequired, 1);
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - normalised);
  const percentage = Math.round(normalised * 100);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative inline-flex items-center justify-center">
        <svg width={100} height={100} className="-rotate-90">
          {/* Background track */}
          <circle
            cx={50}
            cy={50}
            r={radius}
            stroke="rgba(255,255,255,0.08)"
            strokeWidth={stroke}
            fill="none"
          />
          {/* Progress arc */}
          <circle
            cx={50}
            cy={50}
            r={radius}
            stroke={normalised >= 1 ? '#00FF88' : '#00F5FF'}
            strokeWidth={stroke}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            strokeLinecap="butt"
            className="transition-all duration-700"
          />
        </svg>
        <div className="absolute flex flex-col items-center">
          <span className="font-mono text-xl leading-none font-bold text-white">{cecEarned}</span>
          <span className="text-xs leading-none text-white/40">/{cecRequired}</span>
          <span className="mt-0.5 text-[10px] leading-none text-white/30">
            <AcronymTooltip term="CEC">CECs</AcronymTooltip>
          </span>
        </div>
      </div>

      <div className="flex flex-col items-center gap-0.5">
        {discipline && <span className="font-mono text-xs text-cyan-400">{discipline}</span>}
        <span className="text-xs text-white/40">{percentage}% of 3-year cycle</span>
        {normalised >= 1 && (
          <span className="font-mono text-xs text-emerald-400">Renewal requirement met</span>
        )}
      </div>
    </div>
  );
}
