'use client';

import Image from 'next/image';
import { AcronymTooltip } from '@/components/ui/AcronymTooltip';

interface CECProgressRingProps {
  cecEarned: number;
  cecRequired?: number;
  discipline?: string;
  totalCecLifetime?: number;
  /** Shown under the ring as "{percentage}% {cycleLabel}" — default references the 3-year cycle. */
  cycleLabel?: string;
}

type CECMilestone = 10 | 25 | 50 | 100;

function getCECMilestone(total: number): CECMilestone | null {
  if (total >= 100) return 100;
  if (total >= 50) return 50;
  if (total >= 25) return 25;
  if (total >= 10) return 10;
  return null;
}

const CEC_BADGES: Record<CECMilestone, { src: string; label: string }> = {
  10: { src: '/images/badges/cec-10.webp', label: '10 CECs Earned' },
  25: { src: '/images/badges/cec-25.webp', label: '25 CECs Earned' },
  50: { src: '/images/badges/cec-50.webp', label: '50 CECs Earned' },
  100: { src: '/images/badges/cec-100.webp', label: '100 CECs Earned' },
};

const DISCIPLINE_BADGES: Record<string, string> = {
  WRT: '/images/badges/discipline-wrt.webp',
  ASD: '/images/badges/discipline-asd.webp',
  AMRT: '/images/badges/discipline-amrt.webp',
  FSRT: '/images/badges/discipline-fsrt.webp',
  OCT: '/images/badges/discipline-oct.webp',
  CCT: '/images/badges/discipline-cct.webp',
  RRT: '/images/badges/discipline-rrt.webp',
};

export function CECProgressRing({
  cecEarned,
  cecRequired = 8,
  discipline,
  totalCecLifetime,
  cycleLabel = 'of 3-year cycle',
}: CECProgressRingProps) {
  const radius = 40;
  const stroke = 6;
  const normalised = Math.min(cecEarned / cecRequired, 1);
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - normalised);
  const percentage = Math.round(normalised * 100);

  const milestone = totalCecLifetime ? getCECMilestone(totalCecLifetime) : null;
  const disciplineBadge = discipline ? DISCIPLINE_BADGES[discipline.toUpperCase()] : null;

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Milestone and discipline badges */}
      <div className="flex items-center gap-2">
        {disciplineBadge && (
          <div className="relative h-10 w-10">
            <Image
              src={disciplineBadge}
              alt={`${discipline} Discipline`}
              fill
              className="object-contain"
              sizes="40px"
            />
          </div>
        )}
        {milestone && (
          <div className="relative h-10 w-10">
            <Image
              src={CEC_BADGES[milestone].src}
              alt={CEC_BADGES[milestone].label}
              fill
              className="object-contain"
              sizes="40px"
            />
          </div>
        )}
      </div>

      <div className="relative inline-flex items-center justify-center">
        <svg width={100} height={100} className="-rotate-90">
          {/* Background track */}
          <circle
            cx={50}
            cy={50}
            r={radius}
            stroke="rgba(15,23,42,0.1)"
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
          <span className="font-mono text-xl leading-none font-bold text-slate-900">{cecEarned}</span>
          <span className="text-xs leading-none text-slate-500">/{cecRequired}</span>
          <span className="mt-0.5 text-[10px] leading-none text-slate-600">
            <AcronymTooltip term="CEC">CECs</AcronymTooltip>
          </span>
        </div>
      </div>

      <div className="flex flex-col items-center gap-0.5">
        {discipline && <span className="font-mono text-xs text-[#146fc2]">{discipline}</span>}
        <span className="text-xs text-slate-500">
          {percentage}% {cycleLabel}
        </span>
        {normalised >= 1 && (
          <span className="font-mono text-xs text-emerald-600">Renewal requirement met</span>
        )}
        {milestone && (
          <span className="mt-1 font-mono text-xs text-amber-400">
            {CEC_BADGES[milestone].label}
          </span>
        )}
      </div>
    </div>
  );
}
