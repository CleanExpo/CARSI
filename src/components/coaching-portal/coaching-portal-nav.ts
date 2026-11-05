import type { LucideIcon } from 'lucide-react';
import {
  CircleDollarSign,
  ClipboardList,
  Compass,
  Home,
  Library,
  LineChart,
  Megaphone,
  Sparkles,
  Video,
} from 'lucide-react';

import { coachingPortalPath } from '@/lib/coaching-portal/coaching-portal-paths';
import type { CoachingPortalFeatures } from '@/lib/coaching-portal/types';

export type CoachingPortalNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Shown only when this feature is on. */
  feature?: keyof CoachingPortalFeatures;
};

export const COACHING_PORTAL_NAV_MAIN: CoachingPortalNavItem[] = [
  { href: coachingPortalPath(), label: 'Home', icon: Home },
  { href: coachingPortalPath('/plan'), label: 'My Plan', icon: Compass },
  { href: coachingPortalPath('/actions'), label: 'Actions', icon: ClipboardList },
  {
    href: coachingPortalPath('/progress'),
    label: 'Progress',
    icon: LineChart,
    feature: 'accountability',
  },
  { href: coachingPortalPath('/sessions'), label: 'Sessions', icon: Video },
  { href: coachingPortalPath('/marketing'), label: 'Marketing pack', icon: Megaphone },
  { href: coachingPortalPath('/resources'), label: 'Resources', icon: Library },
  { href: coachingPortalPath('/billing'), label: 'Billing', icon: CircleDollarSign },
  { href: coachingPortalPath('/services'), label: 'Growth services', icon: Sparkles },
];

/** The sidebar items for this member: feature-flagged items only when their flag is on. */
export function coachingPortalNavItems(features: CoachingPortalFeatures): CoachingPortalNavItem[] {
  return COACHING_PORTAL_NAV_MAIN.filter((item) => !item.feature || features[item.feature]);
}
