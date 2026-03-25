'use client';

import * as React from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export const ACRONYMS: Record<string, string> = {
  IICRC: 'Institute of Inspection, Cleaning and Restoration Certification',
  CEC: 'Continuing Education Credit',
  WRT: 'Water Damage Restoration Technician',
  ASD: 'Applied Structural Drying',
  AMRT: 'Applied Microbial Remediation Technician',
  FSRT: 'Fire and Smoke Restoration Technician',
  OCT: 'Odor Control Technician',
  CCT: 'Commercial Carpet Technician',
  TCST: 'Trauma and Crime Scene Technician',
  HST: 'Health and Safety Technician',
  IEP: 'Indoor Environmentalist Professional',
  RTO: 'Registered Training Organisation',
  TAFE: 'Technical and Further Education',
  CPP: 'Certificate in Property Services (Cleaning Operations)',
  CRT: 'Carpet Repair and Reinstallation Technician',
  RPL: 'Recognition of Prior Learning',
  LMS: 'Learning Management System',
};

interface AcronymTooltipProps {
  term: string;
  children?: React.ReactNode;
}

export function AcronymTooltip({ term, children }: AcronymTooltipProps) {
  const expansion = ACRONYMS[term];
  if (!expansion) {
    return <>{children ?? term}</>;
  }

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className="cursor-help border-b border-dotted border-current"
            aria-label={`${term}: ${expansion}`}
            tabIndex={0}
          >
            {children ?? term}
          </span>
        </TooltipTrigger>
        <TooltipContent
          className="max-w-[280px] rounded-sm border border-white/[0.08] bg-zinc-900/95 px-3 py-2 text-xs leading-relaxed text-white/80 shadow-lg backdrop-blur-md"
          sideOffset={6}
        >
          <span className="font-mono font-bold text-white">{term}</span>
          <span className="mx-1 text-white/30">&mdash;</span>
          {expansion}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Wraps known acronyms in a plain text string with AcronymTooltip components.
 * Only matches whole-word, uppercase acronyms from the dictionary.
 */
export function wrapAcronyms(text: string): React.ReactNode {
  const keys = Object.keys(ACRONYMS).sort((a, b) => b.length - a.length);
  const pattern = new RegExp(`\\b(${keys.join('|')})\\b`, 'g');

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const acronym = match[1];
    parts.push(<AcronymTooltip key={`${acronym}-${match.index}`} term={acronym} />);
    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length === 1 ? parts[0] : <>{parts}</>;
}
