import type { LucideIcon } from 'lucide-react';
import { BookOpen, Compass, GraduationCap, Ticket } from 'lucide-react';

import { authorityPath } from '@/lib/marketing/authority';
import { ccwRoadshowPath } from '@/lib/marketing/ccw-roadshow';
import { startSmartBasePath } from '@/lib/marketing/start-smart';

export const ccwWorkshopPath = '/ccw-training';

export type MarketingGrowthLink = {
  href: string;
  label: string;
  title: string;
  detail: string;
  icon: LucideIcon;
};

/** Cross-links between premium marketing / growth pages. */
export const marketingGrowthLinks: MarketingGrowthLink[] = [
  {
    href: startSmartBasePath,
    label: 'Start Smart',
    title: 'Start a carpet cleaning business',
    detail: 'Equipment, chemistry, quoting and trust before you spend',
    icon: Compass,
  },
  {
    href: ccwRoadshowPath,
    label: 'CCW Roadshow',
    title: 'Business Growth Days',
    detail: 'Melbourne & Sydney — practical in-person growth with CCW',
    icon: Ticket,
  },
  {
    href: ccwWorkshopPath,
    label: 'CCW Workshop',
    title: '2-Day Carpet Cleaning Workshop',
    detail: 'Hands-on fibre, chemistry, upholstery and business modules',
    icon: GraduationCap,
  },
  {
    href: authorityPath,
    label: 'Authority Hub',
    title: 'Research & citations',
    detail: 'Evidence, community contributions and AI-ready assets',
    icon: BookOpen,
  },
];
