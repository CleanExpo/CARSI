import type { LucideIcon } from 'lucide-react';
import { BookOpen, Compass, GraduationCap, Ticket, Users } from 'lucide-react';

import { authorityPath } from '@/lib/marketing/authority';
import { businessCoachingPath } from '@/lib/marketing/business-coaching';
import { ccwRoadshowPath } from '@/lib/marketing/ccw-roadshow';
import { startSmartBasePath } from '@/lib/marketing/start-smart';

import { carsiCoachingMonthlyPath, carsiCoachingWorkshopPath } from '@/lib/marketing/carsi-coaching-monthly';

export const ccwWorkshopPath = carsiCoachingWorkshopPath;

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
    href: carsiCoachingMonthlyPath,
    label: 'Business Coaching',
    title: 'CARSI Business Coaching',
    detail: '$495/month — LMS roadmap, AI, and monthly owner sessions with Phill',
    icon: Users,
  },
  {
    href: businessCoachingPath,
    label: 'Owner Circle',
    title: 'Monthly meetup',
    detail: '$22/seat after-hours group sessions for small business owners',
    icon: Users,
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
