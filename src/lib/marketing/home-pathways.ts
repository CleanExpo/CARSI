import type { LucideIcon } from 'lucide-react';
import { Compass, Sparkles, Ticket } from 'lucide-react';

import { ccwRoadshowPath } from '@/lib/marketing/ccw-roadshow';
import { startSmartBasePath } from '@/lib/marketing/start-smart';

export type HomePathwayItem = {
  href: string;
  label: string;
  title: string;
  detail: string;
  cta: string;
  icon: LucideIcon;
  accentClass: string;
  borderHoverClass: string;
};

export const homePathwayItems: HomePathwayItem[] = [
  {
    href: startSmartBasePath,
    label: 'Start Smart',
    title: 'Start a carpet cleaning business',
    detail: '8 sub-pillars — equipment, chemistry, quoting and trust',
    cta: 'Explore pathway',
    icon: Compass,
    accentClass: 'text-[#9a4a00]',
    borderHoverClass: 'hover:border-[#ed9d24]/40',
  },
  {
    href: `${ccwRoadshowPath}#booking`,
    label: 'Book Growth Days',
    title: 'Melbourne 22–23 Jul · Sydney 30–31 Jul',
    detail: 'Free entry for CCW customers · register for your check-in token',
    cta: 'Book your seat',
    icon: Ticket,
    accentClass: 'text-emerald-700',
    borderHoverClass: 'hover:border-emerald-400/45',
  },
  {
    href: ccwRoadshowPath,
    label: 'Roadshow program',
    title: 'CARSI × CCW Business Growth Days',
    detail: 'Why attend, who it is for, venues and daily focus',
    cta: 'View program',
    icon: Sparkles,
    accentClass: 'text-[#146fc2]',
    borderHoverClass: 'hover:border-[#2490ed]/45',
  },
];

export const ccwWorkshopHref = '/ccw-training';
